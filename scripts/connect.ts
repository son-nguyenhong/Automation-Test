/**
 * VIB Test Studio - SSO Connect (per system)
 * Usage: npx ts-node scripts/connect.ts <url> [authFilePath]
 */
import { chromium } from '@playwright/test';

const BASE_URL = process.argv[2] || 'https://ops-aad.ehr-test.vib';
const AUTH_FILE = process.argv[3] || './auth.json';

async function connectWithPeriodicSave() {
  console.log('STATUS:LAUNCHING');

  const browser = await chromium.launch({
    headless: false,
    channel: 'chrome',
    args: ['--start-maximized'],
  });

  const context = await browser.newContext({
    ignoreHTTPSErrors: true,
    viewport: null,
  });

  const page = await context.newPage();
  console.log('STATUS:WAITING_LOGIN');
  await page.goto(BASE_URL);

  // Save auth every 5s while browser is open
  let saved = false;
  const iv = setInterval(async () => {
    try { await context.storageState({ path: AUTH_FILE }); saved = true; } catch {}
  }, 5000);

  // Wait for user to close browser
  await new Promise<void>(resolve => {
    browser.on('disconnected', () => { clearInterval(iv); resolve(); });
  });

  if (saved) {
    console.log('STATUS:SUCCESS');
    console.log('Auth saved to ' + AUTH_FILE);
  } else {
    console.log('STATUS:FAILED');
  }
  console.log('STATUS:DONE');
}

connectWithPeriodicSave().catch(e => {
  console.log('STATUS:FAILED');
  console.error(e.message);
  process.exit(1);
});
