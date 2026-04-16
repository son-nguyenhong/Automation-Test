import { test, expect } from '@playwright/test';

test.setTimeout(120000);

test.describe('Active - JASPER_CARD1', () => {
  test('JASPER_CARD1  Inactive => Active ', async ({ page }) => {
    await test.step('Go to https://ops-aad.ehr-test.vib/', async () => {
      await page.goto('https://ops-aad.ehr-test.vib/');
      await page.waitForLoadState('domcontentloaded');
      await test.info().attach('Step 1 - Go to https://ops-aad.ehr-test.vib/', { body: await page.screenshot(), contentType: 'image/png' });
    });
    await test.step('Click text="Account management"', async () => {
      await page.getByText('Account management').click();
      await test.info().attach('Step 2 - Click text="Account management"', { body: await page.screenshot(), contentType: 'image/png' });
    });
    await test.step('Click text="Account Management"', async () => {
      await page.getByText('Account Management').click();
      await test.info().attach('Step 3 - Click text="Account Management"', { body: await page.screenshot(), contentType: 'image/png' });
    });
    await test.step('Go to https://ops-aad.ehr-test.vib/am/accountManagementSystem#username=nga.ct', async () => {
      await page.goto('https://ops-aad.ehr-test.vib/am/accountManagementSystem#username=nga.ct');
      await page.waitForLoadState('domcontentloaded');
      await test.info().attach('Step 4 - Go to https://ops-aad.ehr-test.vib/am/accountManagementSystem#username=nga.ct', { body: await page.screenshot(), contentType: 'image/png' });
    });
    await test.step('Click role=textbox[name="Search by name, code, or job"]', async () => {
      await page.getByRole('textbox', { name: 'Search by name, code, or job' }).click();
      await test.info().attach('Step 5 - Click role=textbox[name="Search by name, code, or job"]', { body: await page.screenshot(), contentType: 'image/png' });
    });
    await test.step('Fill "06369"', async () => {
      await page.getByRole('textbox', { name: 'Search by name, code, or job' }).fill('06369');
      await test.info().attach('Step 6 - Fill "06369"', { body: await page.screenshot(), contentType: 'image/png' });
    });
    await test.step('Click text="06369"', async () => {
      await page.getByText('06369').click();
      await test.info().attach('Step 7 - Click text="06369"', { body: await page.screenshot(), contentType: 'image/png' });
    });
    await test.step('Click role=textbox[name="System name..."]', async () => {
      await page.getByRole('textbox', { name: 'System name...' }).click();
      await test.info().attach('Step 8 - Click role=textbox[name="System name..."]', { body: await page.screenshot(), contentType: 'image/png' });
    });
    await test.step('Fill "JASPER_CARD1"', async () => {
      await page.getByRole('textbox', { name: 'System name...' }).fill('JASPER_CARD1');
      await test.info().attach('Step 9 - Fill "JASPER_CARD1"', { body: await page.screenshot(), contentType: 'image/png' });
    });
    await test.step('Assert visible', async () => {
      await expect(page.getByRole('switch', { name: 'Active Inactive' })).toBeVisible();
      await test.info().attach('Step 10 - Assert visible', { body: await page.screenshot(), contentType: 'image/png' });
    });
    await test.step('Assert "InActive"', async () => {
      await expect(page.locator('unknown')).toContainText('InActive');
      await test.info().attach('Step 11 - Assert "InActive"', { body: await page.screenshot(), contentType: 'image/png' });
    });
    await test.step('Click role=switch[name="Active Inactive"]', async () => {
      await page.getByRole('switch', { name: 'Active Inactive' }).click();
      await test.info().attach('Step 12 - Click role=switch[name="Active Inactive"]', { body: await page.screenshot(), contentType: 'image/png' });
    });
    await test.step('Assert visible', async () => {
      await expect(page.getByRole('switch', { name: 'Active Inactive' })).toBeVisible();
      await test.info().attach('Step 13 - Assert visible', { body: await page.screenshot(), contentType: 'image/png' });
    });
    await test.step('Assert "Active"', async () => {
      await expect(page.locator('unknown')).toContainText('Active');
      await test.info().attach('Step 14 - Assert "Active"', { body: await page.screenshot(), contentType: 'image/png' });
    });
  });
});

