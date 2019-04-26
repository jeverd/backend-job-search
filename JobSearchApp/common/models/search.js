'use strict';


var app = require('../../server/server');

module.exports = function(Search) {
    Search.remoteMethod('searching', {
        accepts: [{
                arg: 'q',
                type: 'string',
                required: false
            },
            {
                arg: 'category',
                type: 'string',
                required: false
            },
            {
                arg: 'page',
                type: 'string',
                required: true
            },
            {
                arg: 'location',
                type: 'string',
                required: false
            },
            {
                arg: 'userID',
                type: 'number',
                required: false
            },
            {
                arg: 'options',
                type: 'object',
                'http': 'optionsFromRequest'
            }

        ],
        returns: {
            arg: 'result',
            type: 'Object',
            root: true
        },
        http: {
            path: '/',
            verb: 'get'
        }
    });

    Search.remoteMethod('notification', {
        accepts: [{
                arg: 'q',
                type: 'string',
                required: false
            },
            {
                arg: 'category',
                type: 'string',
                required: false
            },
            {
                arg: 'category2',
                type: 'string',
                required: false
            },
            {
                arg: 'q2',
                type: 'string',
                required: false
            },
            {
                arg: 'options',
                type: 'object',
                'http': 'optionsFromRequest'
            }

        ],
        returns: {
            arg: 'result',
            type: 'Object',
            root: true
        },
        http: {
            path: '/notification',
            verb: 'get'
        }
    });


    Search.notification = function(q, category, category2, q2, options, cb) {
        var indeed = app.models.jobPosts;
        let searchObject = {
            where: {}
        }

         if (category == "generic") {
            if (category2) {
                searchObject.where.and = [{     // make this and universal, so takes company + q
                        [category2]: {
                            like: "%" + q2 + "%"
                        }
                    },
                    {
                        or: [{
                                title: {
                                    like: "%" + q + "%"
                                }
                            },
                            {
                                summary: {
                                    like: "%" + q + "%"
                                }
                            },

                            {
                                company: {
                                    like: "%" + q + "%"
                                }
                            },
                        ]
                    },
                ]
            } else {
                searchObject.where.or = [{
                        title: {
                            like: "%" + q + "%"
                        }
                    },
                    {
                        summary: {
                            like: "%" + q + "%"
                        }
                    },
                    {
                        company: {
                            like: "%" + q + "%"
                        }
                    }
                ]
            }

        } else if (category && category2) {
            searchObject.where.and = [{
                [category]: {
                            like: "%" + q + "%"
                            }
            },
            {
                [category2]: {
                    like: "%" + q2 + "%"
                            }
                }]

        } else {
            searchObject.where[category] = {
                like: "%" + q + "%"
            };
        }
        indeed.find(searchObject, function(err, jobs){
            if (err) cb(err);
            let count = jobs.length;
            return cb(null, {jobs, jobs, count:count});
        })

 
    }

    Search.searching = function(q, category, page, locationValue, userID, options, cb) {
        var indeed = app.models.jobPosts;
        var history = app.models.SearchHistory;
        
        //pagniation...
        let pageValue = parseInt(page, 10);
        let skipValue = (pageValue - 1) * 15;


        let searchObject = {
            where: {},
            limit: 15,
             order: 'date_post ASC' 
        }

        searchObject["skip"] = skipValue;

        if (category == "generic") {
            if (locationValue) {
                searchObject.where.and = [{     // make this and universal, so takes company + q
                        location: {
                            like: "%" + locationValue + "%"
                        }
                    },
                    {
                        or: [{
                                title: {
                                    like: "%" + q + "%"
                                }
                            },
                            {
                                summary: {
                                    like: "%" + q + "%"
                                }
                            },

                            {
                                company: {
                                    like: "%" + q + "%"
                                }
                            },
                        ]
                    },
                ]
            } else {
                searchObject.where.or = [{
                        title: {
                            like: "%" + q + "%"
                        }
                    },
                    {
                        summary: {
                            like: "%" + q + "%"
                        }
                    },
                    {
                        company: {
                            like: "%" + q + "%"
                        }
                    }
                ]
            }

        } else if (category == "all") {

        } else {
            searchObject.where[category] = {
                like: "%" + q + "%"
            };
        }
        let historySearch = {
            where:{}
        }

        historySearch.where.and = [
            {userID:userID},
            {query:q}
        ]
        let data = {
            userID:userID,
            query:q
        }
        history.findOrCreate(historySearch, data, function(err, instance, created) {
            if (err) console.log("ERROR Saving search");
            if (created) console.log("CREATED NEW OBJECT");
            if (instance) console.log("SEARCH ALREADY IN DB");
            indeed.find(searchObject, function(err, posts) {
            if (err) {
                return cb(err);
            }

            cb(null, {
                pagnation: {
                    limit_per_page: 15,
                    page_number: pageValue
                },
                jobs: posts
            });


        });



        })
    }

};



