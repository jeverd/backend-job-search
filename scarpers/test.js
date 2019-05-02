const cheerio = require("cheerio");
const request = require("request");
const async = require("async");




 var options = {
      uri: "http://www.jobbank.gc.ca/jobsearchservlet", //note this is hardcoded in change this afterwards
      method: "POST"
    }
