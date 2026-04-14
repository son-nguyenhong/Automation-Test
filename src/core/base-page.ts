import { Page, Locator, expect } from '@playwright/test';

/**
 * BasePage - Foundation class for all Page Objects
 * Provides common methods for page interactions
 */
export class BasePage {
  constructor(protected page: Page) {}

  // ── Navigation ──────────────────────────────────────────
  async goto(url: string) {
    await this.page.goto(url, { waitUntil: 'domcontentloaded' });
  }

  async waitForLoad() {
    await this.page.waitForLoadState('networkidle');
  }

  // ── Element Interactions ────────────────────────────────
  async click(selector: string, options?: { timeout?: number }) {
    await this.page.locator(selector).click({ timeout: options?.timeout ?? 10000 });
  }

  async fill(selector: string, value: string) {
    const el = this.page.locator(selector);
    await el.click();
    await el.fill(value);
  }

  async selectOption(selector: string, value: string) {
    await this.page.locator(selector).selectOption(value);
  }

  async check(selector: string) {
    await this.page.locator(selector).check();
  }

  async uncheck(selector: string) {
    await this.page.locator(selector).uncheck();
  }

  async hover(selector: string) {
    await this.page.locator(selector).hover();
  }

  async press(selector: string, key: string) {
    await this.page.locator(selector).press(key);
  }

  async upload(selector: string, filePath: string) {
    await this.page.locator(selector).setInputFiles(filePath);
  }

  // ── Waits ───────────────────────────────────────────────
  async waitForSelector(selector: string, timeout = 10000) {
    await this.page.locator(selector).waitFor({ state: 'visible', timeout });
  }

  async waitForUrl(urlPattern: string | RegExp, timeout = 15000) {
    await this.page.waitForURL(urlPattern, { timeout });
  }

  async delay(ms: number) {
    await this.page.waitForTimeout(ms);
  }

  // ── Assertions ──────────────────────────────────────────
  async assertVisible(selector: string) {
    await expect(this.page.locator(selector)).toBeVisible();
  }

  async assertText(selector: string, expected: string) {
    await expect(this.page.locator(selector)).toContainText(expected);
  }

  async assertValue(selector: string, expected: string) {
    await expect(this.page.locator(selector)).toHaveValue(expected);
  }

  async assertUrl(expected: string | RegExp) {
    await expect(this.page).toHaveURL(expected);
  }

  // ── Screenshots ─────────────────────────────────────────
  async screenshot(name: string) {
    await this.page.screenshot({
      path: `reports/screenshots/${name}.png`,
      fullPage: true,
    });
  }

  // ── Ant Design Helpers (VIB OPS Portal) ─────────────────
  /** Toggle Ant Design Switch */
  async toggleSwitch(selector = "button[role='switch']") {
    await this.page.locator(selector).click();
  }

  /** Check if Ant Design Switch is active */
  async isSwitchActive(selector = "button[role='switch']"): Promise<boolean> {
    const el = this.page.locator(selector);
    const checked = await el.getAttribute('aria-checked');
    return checked === 'true';
  }

  /** Click Ant Design button by text */
  async clickAntButton(text: string) {
    await this.page.locator(`button.ant-btn:has-text("${text}")`).click();
  }

  /** Fill Ant Design input by label */
  async fillAntInput(label: string, value: string) {
    await this.page
      .locator(`.ant-form-item:has(.ant-form-item-label:has-text("${label}")) input`)
      .fill(value);
  }

  /** Select Ant Design dropdown option */
  async selectAntOption(label: string, optionText: string) {
    await this.page
      .locator(`.ant-form-item:has(.ant-form-item-label:has-text("${label}")) .ant-select`)
      .click();
    await this.page.locator(`.ant-select-item-option:has-text("${optionText}")`).click();
  }

  // ── Material UI Helpers ─────────────────────────────────
  async clickMuiButton(text: string) {
    await this.page.locator(`button.MuiButton-root:has-text("${text}")`).click();
  }

  async fillMuiInput(label: string, value: string) {
    await this.page.locator(`label:has-text("${label}")`).locator('..').locator('input').fill(value);
  }
}
