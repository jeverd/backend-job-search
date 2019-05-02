const publisier = require("./publishing");


let cron_time = '* * * * *';   //run every hour.
publisier.schedule(cron_time);
publisier.run;