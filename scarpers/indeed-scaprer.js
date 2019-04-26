const request = require('request');
const api = require('./customApiRequest');
const async = require("async");
const extractor = require('unfluff');
const cheerio = require('cheerio');
const cron = require('node-cron');
const IndeedService = require('indeed-scraper');

var getLocations = function(cb) {
  query = {
    filter: {
      where: {
        and: [{
          scraper: 'indeed'
        }, {
          enabled: true
        }]
      }
    }
  }
  api("GET", "/jobLocations", {}, query, function(err, response, data) {
    jsonData = JSON.parse(data);
    if (jsonData.length <= 0) {
      return cb("NOTHING FOUND IN LOCATIONS TABLE FOR INDEED");
    }
    if (err) return cb(err);
    return cb(null, jsonData);
  });
}


var checkifExists = function(jobListing, cb) {
  const query = {
    filter: {
      where: {and: [  
      {title: jobListing.title},
      {company:jobListing.company}
    ]}
    }
  }

  api("GET", "/indeed-jobs", {}, query, function(err, response, data) {
    let jsonData = JSON.parse(data);
    if (err) return cb(err);
    if (jsonData.length > 0) return cb("JOB ALREADY IN DATABASE:", jsonData);
    return cb(null, jobListing);
  });
}



var getJobs = function(options, cb) {
  IndeedService.query(options)
    .then(function(data) {
      return cb(null, data);
    })
    .catch(function(err) {
      console.log('Error: ' + err);
      return cb(err);
    });


}



var checkStudent = function(jobListing, cb) {
  let title = jobListing.title;
  let data = {
    "title": title
  }

  let textAnalyser = " http://127.0.0.1:5000/predict" //remove hardcoding later down the road. 
  request({
    url: textAnalyser,
    method: 'POST',
    json: data
  }, function(error, response, body) {
    if (body.predictions == '0') {
      console.log("NOT A Student JOBS" + title);
      return cb("NOT A STUDENT JOB" + jobListing.url);
    } else {
      console.log("GOOD TITLE" + title);
      // console.log(jobListing);
      return cb(null, jobListing);
    }


  });
}




var getmoreInfo = function(jobListing, cb) {
  let url = jobListing.url;
  request(url, function(err, response, body) {
    if (err || response.statusCode != 200) {
      return cb("ERROR getting indeed data");
    }
    let $ = cheerio.load(body);
    data = extractor(body);
    text = data.text;
    return cb(null, jobListing, text);
  })
}



var uploadtoDB = function(jobListing, text, cb) {
  let date = null;
  if (jobListing.postDate == "Just posted" || jobListing.postDate == "Today" || jobListing.postDate.includes("hours")) {
    date = new Date()
    date = date.toString();
  } else if (jobListing.postDate == "30+ days ago" || jobListing.postDate.includes("months")) {
    console.log("PROBLEM" + jobListing.postDate);
    return cb("ERROR: JOB POSTED TO LONG AGO!!");
  } else {
      let day = jobListing.postDate.split(" ")[0];
      let d = new Date();
      d.setDate(d.getDate() - day);
      date = d;
      date = date.toString();
  }
  let jobListingObject = {
    "link": jobListing.url,
    "date_post": date,
    "title": jobListing.title,
    "company": jobListing.company,
    "isSponsored": false,
    "location": jobListing.location,
    "summary": jobListing.summary,
    "salary": jobListing.salary,
    "text": text,
    "jobType": null,
    "status": "done_scraping"
  }

  api("POST", "/indeed-jobs", jobListingObject, {}, function(err, response, data) {
    if (err) return cb(err);
    console.log("SAVED NEW JOB WITH ID " + data.id)
    return cb(null, data);
  });

}




var oneJob = function(item, cb) {
  async.waterfall([

      //step 1: CHECK IF EXISTS
      function(cb2) {
        checkifExists(item, function(err, jobListing) {
          if (err) return cb2(err);
          return cb2(err, jobListing);
        })
      },

      // //step 2: Check if job is a student job
      // function(jobListing, cb2) {
      // 	checkStudent(jobListing, function(err, jobListing) {
      // 		if (err) return cb2(err);
      // 		return cb2(err,  jobListing);
      // 	})
      // },

      //step 3:Get More info about job aka full description
      function(jobListing, cb2) {
        getmoreInfo(jobListing, function(err, jobListing, text) {
          if (err) return cb2(err);
          return cb2(err, jobListing, text);
        })
      },

      //step 4: Upload to DB
      function(jobListing, text, cb2) {
        uploadtoDB(jobListing, text, function(err, data) {
          return cb2(err, data);
        });
      }

    ],
    function(err, data) {
      if (err) return cb(err);
      return cb(err, data);
    });
}


var runScarper = function(cb) {
  getLocations(function(err, data) {
    if (err) return cb(err);
    //add error handling
    async.eachSeries(data, function(item, loopcallBack) {
      const options = {
        host: 'www.indeed.ca',
        query: item.keyword,
        city: item.location,
        radius: '25',
        // level: 'entry_level',
        // jobType: 'part time',
        maxAge: '7',
        sort: 'date',
        limit: '100'
      }
      getJobs(options, function(err, jobs) {
        console.log(err);
        if (err) return loopcallBack();
        async.eachSeries(jobs, function(item2, cb2) {
          oneJob(item2, function(err, data) {
            if (err) console.log(err);
            return cb2();
          })
        }, function(err) {
            return loopcallBack();
          });
      })
    }, function(err) {
      return cb("FINISHED");
    })
  })
}






var jobExtractor  = {
  run: runScarper(function(err) {
    console.log(err);
  }),
  schedule: function(time) {
    console.log("JOB SCRAPER STARTING: INDEED"); 
    cron.schedule(time, () => {
      console.log("STARTING INDEED");
      runScarper(function(err) {
        console.log(err);
      })

    })
  }
}



module.exports = jobExtractor;