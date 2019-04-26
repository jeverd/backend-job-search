var monsterScarper = require('job-scraper');

const args = ['Pizza Delivery', 'New York', 'New York'] 

const cool = new monsterScarper(...args);
const scraped = cool.init();
scraped.then(res=>{
	console.log(re)
    //do something with the res
})