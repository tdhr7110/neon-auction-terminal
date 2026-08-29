const { chromium } = require('playwright-core');

const baseUrl = process.env.NEON_AUCTION_URL || 'http://127.0.0.1:4173';
const sizes = [[360, 640], [390, 844], [1366, 768], [1440, 900]];

async function collectEvidence(page, sourceIndex) {
  await page.locator('[data-source]').nth(sourceIndex).click();
  await page.locator('[data-converse]').click();
  await page.locator('[data-converse]').click();
}

async function metrics(page, requested) {
  return page.evaluate(label => {
    const outside = [...document.querySelectorAll('button,input')].filter(element => {
      const rect = element.getBoundingClientRect();
      return rect.left < 0 || rect.top < 0 || rect.right > innerWidth || rect.bottom > innerHeight;
    });
    const scrollable = [...document.querySelectorAll('*')].filter(element => {
      const style = getComputedStyle(element);
      return [style.overflow, style.overflowX, style.overflowY].some(value => value === 'auto' || value === 'scroll');
    });
    return {
      requested: label,
      body: [document.body.scrollWidth, document.body.scrollHeight],
      viewport: [innerWidth, innerHeight],
      outside: outside.length,
      scrollable: scrollable.length,
    };
  }, requested);
}

(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath: process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  });
  const report = [];
  const consoleErrors = [];

  for (const [width, height] of sizes) {
    const page = await browser.newPage({ viewport: { width, height } });
    page.on('console', message => {
      if (message.type() === 'error') consoleErrors.push(`${width}x${height}: ${message.text()}`);
    });
    page.on('pageerror', error => consoleErrors.push(`${width}x${height}: ${error.message}`));

    await page.goto(`${baseUrl}/start-v30.html?new=1&seed=E2E-${width}`, { waitUntil: 'domcontentloaded' });
    await page.fill('#player-name', 'E2E');
    await page.press('#player-name', 'Enter');
    await page.click('[data-intro-skip]');
    await page.click('[data-help-close]');
    await page.click('[data-accept-request]');
    report.push(await metrics(page, 'explore'));

    for (let lot = 0; lot < 5; lot += 1) {
      await collectEvidence(page, 0);
      await page.click('[data-explore-tab="explore"]');
      await collectEvidence(page, 1);
      await page.click('[data-to-hypothesis]');
      await page.click('[data-condition="prime"]');
      await page.click('[data-confidence="medium"]');
      await page.click('[data-submit-hypothesis]');
      if (lot === 0) report.push(await metrics(page, 'auction'));
      await page.click('[data-pass]');
      await page.click('[data-result-next]');
    }

    report.push(await metrics(page, 'delivery'));
    await page.click('[data-fail-cycle]');
    report.push(await metrics(page, 'report'));
    await page.close();
  }

  await browser.close();
  const failed = report.filter(row => (
    row.body[0] > row.viewport[0]
    || row.body[1] > row.viewport[1]
    || row.outside > 0
    || row.scrollable > 0
  ));
  console.log(JSON.stringify({ report, consoleErrors }, null, 2));
  if (failed.length || consoleErrors.length) process.exit(1);
})().catch(error => {
  console.error(error);
  process.exit(1);
});
