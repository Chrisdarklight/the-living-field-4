const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const page = await browser.newPage();
  await page.goto('file://' + path.resolve(__dirname, 'toroidal-field-guide.html'), { waitUntil: 'networkidle' });
  await page.pdf({
    path: path.resolve(__dirname, 'The-Toroidal-Field.pdf'),
    width: '8.27in',
    height: '11.69in',
    printBackground: true,
    margin: { top: '0', bottom: '0.4in', left: '0', right: '0' }
  });
  await browser.close();
  console.log('done');
})();
