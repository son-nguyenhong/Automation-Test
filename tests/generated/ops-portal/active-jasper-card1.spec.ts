import { test, expect } from '@playwright/test';

test.describe('Active - JASPER_CARD1', () => {
  test.setTimeout(120000);

  test('Active_JasperCard_1', async ({ page }) => {
    await test.step('Go to https://ops-aad.ehr-test.vib/', async () => {
      await page.goto('https://ops-aad.ehr-test.vib/');
      await page.waitForLoadState('domcontentloaded');
      await test.info().attach('Step 1 - Go to https://ops-aad.ehr-test.vib/', { body: await page.screenshot(), contentType: 'image/png' });
    });
    await test.step('Assert visible', async () => {
      await expect(page.getByRole('button', { name: 'Account settings' })).toBeVisible();
      await test.info().attach('Step 2 - Assert visible', { body: await page.screenshot(), contentType: 'image/png' });
    });
    await test.step('Click text="Account management"', async () => {
      await page.getByText('Account management').click();
      await test.info().attach('Step 3 - Click text="Account management"', { body: await page.screenshot(), contentType: 'image/png' });
    });
    await test.step('Assert visible', async () => {
      await expect(page.getByRole('heading', { name: 'Chọn dịch vụ' })).toBeVisible();
      await test.info().attach('Step 4 - Assert visible', { body: await page.screenshot(), contentType: 'image/png' });
    });
    await test.step('Click text="Account Management">>nth=1', async () => {
      await page.getByText('Account Management').nth(1).click();
      await test.info().attach('Step 5 - Click text="Account Management">>nth=1', { body: await page.screenshot(), contentType: 'image/png' });
    });
    await test.step('Go to https://ops-aad.ehr-test.vib/am/accountManagementSystem#username=nga.ct', async () => {
      await page.goto('https://ops-aad.ehr-test.vib/am/accountManagementSystem#username=nga.ct');
      await page.waitForLoadState('domcontentloaded');
      await test.info().attach('Step 6 - Go to https://ops-aad.ehr-test.vib/am/accountManagementSystem#username=nga.ct', { body: await page.screenshot(), contentType: 'image/png' });
    });
    await test.step('Assert visible', async () => {
      await expect(page.getByRole('img', { name: 'search' }).first()).toBeVisible();
      await test.info().attach('Step 7 - Assert visible', { body: await page.screenshot(), contentType: 'image/png' });
    });
    await test.step('Press ControlOrMeta+r', async () => {
      await page.locator('body').press('ControlOrMeta+r');
      await test.info().attach('Step 8 - Press ControlOrMeta+r', { body: await page.screenshot(), contentType: 'image/png' });
    });
    await test.step('Go to https://ops-aad.ehr-test.vib/am/accountManagementSystem#username=nga.ct', async () => {
      await page.goto('https://ops-aad.ehr-test.vib/am/accountManagementSystem#username=nga.ct');
      await page.waitForLoadState('domcontentloaded');
      await test.info().attach('Step 9 - Go to https://ops-aad.ehr-test.vib/am/accountManagementSystem#username=nga.ct', { body: await page.screenshot(), contentType: 'image/png' });
    });
    await test.step('Assert visible', async () => {
      await expect(page.getByRole('button', { name: 'Account settings' })).toBeVisible();
      await test.info().attach('Step 10 - Assert visible', { body: await page.screenshot(), contentType: 'image/png' });
    });
    await test.step('Click role=textbox[name="Search by name, code, or job"]', async () => {
      await page.getByRole('textbox', { name: 'Search by name, code, or job' }).click();
      await test.info().attach('Step 11 - Click role=textbox[name="Search by name, code, or job"]', { body: await page.screenshot(), contentType: 'image/png' });
    });
    await test.step('Fill "06369"', async () => {
      await page.getByRole('textbox', { name: 'Search by name, code, or job' }).fill('06369');
      await test.info().attach('Step 12 - Fill "06369"', { body: await page.screenshot(), contentType: 'image/png' });
    });
    await test.step('Click text="06369"', async () => {
      await page.getByText('06369').click();
      await test.info().attach('Step 13 - Click text="06369"', { body: await page.screenshot(), contentType: 'image/png' });
    });
    await test.step('Assert visible', async () => {
      await expect(page.getByRole('img', { name: 'code-sandbox' }).first()).toBeVisible();
      await test.info().attach('Step 14 - Assert visible', { body: await page.screenshot(), contentType: 'image/png' });
    });
    await test.step('Click role=textbox[name="System name..."]', async () => {
      await page.getByRole('textbox', { name: 'System name...' }).click();
      await test.info().attach('Step 15 - Click role=textbox[name="System name..."]', { body: await page.screenshot(), contentType: 'image/png' });
    });
    await test.step('Fill "JASPER_CARD1"', async () => {
      await page.getByRole('textbox', { name: 'System name...' }).fill('JASPER_CARD1');
      await test.info().attach('Step 16 - Fill "JASPER_CARD1"', { body: await page.screenshot(), contentType: 'image/png' });
    });
    await test.step('Assert "Inactive"', async () => {
      await expect(page.locator('role=switch')).toContainText('Inactive');
      await test.info().attach('Step 17 - Assert "Inactive"', { body: await page.screenshot(), contentType: 'image/png' });
    });
    await test.step('Click role=switch[name="Active Inactive"]', async () => {
      await page.getByRole('switch', { name: 'Active Inactive' }).click();
      await test.info().attach('Step 18 - Click role=switch[name="Active Inactive"]', { body: await page.screenshot(), contentType: 'image/png' });
    });
    await test.step('Assert "Active"', async () => {
      await expect(page.locator('role=switch')).toContainText('Active');
      await test.info().attach('Step 19 - Assert "Active"', { body: await page.screenshot(), contentType: 'image/png' });
    });
  });

});
