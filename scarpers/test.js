const cheerio = require("cheerio");
const request = require("request");
const async = require("async");


// request("https://halton.cioc.ca/volunteer/results.asp?Age=14&forOSSD=on", function(err, res, body){

// 	let $ = cheerio.load(body);

// 	let onejob = $('.dlist-results').children()[3];
// 	let title = onejob.children[1].children[1].children[0].data;
// 	let link = "https://halton.cioc.ca" + onejob.children[1].children[1].attribs.href;
// 	let company = onejob.children[3].children[1].data;
// 	let location = onejob.children[4].children[1].data;
// 	let summary = onejob.children[5].children[0].data;
// 	console.log(link)
// 	request(link, function(err, res, body) {
// 		let $ = cheerio.load(body);
// 		let ages = $('.FieldLabelLeft:contains("Ages")')[0].next.children[0].data
// 		console.log(ages)
// 		let duties = $('.FieldLabelLeft:contains("Duties")')[0].next.children
// 		let ifOOSD = $('.FieldLabelLeft:contains("Suitable for OSSD")')[0].next.children[0].data
// 		console.log(ifOOSD)
// 		let date = $('.FieldLabelLeft:contains("Dates and Times")')[0]  //can be undefined so make sure.
// 		let contact =$('.FieldLabelLeft:contains("Contact")')[0].next.children[0]
//  			console.log(contact)
// 		// async.eachSeries(duties, function(item, l) {
// 		// 	if (!item.data) {
// 		// 		l()
// 		// 	} else {
// 		// 	console.log(item.data)
// 		// 	l()
// 		// }
// 		// })
// 	})
// })



// //1 = contact 

// //2 = duties



// //3 == benfits


// ///5 = ages


// //6 = suitable OOSD






// request("https://www.google.com/search?q=student+jobs&ibp=htl;jobs&sa=X&ved=2ahUKEwjJtLWFj9bhAhUiUt8KHaokB5kQiYsCKAF6BAgLECU#fpstate=tldetail&htidocid=R5l_L1b_boBt7IUoAAAAAA%3D%3D&htivrt=jobs", function(err, res, body) {


// 	console.log(body)
// })
// const puppeteer = require('puppeteer');

// (async () => {
//   const browser = await puppeteer.launch();
//   const page = await browser.newPage();
//   await page.goto('https://www.google.com/search?rlz=1C1CHBF_enCA809CA809&ei=iJy2XOeKM8aV_QakmoX4Cw&q=student+jobs&oq=student+jobs&gs_l=psy-ab.3..35i39l2j0l8.33260.34711..34831...0.0..0.181.1563.0j12......0....1..gws-wiz.......0i71j0i131j0i67j0i20i263.wpIYw9X4-zE&ibp=htl;jobs&sa=X&ved=2ahUKEwiI3bidmNbhAhWITt8KHWdHCgEQiYsCKAB6BAgKEAM#fpstate=tldetail&htidocid=yZCcgEsK8Q6Ptk-LAAAAAA%3D%3D&htivrt=jobs');
//   await page.screenshot({path: 'example.png'});

//   await browser.close();
// })();


//url is

const pptrFirefox = require('puppeteer-firefox');
 // let title = '#immersive_desktop_root > div > div.YbRs3e > div.UbEfxe.gws-horizon-textlists__tl-lvc > div.MZpzq.gws-horizon-textlists__tl-no-filters.pN5iDd > div.SBFvB > ul > li:nth-child(4) > div > div:nth-child(1) > div.PaEvOc.gws-horizon-textlists__tl-lif.tl-item-selected > div:nth-child(3) > div.BjJfJf.gsrt.LqLjSc'
