'use strict';
const async  = require('async');
var app = require('../../server/server');


module.exports = function(Shortlist) {
	Shortlist.remoteMethod('userID', {
	  accepts: [
	    { arg: 'q', type: 'string', required: false},
	    { arg: 'options', type: 'object', 'http': 'optionsFromRequest' }

	  ],
	  returns: { arg: 'result', type: 'Object', root: true },
	  http: { path: '/userID', verb: 'get' }
	});
	
	Shortlist.remoteMethod('addShortList', {
		 accepts: [
	    { arg: 'shortlist', type: 'object', http: { source: 'body' } },
	    { arg: 'options', type: 'object', 'http': 'optionsFromRequest' }

	  ],
	  returns: { arg: 'result', type: 'Object', root: true },
	  http: { path: '/addShortList', verb: 'post' }
	});

	Shortlist.remoteMethod('deleteShortList', {
		accepts: [
	    { arg: 'shortlist', type: 'object', http: { source: 'body' } },
	    { arg: 'options', type: 'object', 'http': 'optionsFromRequest' }

	  ],
	  returns: { arg: 'result', type: 'Object', root: true },
	  http: { path: '/deleteShortList', verb: 'delete' }

	});



	Shortlist.deleteShortList =  function(shortlist, options, cb) {
		
		Shortlist.destroyAll({userID:shortlist.userID,jobID:shortlist.jobID}, function(err, data) {
			if (err) return cb(err);
			if (!data)  return cb ("NO DATA");
			return cb(null, {
					'Status': "Success"
				})
		})

	}


	Shortlist.addShortList = function(shortlist, options, cb) {
		//this endpoint used to prevent duplicate enteries added into shortlist table. 
		//shortlist object, contains userid, and, jobID

		let searchObject = {
			where: {}
		}

		searchObject.where.and = [{
			userID: shortlist.userID,
		},
		{
			jobID: shortlist.jobID
		}]

		Shortlist.find(searchObject, function(err, data) {
			if (data.length > 0) {
				//means duplicate
				var error  = new Error("Shortlist Job already exist for userid: "  + shortlist.userID);
				error.status = 429;  //means duplicate entry
				return cb(null, {
					error: error
				});
			} else {
				//means good to go, create new shortlist
				Shortlist.create(shortlist, function(err, data1) {
					if (err) return cb(err);
					return cb(null,  {
							"Status":"Sucess"
					})
				})
			}
		})

	}

	Shortlist.userID = function(q, options, cb) {
		let searchObject = {
			where:{},
		}

		searchObject.where = {
			userID: q
		}

		Shortlist.find(searchObject, function(err, jobs) {
			if (err) {
				return cb(err);
			} else {
				sortIDs(jobs, function(jobsSorted) {
					var jobsIDArray  = [];
					async.eachSeries(jobs, function(item, loopCallback) {
						jobsIDArray.push(item.jobID);
						return loopCallback();
					},
					function(err) {
						if (err) return cb(null);
						return cb(null,  {
						jobsforUserID: jobsIDArray
						})
					});
				})				
			}
		})




	}




};




var sortIDs = function(jobs, cb) {			//this function used to sort shortlist array descending id of shortlist
	jobs.sort(function(a, b) { 
    return -(a.id - b.id)
	});

	return cb(jobs);


}