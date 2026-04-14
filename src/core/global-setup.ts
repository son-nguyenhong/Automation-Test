import { chromium, FullConfig } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const AUTH_FILE = path.resolve('./auth.json');
const BASE_URL = process.env.BASE_URL || 'https://ops-aad.ehr-test.vib';

/**
 * Global Setup - Handles SSO auth automatically
 * 
 * - If auth.json exists and not expired → skip login, reuse session
 * - If auth.json missing or expired → open browser for manual SSO login once
 * - After login, saves session → all tests reuse it
 */
async function globalSetup(config: FullConfig) {
  // Check if auth.json exists and is fresh (< 8 hours old)
  if (isAuthValid()) {
    console.log('🔑 Auth session found and valid. Reusing...');
    return;
  }

  console.log('🔐 No valid auth session. Opening browser for SSO login...');
  console.log('   → Login normally, then CLOSE the browser when done.\n');

  const browser = await chromium.launch({
    headless: false,
    channel: 'chrome',
  });

  const context = await browser.newContext({
    ignoreHTTPSErrors: true,
    viewport: { width: 1920, height: 1080 },
  });

  const page = await context.newPage();
  await page.goto(BASE_URL);

  // Wait for user to complete SSO login
  // Detect login success: wait until URL is no longer the login/SSO page
  console.log('   ⏳ Waiting for you to complete SSO login...');

  try {
    // Wait up to 5 minutes for login to complete
    // Adjust the URL pattern to match your post-login landing page
    await page.waitForURL((url) => {
      const href = url.toString();
      // Consider logged in when NOT on login/SSO pages
      return (
        href.includes(BASE_URL) &&
        !href.includes('login') &&
        !href.includes('auth') &&
        !href.includes('sso') &&
        !href.includes('microsoftonline') &&
        !href.includes('adfs')
      );
    }, { timeout: 300000 }); // 5 min timeout

    console.log('   ✅ Login detected! Saving session...');
  } catch (e) {
    // If timeout, still try to save - user might have logged in
    console.log('   ⚠️  Timeout waiting for redirect. Saving current state...');
  }

  // Wait a bit for all cookies/tokens to settle
  await page.waitForTimeout(2000);

  // Save auth state
  await context.storageState({ path: AUTH_FILE });
  await browser.close();

  console.log(`   💾 Auth saved to ${AUTH_FILE}`);
  console.log('   📌 Next runs will reuse this session automatically.\n');
}

/**
 * Check if auth.json exists and is less than 8 hours old
 */
function isAuthValid(): boolean {
  if (!fs.existsSync(AUTH_FILE)) return false;

  try {
    const stats = fs.statSync(AUTH_FILE);
    const ageHours = (Date.now() - stats.mtimeMs) / (1000 * 60 * 60);

    // Auth older than 8 hours → expired
    if (ageHours > 8) {
      console.log(`⏰ Auth session expired (${ageHours.toFixed(1)}h old). Need re-login.`);
      return false;
    }

    // Check file is not empty/corrupted
    const content = fs.readFileSync(AUTH_FILE, 'utf-8');
    const parsed = JSON.parse(content);
    if (!parsed.cookies || parsed.cookies.length === 0) {
      console.log('⚠️  Auth file has no cookies. Need re-login.');
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

export default globalSetup;
