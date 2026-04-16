import { test, expect } from '@playwright/test';

test.setTimeout(120000);

test.describe('Login & Access AM_Home', () => {
  test('Login & Access OPS - AM', async ({ page }) => {
    await test.step('Go to https://ops-aad.ehr-test.vib/', async () => {
      await page.goto('https://ops-aad.ehr-test.vib/');
      await page.waitForLoadState('domcontentloaded');
    });
    await test.step('Click text="Account management"', async () => {
      await page.getByText('Account management').click();
    });
  });
});

test.describe('Login và Access AM_Home', () => {
  test('Login & Access OPS - AM', async ({ page }) => {
    await test.step('Go to https://ops-aad.ehr-test.vib/', async () => {
      await page.goto('https://ops-aad.ehr-test.vib/');
      await page.waitForLoadState('domcontentloaded');
    });
    await test.step('Click text="Account management"', async () => {
      await page.getByText('Account management').click();
    });
  });
});

