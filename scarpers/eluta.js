const request = require('request');
const api = require('./customApiRequest');
const async = require("async");
const extractor = require('unfluff');
const cheerio = require('cheerio');
const cron = require('node-cron');
const parseString = require('xml2js').parseString;




//Fix up extraction of text.

var getQueries = function(cb) {
	query = {
	  filter: {
	    where: {
	      and: [{
	        scraper: 'eluta'
	      }, {
	        enabled: true
	      }]
	    }
	  }
	}
	api("GET", "/jobLocations", {}, query, function(err, response, data) {
	  jsonData = JSON.parse(data);
	  if (jsonData.length <= 0) {
	    return cb("NOTHING FOUND IN LOCATIONS TABLE FOR ELUTA");
	  }
	  if (err) return cb(err);
	  return cb(null, jsonData);
	});
}



var getJobListing = function(url, cb) { //we need to get url precontrustered, and should send it to here.
  request(url, function(error, response, html) {
    if (error) return error;
    parseString(html, function(err, result) {
      if (err) return cb(err);
      return cb(null, result.rss.channel[0].item);
    });
  });
}


var checkifExists = function(jobListing, cb) {
  const query = {
    filter: {
      where: {
        link: jobListing.link[0]
      }
    }
  }
  api("GET", "/indeed-jobs", {}, query, function(err, response, data) {
    let jsonData = JSON.parse(data);
    if (err) return cb(err);
    if (jsonData.length > 0) return cb("JOB ALREADY IN DATABASE:", jsonData);
    return cb(null, jobListing);
  });
}



var checkStudent = function(jobListing, cb) {
  let title = jobListing.title[0];
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





var uploadtoDB = function(jobListing, cb) {
	let description = jobListing.description[0];
	description = description.replace(/<\/?[^>]+(>|$)/g, "");
  let d = new Date(jobListing.pubDate[0]);
  let date = d.toString();
  let jobListingObject = {
    "link": jobListing.link[0],
    "date_post": date,
    "title": jobListing.title,
    "company": jobListing.employer[0],
    "isSponsored": false,
    "location": jobListing.location[0],
    "summary": description,
    "salary": "Not specficed",
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
  getQueries(function(err, data) {
    if (err) return cb(err);
    //add error handling
    async.eachSeries(data, function(item, loopcallBack) {
     let url = "https://www.eluta.ca/opensearch?q=" + item.keyword + "&l=" + item.location + "+ON";
      getJobListing(url, function(err, jobs) {
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
  }),
  schedule: function(time) {
    console.log("JOB SCRAPER STARTING: post2jobs"); 
    cron.schedule(time, () => {
      console.log("STARTING post2jobs");
      runScarper(function(err) {
      })

    })
  }
}






module.exports = jobExtractor;










