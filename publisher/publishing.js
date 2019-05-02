const api = require('./customApiRequest');
const async = require('async');
const request = require('request');
const cron = require('node-cron');
var tr = require('textrank');
const TextCleaner = require('text-cleaner');




//step 1: get all jobs with statuus "done_scraping";
var getJobs = function(cb) {
	const query = {filter: {where: {status: "done_scraping"}}};
	api("GET", "/indeed-jobs", {}, query, function(err, response, data) {
	  if (err) return cb(err);
	  if (JSON.parse(data).length < 1) {
	  	return cb("No new jobs to publish");
	  }
	  return cb(null, JSON.parse(data));
	});
}


var checkifPublish = function(job, cb) {       //will be used to check if job is worthy of publishing
	//check one: if no link or title, or date or location not good
	if (!job.title || !job.link || !job.date_post || !job.location) {
		return cb("Can't publish post missing one or more things", job);
	}

	if (!job.text) {
		console.log("ss")
		return cb("Can't publish post missing one or more things", job);
	}

	return cb(null, job);
}


var cleanJob = function(job, cb) {

	let publishJob = job; 

	//check slary
	if (!job.salary) {
		publishJob.salary = "Not specficed";
	} 
	if (job.summary.length < 10) {
		//create summary
		var settings = {
		  extractAmount: 10,
		}
		var textRank = new tr.TextRank(job.text, settings);
		let summary = textRank.summarizedArticle
		summary = summary.substring(0,300);   // summmary 300 characters
		publishJob.summary = summary + "...";
	} else {
		summary = job.summary.substring(0,300);
		publishJob.summary = summary + "...";
	}

	return cb(null, publishJob);
}


var formatJob = function(job, cb) {

	//first remove all leading and end puncation in the summary.
	var cleanSummary = job.summary.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "");  //removes it all.
	cleanSummary = cleanSummary.replace(/\n$/, '');
	cleanSummary = TextCleaner(cleanSummary).stripHtml().trim().valueOf() + "..."

  var cleanTitle = TextCleaner(job.title).stripHtml().trim().valueOf();
  cleanTitle = cleanTitle.replace(/\n$/, '');   //remove new line charaacters.

  var cleanSalary = TextCleaner(job.salary).stripHtml().trim().valueOf();
  cleanSalary = cleanSalary.replace(/\n$/, '');   //remove new line charaacters.
  var cleanText = TextCleaner(job.text).stripHtml().trim().valueOf();

  var cleanLocation = TextCleaner(job.location).stripHtml().trim().valueOf();

  var cleanCompany = TextCleaner(job.company).stripHtml().trim().valueOf();

  job.summary = cleanSummary;
  job.salary = cleanSalary;
  job.title = cleanTitle;
  job.location = cleanLocation;
  job.text = cleanText;
  job.company = cleanCompany;
  return cb(null, job)
}



var uploadtoDB = function(jobListing, cb) {
	
	let jobPost = {
		"link": jobListing.link,
		"date_post": jobListing.date_post,
		"title": jobListing.title,
		"company": jobListing.company,
		"location": jobListing.location,
		"summary": jobListing.summary,
		"salary": jobListing.salary,
		"text": jobListing.text
	}
  api("POST", "/job-posts", jobPost, {}, function(err, response, data) {
    if (err) return cb(err);
    console.log("SAVED NEW JOB WITH ID " + data.id)
    return cb(null, data, jobListing);
  });

} 


var updateStatus = function(status, scrapedJob, cb) {
	let patchData = {
		"status": status
	}

	api("PATCH", "/indeed-jobs/" + scrapedJob.id, patchData, {}, function(err, response, data) {
		return cb(err, data);
	});







}

var publishOneJob = function(job, cb) {      //should return either error, or job that has been published. 
	async.waterfall ([
		//step 1: check if valid jobs
		function(cb1) {
			checkifPublish(job, function(err, job) {
				if (err)  {
					return cb1(err, job);
				}
				return cb1(null, job);
			});
		},

		//step 2: clean up text
		function(job, cb2) {
			cleanJob(job, function(err, cleanJob) {
				return cb2(err, cleanJob);
			});
		},


		//step 3: fix formatting
		function(job, cb3) {
			formatJob(job, function(err, job) {
				return cb3(err, job);
			});
		},

		//step 4: upload to db.
		function(job, cb4) {
			uploadtoDB(job, function(err, jobPost, scrapedJob) {
				if (err) return cb(err);
				return cb4(null, scrapedJob)
			});
		}
	], function(err, scrapedJob) {
		let status = null;
		if (err) {
			status = "error_publising";
		} else {
			status = "finished_published";
		}
		updateStatus(status, scrapedJob, function(err, data) {
			return cb(err, data);
		});
	});
}




var publishing = function(cb) {
	getJobs(function(err, jobs) {
		if (err) return cb(err);
		async.eachSeries(jobs, function(job, loopcb) {
			publishOneJob(job, function(err, data) {
				loopcb();
			});
		}, function(err) {
			console.log("DONE publishing service");
			return cb();
		});
	});
}



var publisher = {
  run: publishing(function(err, data) {}),
  schedule: function(time) {
    console.log("publishing service Starting");
    cron.schedule(time, () => {
      publishing(function(err, data) {})
    })
  }
}



module.exports = publisher;