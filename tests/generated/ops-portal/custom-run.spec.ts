import { test, expect } from '@playwright/test';

test.describe('Custom run', () => {
  test.setTimeout(120000);

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
