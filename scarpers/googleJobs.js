const pptrFirefox = require('puppeteer-firefox');
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
          scraper: 'google'
        }, {
          enabled: true
        }]
      }
    }
  }
  api("GET", "/jobLocations", {}, query, function(err, response, data) {
    jsonData = JSON.parse(data);
    if (jsonData.length <= 0) {
      return cb("NOTHING FOUND IN LOCATIONS TABLE FOR GOOGLE");
    }
    if (err) return cb(err);
    return cb(null, jsonData);
  });
}


//new  async function... 
var getJobs = async (url) => {
  const browser = await pptrFirefox.launch();
  const page = await browser.newPage();
  await page.goto(url);
  await page.screenshot({path: 'example.png'});
  let bodyHTML = await page.evaluate(() => document.body.innerHTML);
  let $  = await cheerio.load(bodyHTML)
  let jobs = await $('.pE8vnd.GZjjfc');  // only gets first 10 jobs
  await browser.close();
  return jobs
};




var parseJobs = function(job, cb) {    //NOTE: only take one job listing not mutliple.
	let title = job.children[0].children[0].children[0].children[0].children[0].data;
  let company = job.children[0].children[0].children[1].children[1].children[0].children[0].data;
  let location = job.children[0].children[0].children[1].children[1].children[1].children[0].data;
  let description = job.children[5].children[0].children[0].children[0].data
  let date = job.children[4].children[0].children[1]
  let link = job.children[2].children[0].children[0].children

  if (!link) {
  	link = job.children[2].children[0].children[0].parent.parent.children[2].children[0].children[0].children[0].children[1].attribs.href
  } else {
  	link = job.children[2].children[0].children[0].children[0].children[0].children[0].attribs.href
  }

  if (!date) {
  	date = job.children[4].children[0].next.children[2].children[0].data
  } else {
  	date = date.children[0].data
  }

  if (!description) {
  	description = job.children[5].children[0].children[0].children[0].children[0].data;
  }
  if (date == "Just posted" || date == "Today" || date.includes("hours")) {
    date = new Date()
    date = date.toString();
  } else if (date == "30+ days ago" || date.includes("months") || date.includes("month")) {
    console.log("PROBLEM" + date);
    return cb("ERROR: JOB POSTED TO LONG AGO!!");
  } else {
      let day = date.split(" ")[0];
      let d = new Date();
      d.setDate(d.getDate() - day);
      date = d;
      date = date.toString();
  }

	let jobPosting = {
		"link": link,
		"date_post": date,
		"title": title,
		"company": company,
		"isSponsored": false,
		"location":location,
		"summary": null,
		"salary": null,
    "status": "done_scraping",
    "text": description	
	}

	return cb(null, jobPosting);

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
      console.log("NOT A Student JOBS" + title);
      return cb("NOT A STUDENT JOB" + jobListing.url);
    } else {
      console.log("GOOD TITLE" + title);
      // console.log(jobListing);
      return cb(null, jobListing);
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



var runScarper = function(cb) {
  getLocations(function(err, data) {
    if (err) return cb(err);
    async.eachSeries(data, function(item, loopcallBack) {
      getJobs(item.link).then(jobs => {
        if (err) console.log(err);
        if (err) return loopcallBack();
        async.eachSeries(jobs, function(item2, cb2) {
          oneJob(item2, function(err, data) {
            return cb2();
          })
        }, function(err) {
            console.log("google jobs done: " + item.link);
            return loopcallBack();
          });
      })
    }, function(err) {
      return cb("FINISHED");
    })
  })
}



runScarper(function(err) {
	console.log("check")
})

var jobExtractor  = {
  run: runScarper(function(err) {
  }),
  schedule: function(time) {
    console.log("JOB SCRAPER STARTING: googleJobs"); 
    cron.schedule(time, () => {
      console.log("STARTING post2jobs");
      runScarper(function(err) {
      })

    })
  }
}



module.exports = jobExtractor;
