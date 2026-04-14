import { test, expect } from '../../src/fixtures/base-fixture';
import { TravelDeskPage } from '../../src/pages/traveldesk.page';

/**
 * Travel Desk - Manual Test Suite (POM-based)
 * 
 * Tags: @traveldesk @regression
 */
test.describe('Travel Desk @traveldesk', () => {
  let travelPage: TravelDeskPage;

  test.beforeEach(async ({ page }) => {
    travelPage = new TravelDeskPage(page);
    await travelPage.navigateToPage();
  });

  test('should load Travel Desk page', async () => {
    await travelPage.assertPageLoaded();
  });

  test('should create a new business trip request', async () => {
    await test.step('Open create request form', async () => {
      await travelPage.clickCreateRequest();
    });

    await test.step('Fill in trip details', async () => {
      await travelPage.fillTripReason('Họp chi nhánh Q2 2026');
      await travelPage.selectBranch('VIB Hà Nội');
    });

    await test.step('Submit the request', async () => {
      await travelPage.submitRequest();
    });

    await test.step('Verify success message', async () => {
      await travelPage.assertSuccessMessage();
    });
  });

  test('should display existing requests in table', async () => {
    await test.step('Verify request table is visible', async () => {
      await travelPage.assertPageLoaded();
    });

    await test.step('Verify at least one request exists', async () => {
      const count = await travelPage.getRequestCount();
      expect(count).toBeGreaterThan(0);
    });
  });
});
