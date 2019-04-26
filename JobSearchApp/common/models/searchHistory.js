'use strict';
const async = require('async');



module.exports = function(Searchhistory) {
	Searchhistory.remoteMethod('userID', {
	  accepts: [
	    { arg: 'q', type: 'string', required: false},
	    { arg: 'options', type: 'object', 'http': 'optionsFromRequest' }

	  ],
	  returns: { arg: 'result', type: 'Object', root: true },
	  http: { path: '/userID', verb: 'get' }
	});

	Searchhistory.userID = function(q, options, cb) {
		let searchObject = {
			where:{},
		}

		searchObject.where = {
			userID: q
		}

		Searchhistory.find(searchObject, function(err, terms) {
			if (err) {
				return cb(err);
			} else {
				sortIDs(terms, function(termsSorted) {
					var termsIDArray  = [];
					async.eachSeries(termsSorted, function(item, loopCallback) {
						termsIDArray.push({word:item.query});
						return loopCallback();
					},
					function(err) {
						if (err) return cb(null);
						return cb(null,  {
						searchTerms: termsIDArray
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