// (async () => {
//   const browser = await pptrFirefox.launch();
//   const page = await browser.newPage();
//   await page.goto('https://www.google.com/search?rlz=1C1CHBF_enCA809CA809&ei=iJy2XOeKM8aV_QakmoX4Cw&q=student+jobs&oq=student+jobs&gs_l=psy-ab.3..35i39l2j0l8.33260.34711..34831...0.0..0.181.1563.0j12......0....1..gws-wiz.......0i71j0i131j0i67j0i20i263.wpIYw9X4-zE&ibp=htl;jobs&sa=X&ved=2ahUKEwiI3bidmNbhAhWITt8KHWdHCgEQiYsCKAB6BAgKEAM#fpstate=tldetail&htidocid=yZCcgEsK8Q6Ptk-LAAAAAA%3D%3D&htivrt=jobs');
//   await page.screenshot({path: 'example.png'});
//   let bodyHTML = await page.evaluate(() => document.body.innerHTML);
//   let $  = await cheerio.load(bodyHTML);
//   // let test = await $('.SHrHx')[4].children[0].children[0].data
//   let description = await $('.Cyt8W.HBvzbc')
//   console.log(test2.length)
//   await browser.close();
// })();




async function showAvatar() {
  const browser = await pptrFirefox.launch();
  const page = await browser.newPage();
  await page.goto('https://www.google.com/search?rlz=1C1CHBF_enCA809CA809&ei=iJy2XOeKM8aV_QakmoX4Cw&q=student+jobs&oq=student+jobs&gs_l=psy-ab.3..35i39l2j0l8.33260.34711..34831...0.0..0.181.1563.0j12......0....1..gws-wiz.......0i71j0i131j0i67j0i20i263.wpIYw9X4-zE&ibp=htl;jobs&sa=X&ved=2ahUKEwiI3bidmNbhAhWITt8KHWdHCgEQiYsCKAB6BAgKEAM#fpstate=tldetail&htidocid=yZCcgEsK8Q6Ptk-LAAAAAA%3D%3D&htivrt=jobs');
  await page.screenshot({path: 'example.png'});
  let bodyHTML = await page.evaluate(() => document.body.innerHTML);
  let $  = await cheerio.load(bodyHTML)
  let job = await $('.pE8vnd.GZjjfc')[9];  // only gets first 10 jobs
  let title = job.children[0].children[0].children[0].children[0].children[0].data
  company = job.children[0].children[0].children[1].children[1].children[0].children[0].data
  location = job.children[0].children[0].children[1].children[1].children[1].children[0].data
  // let link = job.children[2].children[0].children[0].children[0].children[0].children[0].attribs.href
  // let link = job.children[2].children[0].children[0].parent.parent.children[2].children[0].children[0].children[0].children[1].attribs.href
  let link = job.children[2].children[0].children[0].children
  if (!link) {
  	link = job.children[2].children[0].children[0].parent.parent.children[2].children[0].children[0].children[0].children[1].attribs.href
  } else {
  	link = job.children[2].children[0].children[0].children[0].children[0].children[0].attribs.href
  }
  // let date = job.children[4].children[0].children[1].children[0].data// problem
  // let date = job.children[4].children[0].next.children[2].children[0].data
  // let date = job.children[4].children[0].children[1]
  // if (!date) {
  // 	date = job.children[4].children[0].next.children[2].children[0].data
  // } else {
  // 	date = date.children[0].data
  // }
  // // let description = job.children[5].children[0].children[0].children[0].children[0].data || job.children[5].children[0].children[0].children[0].data
  let description = job.children[5].children[0].children[0].children[0].data
  if (!description) {
  	description = job.children[5].children[0].children[0].children[0].children[0].data;
  }
  console.log(link)
  console.log("checi")
// console.log(description)
  await browser.close();
  return bodyHTML
}



showAvatar()
// var google = require('google')

// google.resultsPerPage = 25
// var nextCounter = 0

// google('student jobs', function (err, res){
//   if (err) console.error(err)

//   for (var i = 0; i < res.links.length; ++i) {
//     var link = res.links[i];
//     console.log(link.title + ' - ' + link.href)
//     console.log(link.description + "\n")
//   }

//   if (nextCounter < 4) {
//     nextCounter += 1
//     if (res.next) res.next()
//   }
// })
