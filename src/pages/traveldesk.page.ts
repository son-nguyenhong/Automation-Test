import { Page, expect } from '@playwright/test';
import { BasePage } from '../core/base-page';

/**
 * TravelDeskPage - Page Object for Travel Desk module
 * Target: ops-aad.ehr-test.vib/travel-desk
 */
export class TravelDeskPage extends BasePage {
  // ── Selectors ─────────────────────────────────────────
  private readonly createRequestBtn = 'button:has-text("Tạo yêu cầu")';
  private readonly reasonInput = 'input[placeholder*="lý do"], textarea[placeholder*="lý do"]';
  private readonly branchSelect = '.ant-select:has-text("Chọn chi nhánh")';
  private readonly submitBtn = 'button:has-text("Gửi yêu cầu")';
  private readonly successMessage = ':text("thành công")';
  private readonly requestTable = '.ant-table';
  private readonly requestRows = '.ant-table-row';

  constructor(page: Page) {
    super(page);
  }

  // ── Actions ───────────────────────────────────────────
  async navigateToPage() {
    await this.goto('/travel-desk');
    await this.waitForLoad();
  }

  async clickCreateRequest() {
    await this.click(this.createRequestBtn);
    await this.page.waitForTimeout(1500);
  }

  async fillTripReason(reason: string) {
    await this.fill(this.reasonInput, reason);
  }

  async selectBranch(branchName: string) {
    await this.click(this.branchSelect);
    await this.page.locator(`.ant-select-item-option:has-text("${branchName}")`).click();
  }

  async submitRequest() {
    await this.click(this.submitBtn);
  }

  async createBusinessTrip(reason: string, branch: string) {
    await this.clickCreateRequest();
    await this.fillTripReason(reason);
    await this.selectBranch(branch);
    await this.submitRequest();
  }

  async getRequestCount(): Promise<number> {
    return await this.page.locator(this.requestRows).count();
  }

  // ── Assertions ────────────────────────────────────────
  async assertPageLoaded() {
    await this.assertVisible(this.requestTable);
  }

  async assertSuccessMessage() {
    await this.assertVisible(this.successMessage);
  }

  async assertRequestExists(reason: string) {
    await expect(this.page.locator(this.requestTable)).toContainText(reason);
  }
}
