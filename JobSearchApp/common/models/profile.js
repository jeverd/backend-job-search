'use strict';
var app = require('../../server/server');



module.exports = function(Profile) {
	Profile.remoteMethod('userID', {
	  accepts: [
	    { arg: 'q', type: 'string', required: false},
	    { arg: 'options', type: 'object', 'http': 'optionsFromRequest' }

	  ],
	  returns: { arg: 'result', type: 'Object', root: true },
	  http: { path: '/userID', verb: 'get' }
	});

	Profile.remoteMethod('updateprofile', {
		  accepts: [
		    { arg: 'data', type: 'object', http: { source: 'body' } },
		    { arg: 'options', type: 'object', 'http': 'optionsFromRequest' }

		  ],
		  returns: { arg: 'result', type: 'Object', root: true },
		  http: { path: '/updateprofile', verb: 'patch' }
		});


	Profile.updateprofile = function (data, options, cb) {
		var user = app.models.User;
		var notification = app.models.notifications;
		let searchObject = {
			where:{},
		}
		searchObject.where = {
			id:data.profileID
		}
		
		let userObject = {
			where: {}
		}
		userObject.where.or = [{username: data.username, email:data.email}]
		user.find({ where: {or: [{ "username": data.username },{ "email": data.email }] }}, function(err, user1) {
			if (err) return cb(err);
			if (user1.length > 0  && user1[0].id != data.userID) {
				if (user1[0].username == data.username) {
					return cb(null, {error: "username already exists"});
				} else {
					return cb(null, {error: "email already exists"});
				}
			}

			let newData = {
				username: data.username,
				location: data.location,
				email: data.email,
				tag: data.tag
			}
				Profile.updateAll({id:data.profileID}, newData, function(err, profile) {
					if (err) return cb(err);
					let newSearch = {
						where:{}
					}
					let newDataUser = {}
					if (!data.username && !data.email) {
						return cb({"Status":"No need to update the usertable, no new email and username found"});
					} 

					if (data.username && data.email) {
						newDataUser.email = data.email
						newDataUser.username = data.username
					}

					if (!data.username) {
						newDataUser.email = data.email
					}
					
					if (!data.email) {
						newDataUser.username = data.username
					}
						user.updateAll({id:data.userID}, newDataUser, function (err, user) { 
							if (err) {
							  return cb(err);
							}
							let keyword = newData.location.split(', ')[0]
								cb(null, {user: user})

						});

		})
	})

	}

	Profile.userID = function(q, options, cb) {
		let searchObject = {
			where:{},
		}

		searchObject.where = {
			userID: q
		}

		Profile.find(searchObject, function(err, profile) {
			if (err) {
				return cb(err);
			} else {
				return cb(null,  {
						profile: profile
						})			
			}
		});
	}
};
