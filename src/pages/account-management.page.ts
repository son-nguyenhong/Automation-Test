import { Page, expect } from '@playwright/test';
import { BasePage } from '../core/base-page';

/**
 * AccountManagementPage - Page Object for Account Management module
 * Target: ops-aad.ehr-test.vib/account-management
 */
export class AccountManagementPage extends BasePage {
  // ── Selectors ─────────────────────────────────────────
  private readonly searchInput = 'input[placeholder*="Search"]';
  private readonly searchButton = 'button:has-text("Search")';
  private readonly systemSwitch = "button[role='switch']";
  private readonly successNotification = '.ant-notification-notice-success, :text("Success")';
  private readonly userTable = '.ant-table';
  private readonly userRows = '.ant-table-row';

  constructor(page: Page) {
    super(page);
  }

  // ── Actions ───────────────────────────────────────────
  async navigateToPage() {
    await this.goto('/account-management');
    await this.waitForLoad();
  }

  async searchUser(username: string) {
    await this.fill(this.searchInput, username);
    await this.click(this.searchButton);
    await this.page.waitForTimeout(2000);
  }

  async toggleSystemAccess(rowIndex = 0) {
    const switches = this.page.locator(this.userRows).nth(rowIndex).locator(this.systemSwitch);
    await switches.click();
  }

  async getSystemAccessStatus(rowIndex = 0): Promise<boolean> {
    const switchEl = this.page.locator(this.userRows).nth(rowIndex).locator(this.systemSwitch);
    const checked = await switchEl.getAttribute('aria-checked');
    return checked === 'true';
  }

  async getUserCount(): Promise<number> {
    return await this.page.locator(this.userRows).count();
  }

  // ── Assertions ────────────────────────────────────────
  async assertPageLoaded() {
    await this.assertVisible(this.userTable);
  }

  async assertSuccessNotification() {
    await this.assertVisible(this.successNotification);
  }

  async assertUserFound(username: string) {
    await expect(this.page.locator(this.userTable)).toContainText(username);
  }

  async assertSwitchActive(rowIndex = 0) {
    const status = await this.getSystemAccessStatus(rowIndex);
    expect(status).toBe(true);
  }

  async assertSwitchInactive(rowIndex = 0) {
    const status = await this.getSystemAccessStatus(rowIndex);
    expect(status).toBe(false);
  }
}
