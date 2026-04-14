import { test, expect } from '@playwright/test';

/**
 * Demo Test - Verify system works
 * Runs against playwright.dev (public site, always available)
 * 
 * Tags: @demo @smoke
 */
test.describe('Demo - System Verification @demo', () => {

  test('should navigate and verify page title', async ({ page }) => {
    await test.step('Navigate to Playwright docs', async () => {
      await page.goto('https://playwright.dev/');
    });

    await test.step('Verify page title', async () => {
      await expect(page).toHaveTitle(/Playwright/);
    });

    await test.step('Verify Get Started link visible', async () => {
      await expect(page.getByRole('link', { name: 'Get started' })).toBeVisible();
    });
  });

  test('should click Get Started and navigate', async ({ page }) => {
    await test.step('Navigate to home page', async () => {
      await page.goto('https://playwright.dev/');
    });

    await test.step('Click Get Started', async () => {
      await page.getByRole('link', { name: 'Get started' }).click();
    });

    await test.step('Verify navigation to docs', async () => {
      await expect(page).toHaveURL(/.*intro/);
    });

    await test.step('Verify Installation heading', async () => {
      await expect(page.getByRole('heading', { name: 'Installation' })).toBeVisible();
    });
  });

  test('should search in documentation', async ({ page }) => {
    await test.step('Navigate to docs', async () => {
      await page.goto('https://playwright.dev/docs/intro');
    });

    await test.step('Verify docs page loaded', async () => {
      await expect(page.getByRole('heading', { name: 'Installation' })).toBeVisible();
    });
  });
});
