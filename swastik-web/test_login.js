const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', error => console.log('PAGE ERROR:', error.message));
  const response = await page.goto('http://localhost:3000/login/doctor', {waitUntil: 'networkidle2'});
  console.log('Status:', response.status());
  console.log('Body:', await page.content());
  await browser.close();
})();
