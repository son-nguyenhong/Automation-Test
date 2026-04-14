/**
 * VIB Test Studio - SSO Connect
 * 
 * Opens Chrome, user logs in via SSO, saves session to auth.json.
 * Called from dashboard "Connect" button.
 */
import { chromium } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const AUTH_FILE = path.resolve('./auth.json');
const BASE_URL = process.argv[2] || process.env.BASE_URL || 'https://ops-aad.ehr-test.vib';

async function connect() {
  console.log('STATUS:LAUNCHING');
  console.log('Opening browser for SSO login...');

  const browser = await chromium.launch({
    headless: false,
    channel: 'chrome',
    args: ['--start-maximized'],
  });

  const context = await browser.newContext({
    ignoreHTTPSErrors: true,
    viewport: null, // use full window
  });

  const page = await context.newPage();
  
  console.log('STATUS:WAITING_LOGIN');
  console.log(`Navigating to ${BASE_URL}...`);
  
  await page.goto(BASE_URL);

  // Wait for user to complete SSO login (up to 5 minutes)
  // Detect: URL no longer contains login/auth/sso pages
  try {
    await page.waitForURL((url) => {
      const href = url.toString();
      return (
        !href.includes('login') &&
        !href.includes('/auth') &&
        !href.includes('sso') &&
        !href.includes('microsoftonline') &&
        !href.includes('adfs') &&
        !href.includes('oauth')
      );
    }, { timeout: 300000 }); // 5 min

    // Extra wait for cookies/tokens to settle
    await page.waitForTimeout(3000);
    
    console.log('STATUS:SAVING');
    console.log('Login detected! Saving session...');
    
    // Save auth state
    await context.storageState({ path: AUTH_FILE });
    
    console.log('STATUS:SUCCESS');
    console.log(`Auth saved to ${AUTH_FILE}`);
    
  } catch (e) {
    // Timeout or user closed browser - try to save anyway
    console.log('STATUS:SAVING');
    try {
      await context.storageState({ path: AUTH_FILE });
      console.log('STATUS:SUCCESS');
      console.log('Session saved (timeout, but state captured).');
    } catch {
      console.log('STATUS:FAILED');
      console.log('Could not save auth state.');
    }
  }

  await browser.close();
  console.log('STATUS:DONE');
}

connect().catch((e) => {
  console.log('STATUS:FAILED');
  console.error(e.message);
  process.exit(1);
});
