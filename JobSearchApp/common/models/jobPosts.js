'use strict';
const async = require('async');

module.exports = function(Jobposts) {
	//Create Endpoint with pagnation, taking array of job ids, returning with job data, with the correct job data. 
	Jobposts.remoteMethod('jobsArray', {
		  accepts: [
		    { arg: 'jobsID', type: 'array', http: { source: 'body' } },
		    // { arg: 'page', type:'string', required: true},
		    { arg: 'options', type: 'object', 'http': 'optionsFromRequest' }

		  ],
		  returns: { arg: 'result', type: 'Object', root: true },
		  http: { path: '/jobsArray', verb: 'post' }
		});


		Jobposts.jobsArray = function(jobsID, options, cb) {
			
			//pagniation...
			// let pageValue = parseInt(page, 10);
			// let skipValue = (pageValue - 1) * 15;

			let jobsData = [];
			console.log(jobsID.length);	

			async.eachSeries(jobsID, function(item, loop) {
				let searchObject = {
					where:{}
				}
				searchObject.where = {
					id: item
				}
				Jobposts.find(searchObject, function (err, job) { 
					if (err) {
						return loop()
					}

					if (job.length < 1) {   //used to just send empty array...
						return loop()
					}

					jobsData.push(job);
					return loop()
				})
				}, function(err) {
					if (err) return cb(err);
					return cb(null, {
										jobs:jobsData

									})
				})

			}

};
