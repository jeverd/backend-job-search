const request = require('request');
const api = require('./customApiRequest');
const async = require("async");
const cheerio = require("cheerio");
const cron = require('node-cron');






var getLocations = function(cb) {
  query = {
    filter: {
      where: {
        and: [{
          scraper: 'post2jobs'
        }, {
          enabled: true
        }]
      }
    }
  }
  api("GET", "/jobLocations", {}, query, function(err, response, data) {
    jsonData = JSON.parse(data);
    if (jsonData.length <= 0) {
      return cb("NOTHING FOUND IN LOCATIONS TABLE FOR POST2JOBS");
    }
    if (err) return cb(err);
    return cb(null, jsonData);
  });
}

var getJobListing = function(url, cb) {     //we need to get url precontrustered, and should send it to here.
	request(url, function(error, response, html) {
		if (error) return error;
		let $ = cheerio.load(html);
		let jobsPosting = $('body > div.page-wrap > div.stdContentLayout.innercontent > div:nth-child(3)').children();
		return cb(null, jobsPosting);
	});
}




var parseJobs = function(item, cb) {    //NOTE: only take one job listing not mutliple.
	if (!item.children[1]) { 
		console.log("NO JOBS HERE");
		return cb("NO JOBS");
	}
 
	let link = item.children[1].children[0].attribs.href
	let title = item.children[1].children[0].children[0].data
	let company = item.children[3].children[1].children[0].data
	let summary = item.children[3].children[7].next.data
	let location = item.children[3].children[3].children[0].data

	let jobPosting = {
		"link": link,
		"date_post": null,
		"title": title,
		"company": company,
		"isSponsored": false,
		"location":location,
		"summary": null,
		"salary": null,
    "status": "done_scraping"		
	}


	return cb(null, jobPosting);

}


var checkifExists = function(jobListing, cb) {
	let url = "https://www.postjobfree.com" + jobListing.link;
	jobListing.link  = url;
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
    if (jsonData.length > 0)  return cb("JOB ALREADY IN DATABASE:", jsonData);
    return cb(null, jobListing);
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
      return cb("NOT A STUDENT JOB" + jobListing.url);
    } else {
      // console.log(jobListing);
      return cb(null, jobListing);
    }


  });
}


var getmoreInfo = function(jobListing, cb) {
  let url = jobListing.link;
  request(url, function(err, response, body) {
    if (err || response.statusCode != 200) {
      return cb("ERROR getting indeed data");
    }
    let $ = cheerio.load(body);
    // let description = $('.normalText').children();
    let description = $('p');
    let date = $('#PostedDate').text()
    let d = new Date(date);
    date = d.toString();
    jobListing.date_post = date;
    let text = '';
    async.eachSeries(description, function(item, loopcb) {
    	if (item.children.length < 1) {
    		loopcb();
    	} else {
		text = text + item.children[0].data + " "; 
    	loopcb();
    }

    }, function(err) {
    	jobListing.text = text;
      if(!$("#ApplyNowTopDiv").children()[0] == undefined) {
        jobListing.link = "https://www.postjobfree.com" + $("#ApplyNowTopDiv").children()[0].attribs.href;
      }
    	return cb(null, jobListing);
    })
   })
}


var uploadtoDB = function(jobPosting, cb) {   //this a properly formatted json object..
	api("POST", "/indeed-jobs", jobPosting, {}, function(err, response, data) {   		//note switch to different table.
		if (err) return cb(err);
		console.log("SAVED NEW JOB WITH ID " + data.id)
		return cb(null, data);
	});

}



var oneJob = function(job, cb) {
	async.waterfall([

		//step 1: Parse the job listing
		function(cb2) {
			parseJobs(job, function(err, jobPosting) {
				if (err) return cb2(err);
				return cb2(err, jobPosting);
			});
		},

		//step 2: check if exists in database
		function(jobPosting, cb2) {
			checkifExists(jobPosting, function(err, jobPosting) {
				if (err) return cb2(err);
				return cb2(err, jobPosting);
			})
		},

		function(jobListing, cb2) {
		  getmoreInfo(jobListing, function(err, jobListing, text) {
		    if (err) return cb2(err);
		    return cb2(err, jobListing);
		  })
		},
		// //step 3: use analyser to filter out bad jobs.
		function(jobPosting, cb2) {
			checkStudent(jobPosting, function(err, jobPosting) {
				if (err) return cb2(err);
				return cb2(err, jobPosting);
			})
		},


		//step 4: upload to db
		function(jobPosting, cb2) {
			uploadtoDB(jobPosting, function(err, data) {
				return cb2(err, data);
			})
		}
	], 

	function(err, data) {
		return cb(err, data);
	});
}




var runScarper = function(cb) {
  getLocations(function(err, data) {
    if (err) return cb(err);
    async.eachSeries(data, function(item, loopcallBack) {
      let url = "https://www.postjobfree.com/jobs?q=" + item.keyword + "&n=&t=&c=&l=" + item.location + "%2C+ON%2C+Canada&radius=25&r=100";
      getJobListing(url, function(err, jobs) {
        if (err) console.log(err);
        if (err) return loopcallBack();
        async.eachSeries(jobs, function(item2, cb2) {
          oneJob(item2, function(err, data) {
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




