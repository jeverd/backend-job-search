'use strict'; 

const async = require("async");
const _ = require('lodash');

var app = require('../../server/server');


module.exports = function(Notifications) {

	Notifications.remoteMethod('customCreate', {
	  accepts: [
	    { arg: 'data', type: 'object', http: { source: 'body' } },
	    // { arg: 'page', type:'string', required: true},
	    { arg: 'options', type: 'object', 'http': 'optionsFromRequest' }

	  ],
	  returns: { arg: 'result', type: 'Object', root: true },
	  http: { path: '/customCreate', verb: 'post' }
	});
	Notifications.remoteMethod('createNotification', {
	  accepts: [
	    { arg: 'data', type: 'object', http: { source: 'body' } },
	    // { arg: 'page', type:'string', required: true},
	    { arg: 'options', type: 'object', 'http': 'optionsFromRequest' }

	  ],
	  returns: { arg: 'result', type: 'Object', root: true },
	  http: { path: '/createNotification', verb: 'post' }
	});

	Notifications.remoteMethod('updateNotification', {
	  accepts: [
	    { arg: 'data', type: 'object', http: { source: 'body' } },
	    // { arg: 'page', type:'string', required: true},
	    { arg: 'options', type: 'object', 'http': 'optionsFromRequest' }

	  ],
	  returns: { arg: 'result', type: 'Object', root: true },
	  http: { path: '/updateNotification', verb: 'post' }
	});

	Notifications.remoteMethod('getuserID', {
	   accepts: [
	    { arg: 'q', type: 'string', required: false},
	    { arg: 'options', type: 'object', 'http': 'optionsFromRequest' }

	  ],
	  returns: { arg: 'result', type: 'Object', root: true },
	  http: { path: '/userID', verb: 'get' }
	});

	Notifications.remoteMethod('deleteuserID', {
	   accepts: [
	    { arg: 'q', type: 'string', required: false},
	    { arg: 'options', type: 'object', 'http': 'optionsFromRequest' }

	  ],
	  returns: { arg: 'result', type: 'Object', root: true },
	  http: { path: '/deleteuserID', verb: 'get' }   //"delete"
	});

	Notifications.deleteuserID = function(q, options, cb) {
		Notifications.destroyAll({userID:q}, function(err, notification) {
			if (err) {
				return cb(err);
			} else {
				return cb(null,  {
						notification: notification
						})			
			}
		});	
	}
	
	Notifications.customCreate = function(data, options, callback) {
		var jobsPost = app.models.indeedJobs;
		//if not data make sure to handle

	    let notificationTypes = data.notificationType.split("_");
	    let keywords = data.keywords.split("_");
	    let userID = data.userID;
	    let token = data.token;
	    let upsertData = {id:data.id}
	    let searchObjectsArray = [];
	    var notificationObject = {
	    	userID: userID,
	    	token: token,
	    	notificationType: data.notificationType,
	    	keyword: data.keywords,
	    	enabled: true
	    }
	    async.eachOfSeries(notificationTypes, function(item, index, lb) {
	    	if (!keywords[index]) return lb("Error, make sure ntoification type and keywords are same length");
			if (item == 'shortlist') return lb("shortlist");
			if (!item) return lb("Error, empty");
			let keywordsArray = keywords[index].split(",");
			let keywordSearchObject = {
				or:[]
			} 
			async.eachSeries(keywordsArray, function(keyItem, lb2) {
				let keywordObject= {};
				keywordObject[item] = {
					like: "%" + keyItem + "%"
				}
				keywordSearchObject.or.push(keywordObject);
				lb2();

			}, function(err) {
				searchObjectsArray.push(keywordSearchObject);
				lb();
			});

	    }, function(err) {

	    	if (err == 'shortlist') {
	    		let shortlistObject = {
	    			userID: userID,
	    			notificationType: "shortlist",
	    			token: token,
	    			count: 0,
	    			keyword: null,
	    			enabled: 1
	    		}
	    		Notifications.upsertWithWhere(upsertData, shortlistObject,  function(err, shortlistNotification) {
	    			if (err) return callback(err);
	    			return callback(err, {Status: shortlistNotification});
	    		});
	    	} else if (err) {
	    		return cb(err);
	    	} else {
	    	let countObject = {
	    		where: {
	    			and: searchObjectsArray
	    		}
	    	}


	    		jobsPost.count(countObject.where, function(err, count) {
					notificationObject.count = count
						if (err) return callback(err);
					jobsPost.upsertWithWhere(upsertData, notificationObject, function(err, object) {
						if (err) return callback(err);
						return callback(err, {Notifications: object})

					});
				});
			}
	    });
	  }
	Notifications.updateNotification = function(data, options, callback) {
		//dont need to check if empty because lucas wont ever send empty
		var search = app.models.Search
		let locationObject = {};
		let tagObject = {};



		async.parallel([
   				
			//part 1: get count + update
			function(cb) {
				search.notification(data.location, "location", null, null, {}, function(err, jobs) {
					if (err) return cb(err);
					locationObject.count = jobs.count;
					locationObject.keyword = data.location;
					let searchObject = {where: { and: [{userID:data.userID}, {notificationType: "location"}]}}
					Notifications.updateAll(searchObject.where, locationObject, function(err, location) {
						if (location.count == 0) return cb("ERROR: please send location and/or userID not found")
						if (err) return cb(err);
						return cb(null, locationObject);
					});
				});
			},

			//part 2: update the tag notification 
			function(cb) {
				search.notification(data.tag, "generic", null, null, {}, function(err, jobs) {
					if (err) return cb(err);
					tagObject.count = jobs.count;
					tagObject.keyword = data.tag;
					let searchObject = {where: { and: [{userID:data.userID}, {notificationType: "generic"}]}}
					Notifications.updateAll(searchObject.where, tagObject, function(err, tag) {
						if (tag.count == 0) return cb("ERROR: please send tag and/or userID not found")
						if (err) return cb(err);
						return cb(null, tagObject);
					});
				});
			}

		], function(err, result) {
			if (err) return callback(err);
			return callback(null, {count: result});

		});
	}
	Notifications.createNotification = function(data, options, cb) {
		
		var search = app.models.Search
		let locationObject = {};
		let shortlistObject = {};
		let tagObject = {};

		locationObject.userID = data.userID;
		shortlistObject.userID = data.userID;
		tagObject.userID = data.userID;

		locationObject.token = data.token;
		shortlistObject.token = data.token;
		tagObject.token = data.token;

		locationObject.notificationType = "location";
		tagObject.notificationType = "generic";
		shortlistObject.notificationType = "shortlist";


		locationObject.keyword = data.location;
		tagObject.keyword = data.tag;
		shortlistObject.keyword = null;
		shortlistObject.count = 0;

		locationObject.enabled = true;
		tagObject.enabled = true;
		shortlistObject.enabled = true;
		//leaving count for shortlist as 0 fix later on.
		async.parallel([
			
			function(cb1) {
				if (!data.tag) {
					tagObject.count = 0;
					return cb1(null, tagObject);
				}
				search.notification(data.tag,"generic",null, null, {}, function(err, jobs) {
					if (err) return cb1(err);
					tagObject.count = jobs.count;
					return cb1(null, tagObject);
				});
			},

			function(cb2) {
				if (!data.location) {
					locationObject.count = 0;
					return cb2(null, locationObject);
				}
				search.notification(data.location, "location", null, null, {}, function(err, jobs) {
					if (err) return cb2(err);
					locationObject.count = jobs.count;
					return cb2(null, locationObject);
				});
			}
		], function(err, result) {
			console.log(result);
			result.push(shortlistObject);
			if (result.length < 3)   return cb(err, {Status: "Success - Didnt create new shortlist notification"})   //this if statement here to prevent creation of shortlist when only a tag or location notification is created
			Notifications.create(result, function(err, status) {
				if (err) return cb(err);
				return cb(err, {Status:"Success"});
			});
		});
	}

	Notifications.getuserID = function(q, options, cb) {

		let searchObject = {
			where:{},
		}

		searchObject.where = {
			userID: q
		}

		Notifications.find(searchObject, function(err, notification) {
			if (err) {
				return cb(err);
			} else {
				return cb(null,  {
						notification: notification
						})			
			}
		});	
	}


}
