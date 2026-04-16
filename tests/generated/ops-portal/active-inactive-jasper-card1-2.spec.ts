import { test, expect } from '@playwright/test';

test.describe('Active/Inactive - JASPER_CARD1 2', () => {
  test.setTimeout(120000);

  test('JASPER_CARD1 Active => Inactive', async ({ page }) => {
    await test.step('Go to https://ops-aad.ehr-test.vib/', async () => {
      await page.goto('https://ops-aad.ehr-test.vib/');
      await page.waitForLoadState('domcontentloaded');
    });
    await test.step('Click text="Account management"', async () => {
      await page.getByText('Account management').click();
    });
    await test.step('Click text="Account Management"', async () => {
      await page.getByText('Account Management').click();
    });
    await test.step('Go to https://ops-aad.ehr-test.vib/am/accountManagementSystem#username=nga.ct', async () => {
      await page.goto('https://ops-aad.ehr-test.vib/am/accountManagementSystem#username=nga.ct');
      await page.waitForLoadState('domcontentloaded');
    });
    await test.step('Click role=textbox[name="Search by name, code, or job"]', async () => {
      await page.getByRole('textbox', { name: 'Search by name, code, or job' }).click();
    });
    await test.step('Fill "06369"', async () => {
      await page.getByRole('textbox', { name: 'Search by name, code, or job' }).fill('06369');
    });
    await test.step('Click text="06369"', async () => {
      await page.getByText('06369').click();
    });
    await test.step('Click role=textbox[name="System name..."]', async () => {
      await page.getByRole('textbox', { name: 'System name...' }).click();
    });
    await test.step('Fill "JASPER_CARD1"', async () => {
      await page.getByRole('textbox', { name: 'System name...' }).fill('JASPER_CARD1');
    });
    await test.step('Assert "Active"', async () => {
      await expect(page.locator('unknown')).toContainText('Active');
    });
    await test.step('Click role=switch[name="Active Inactive"]', async () => {
      await page.getByRole('switch', { name: 'Active Inactive' }).click();
    });
    await test.step('Assert "Inactive"', async () => {
      await expect(page.locator('unknown')).toContainText('Inactive');
    });
  });

});
