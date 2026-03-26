import { chromium } from 'playwright';
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('https://ai.google.dev/pricing');
  const text = await page.evaluate(() => document.body.innerText);
  const start = text.indexOf('Gemini 3.1 Pro Preview');
  console.log(text.substring(start, start + 1000));
  await browser.close();
})();
