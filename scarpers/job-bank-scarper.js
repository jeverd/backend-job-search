const cheerio = require('cheerio');
const request = require('request');
const async = require('async');
const cron = require('node-cron');


const api = require('./customApiRequest');




//add checkifexist in db to prevent duplicaitn  




var getJobListing = function(url, cb) {     //we need to get url precontrustered, and should send it to here.
	request(url, function(error, response, html) {
		if (error) return error;
		let $ = cheerio.load(html);
		let jobsLists = $('#result_block > article');
		return cb(null, jobsLists);
	});
}




var parseJobs = function(item, cb) {    //NOTE: only take one job listing not mutliple.
	let link =  item.children[0].attribs.href
	link = "https://www.jobbank.gc.ca" + link;

	let date = item.children[0].children[3].children[1].children[0].data;

	let company = item.children[0].children[3].children[1].next.next.children[0].data;
	company = company.trim();

	let title = item.children[0].children[1].children[5].children[0].data;
	title = title.trim();

	let location = item.children[0].children[3].children[4].next.children[4].data;
	location = location.trim();

	let salary = item.children[0].children[3].children[7].children[5].children[0].children[0].data;
	let d = new Date(date);
  	date = d.toString();
	let jobPosting = {
		"link": link,
		"date_post": date,
		"title": title,
		"company": company,
		"isSponsored": false,
		"location":location,
		"summary": "Please click to view summary",
		"salary": salary,
		"status": "done_scraping"
	}


	return cb(null, jobPosting);

}

var checkifExists = function(jobListing, cb) {
  const query = {
    filter: {
      where: {
      	and: [{ title: jobListing.title, company: jobListing.company}]
      }
    }
  }
  api("GET", "/indeed-jobs", {}, query, function(err, response, data) {
    let jsonData = JSON.parse(data);
    if (err) return cb(err);
    if (jsonData.length > 0) {  console.log("HERE"); return cb("JOB ALREADY IN DATABASE:", jsonData);}
    return cb(null, jobListing);
  });
}


var checkifStudent  = function(jobPosting, cb) {
	let title =  jobPosting.title;
	let data = {
		"title": title
	}
	let textAnalyser = " http://127.0.0.1:5000/predict"   //remove hardcoding later down the road. 
	request({
	  url: textAnalyser,
	  method: 'POST',
	  json: data
	}, function(error, response, body) {
		if (body.predictions == '0') {
			console.log("NOT A Student JOBS" + title);
			return cb("NOT A STUDENT JOB");
		} else {
			console.log("GOOD TITLE" + title);
			// console.log(jobListing);
			return cb(null, jobPosting);
		}


	});
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

		// //step 3: use analyser to filter out bad jobs.
		// function(jobPosting, cb2) {
		// 	checkifStudent(jobPosting, function(err, jobPosting) {
		// 		if (err) return cb2(err);
		// 		return cb2(err, jobPosting);
		// 	})
		// },


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


var getUrl = function(cb) {
  query = {
    filter: {
      where: {
        and: [{
          scraper: 'job-bank'
        }, {
          enabled: true
        }]
      }
    }
  }
  api("GET", "/jobLocations", {}, query, function(err, response, data) {
    jsonData = JSON.parse(data);
    if (jsonData.length <= 0) {
      return cb("NOTHING FOUND IN LOCATIONS TABLE FOR JOB-BANK");
    }
    if (err) return cb(err);
    return cb(null, jsonData);
  });
}


var runScarper = function(cb) {
  getUrl(function(err, data) {
    if (err) return cb(err);
    async.eachSeries(data, function(item, loopcallBack) {
      getJobListing(item.link, function(err, jobs) {
        if (err) return loopcallBack();
        async.eachSeries(jobs, function(item2, cb2) {
          oneJob(item2, function(err, data) {
            return cb2();
          })
        },function(err) {
            return loopcallBack();
          });
      })
    }, function(err) {
      return cb("FINISHED");
    })
  })
}


runScarper(function(err) {

});



var jobExtractor  = {
  run: runScarper(function(err) {
  }),
  schedule: function(time) {
    console.log("JOB SCRAPER STARTING: job-bank"); 
    cron.schedule(time, () => {
      runScarper(function(err) {
      })

    })
  }
}



module.exports = jobExtractor;



