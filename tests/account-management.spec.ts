import { test, expect } from '../../src/fixtures/base-fixture';
import { AccountManagementPage } from '../../src/pages/account-management.page';

/**
 * Account Management - Manual Test Suite (POM-based)
 * 
 * These tests use Page Object Model for better maintainability.
 * Use these as templates when writing custom tests.
 * 
 * Tags: @account-mgmt @smoke
 */
test.describe('Account Management @account-mgmt', () => {
  let accountPage: AccountManagementPage;

  test.beforeEach(async ({ page }) => {
    accountPage = new AccountManagementPage(page);
    await accountPage.navigateToPage();
  });

  test('should load Account Management page', async () => {
    await accountPage.assertPageLoaded();
  });

  test('should search for a user', async () => {
    await test.step('Search for testuser01', async () => {
      await accountPage.searchUser('testuser01');
    });

    await test.step('Verify user found in results', async () => {
      await accountPage.assertUserFound('testuser01');
    });
  });

  test('should toggle system access ON', async () => {
    await test.step('Search for target user', async () => {
      await accountPage.searchUser('testuser01');
    });

    await test.step('Toggle switch to active', async () => {
      const isActive = await accountPage.getSystemAccessStatus();
      if (!isActive) {
        await accountPage.toggleSystemAccess();
      }
    });

    await test.step('Verify success notification', async () => {
      await accountPage.assertSuccessNotification();
    });

    await test.step('Verify switch is now active', async () => {
      await accountPage.assertSwitchActive();
    });
  });

  test('should toggle system access OFF', async () => {
    await test.step('Search for target user', async () => {
      await accountPage.searchUser('testuser01');
    });

    await test.step('Toggle switch to inactive', async () => {
      const isActive = await accountPage.getSystemAccessStatus();
      if (isActive) {
        await accountPage.toggleSystemAccess();
      }
    });

    await test.step('Verify switch is now inactive', async () => {
      await accountPage.assertSwitchInactive();
    });
  });
});