test.describe('Inactive - JASPER_CARD1', () => {
  test('JASPER_CARD1 Active => Inactive', async ({ page }) => {
    await test.step('Go to https://ops-aad.ehr-test.vib/', async () => {
      await page.goto('https://ops-aad.ehr-test.vib/');
      await page.waitForLoadState('domcontentloaded');
      await test.info().attach('Step 1 - Go to https://ops-aad.ehr-test.vib/', { body: await page.screenshot(), contentType: 'image/png' });
    });
    await test.step('Click text="Account management"', async () => {
      await page.getByText('Account management').click();
      await test.info().attach('Step 2 - Click text="Account management"', { body: await page.screenshot(), contentType: 'image/png' });
    });
    await test.step('Click text="Account Management"', async () => {
      await page.getByText('Account Management').click();
      await test.info().attach('Step 3 - Click text="Account Management"', { body: await page.screenshot(), contentType: 'image/png' });
    });
    await test.step('Go to https://ops-aad.ehr-test.vib/am/accountManagementSystem#username=nga.ct', async () => {
      await page.goto('https://ops-aad.ehr-test.vib/am/accountManagementSystem#username=nga.ct');
      await page.waitForLoadState('domcontentloaded');
      await test.info().attach('Step 4 - Go to https://ops-aad.ehr-test.vib/am/accountManagementSystem#username=nga.ct', { body: await page.screenshot(), contentType: 'image/png' });
    });
    await test.step('Click role=textbox[name="Search by name, code, or job"]', async () => {
      await page.getByRole('textbox', { name: 'Search by name, code, or job' }).click();
      await test.info().attach('Step 5 - Click role=textbox[name="Search by name, code, or job"]', { body: await page.screenshot(), contentType: 'image/png' });
    });
    await test.step('Fill "06369"', async () => {
      await page.getByRole('textbox', { name: 'Search by name, code, or job' }).fill('06369');
      await test.info().attach('Step 6 - Fill "06369"', { body: await page.screenshot(), contentType: 'image/png' });
    });
    await test.step('Click text="06369"', async () => {
      await page.getByText('06369').click();
      await test.info().attach('Step 7 - Click text="06369"', { body: await page.screenshot(), contentType: 'image/png' });
    });
    await test.step('Click role=textbox[name="System name..."]', async () => {
      await page.getByRole('textbox', { name: 'System name...' }).click();
      await test.info().attach('Step 8 - Click role=textbox[name="System name..."]', { body: await page.screenshot(), contentType: 'image/png' });
    });
    await test.step('Fill "JASPER_CARD1"', async () => {
      await page.getByRole('textbox', { name: 'System name...' }).fill('JASPER_CARD1');
      await test.info().attach('Step 9 - Fill "JASPER_CARD1"', { body: await page.screenshot(), contentType: 'image/png' });
    });
    await test.step('Assert "Active"', async () => {
      await expect(page.locator('unknown')).toContainText('Active');
      await test.info().attach('Step 10 - Assert "Active"', { body: await page.screenshot(), contentType: 'image/png' });
    });
    await test.step('Click role=switch[name="Active Inactive"]', async () => {
      await page.getByRole('switch', { name: 'Active Inactive' }).click();
      await test.info().attach('Step 11 - Click role=switch[name="Active Inactive"]', { body: await page.screenshot(), contentType: 'image/png' });
    });
    await test.step('Assert "Inactive"', async () => {
      await expect(page.locator('unknown')).toContainText('Inactive');
      await test.info().attach('Step 12 - Assert "Inactive"', { body: await page.screenshot(), contentType: 'image/png' });
    });
  });
});

test.describe('Login & Access AM_Home', () => {
  test('Login & Access OPS - AM', async ({ page }) => {
    await test.step('Go to https://ops-aad.ehr-test.vib/', async () => {
      await page.goto('https://ops-aad.ehr-test.vib/');
      await page.waitForLoadState('domcontentloaded');
      await test.info().attach('Step 1 - Go to https://ops-aad.ehr-test.vib/', { body: await page.screenshot(), contentType: 'image/png' });
    });
    await test.step('Click text="Account management"', async () => {
      await page.getByText('Account management').click();
      await test.info().attach('Step 2 - Click text="Account management"', { body: await page.screenshot(), contentType: 'image/png' });
    });
  });
});

