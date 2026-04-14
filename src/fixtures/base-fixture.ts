import { test as base, expect } from '@playwright/test';
import { BasePage } from '../core/base-page';

/**
 * Custom test fixtures for VIB Test Studio
 * Extends Playwright's base test with common setup
 */

// Define custom fixture types
type VIBFixtures = {
  basePage: BasePage;
  authenticatedPage: BasePage;
};

/**
 * Extended test with VIB-specific fixtures
 */
export const test = base.extend<VIBFixtures>({
  // BasePage fixture - available in every test
  basePage: async ({ page }, use) => {
    const basePage = new BasePage(page);
    await use(basePage);
  },

  // Authenticated page - loads auth state before test
  authenticatedPage: async ({ browser }, use) => {
    const context = await browser.newContext({
      storageState: './auth.json',
    });
    const page = await context.newPage();
    const basePage = new BasePage(page);
    await use(basePage);
    await context.close();
  },
});

export { expect };
