'use strict'; 

const async = require("async");

var app = require('../../server/server');


module.exports = function(Notifications) {
	Notifications.remoteMethod('userID', {
	  accepts: [
	    { arg: 'data', type: 'object', http: { source: 'body' } },
	    // { arg: 'page', type:'string', required: true},
	    { arg: 'options', type: 'object', 'http': 'optionsFromRequest' }

	  ],
	  returns: { arg: 'result', type: 'Object', root: true },
	  http: { path: '/userID', verb: 'post' }
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
		//create the notification
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
			result.push(shortlistObject);
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

	Notifications.userID = function(data, options, cb) {   //
		var indeed = app.models.Jobposts;
		var search = app.models.Search
		let searchObject = {
			where:{}
		}
		console.log(data);


		searchObject.where.and = [
			{userID:data.userID},
			{token:data.token},
			{notificationType:data.notificationType},
			{keyword:data.keyword}
			]
		
		let notiData = {
			userID:data.userID,
			token:data.token,
			notificationType:data.notificationType,
			keyword:data.keyword
		}
		// let indeedSearch = {[data.notificationType]: {like: "%" + data.keyword + "%"}}
		// console.log(indeedSearch)
		//split the notification type + keyword 
		let type1 = data.notificationType.split("_")[0]
		let type2 = data.notificationType.split("_")[1] || ""

		let key1 = data.keyword.split("_")[0]
		let key2 = data.keyword.split("_")[1] || ""

		//do checks 
		if (key1 == null || type1 == null) {
			return cb("ERROR: make sure you have somthing for notification, and or keyword in format x_y");
		} 
		search.notification(key1, type1, type2, key2, {}, function(err, count)  {
			console.log(count)
			if (err) return cb(err);
			notiData.count = count.count;
		Notifications.findOrCreate(searchObject, notiData, function(err, instance, created) {
		    if (err) return cb(err);
		    if (created) {
		    	return cb(null, {"Message":"Created new Notifications"});
		    } else {
		    	return cb({
		    		err: "Notifications already in db"
		    	});
		    }
	});
})

	}

}
