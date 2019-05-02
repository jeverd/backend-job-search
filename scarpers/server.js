

// //This is the server file, to start the scrapers. 

// //TODO, do this via the db, instead of hardcoding...
// //TOD), instead of getting link to the page, get link to the acutal apply page. 

// //INDEED SCRAPER
const indeed = require("./indeed-scaprer");

let cron_time = '* * * * *';   //run every hour.
indeed.schedule(cron_time);  //schedule first;
indeed.run;  //run once when server.js is ran.


// const google = require("./googleJobs");
// google.schedule("0 8 * * *")
// google.run;

// // const jobBank = require("./job-bank-scarper");

// // jobBank.schedule(cron_time);  //schedule first;
// // jobBank.run;  //run once when server.js is ran.



const post2jobs = require("./post2jobs");

post2jobs.schedule(cron_time);  //schedule first;
post2jobs.run;  //run once when server.js is ran.



// const eluta = require("./eluta");

// eluta.schedule(cron_time);  //schedule first;
// eluta.run;  //run once when server.js is ran.



// const publisier = require("./publishing");

// publisier.schedule(cron_time);
// publisier.run;