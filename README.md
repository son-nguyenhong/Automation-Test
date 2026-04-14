# 🏦 VIB Test Studio - Automation Test Framework

Hệ thống automation test hoàn chỉnh dựa trên **Playwright + TypeScript**, thiết kế cho VIB OPS Portal.

## 🏗️ Architecture

```
AutomationTest_TS/
├── src/
│   ├── core/
│   │   ├── base-page.ts          # Base Page Object (Ant Design + MUI helpers)
│   │   ├── step-recorder.ts      # Parse codegen output → JSON steps
│   │   ├── test-generator.ts     # JSON steps → .spec.ts test files
│   │   └── custom-reporter.ts    # VIB branded HTML reporter
│   ├── pages/                    # Page Object Model
│   │   ├── account-management.page.ts
│   │   └── traveldesk.page.ts
│   ├── fixtures/
│   │   └── base-fixture.ts       # Custom test fixtures (auth, basePage)
│   └── types/
│       └── index.ts              # TypeScript type definitions
├── steps/                        # Recorded test steps (JSON)
│   ├── account-management-toggle.json
│   └── traveldesk-create-request.json
├── tests/                        # Test files
│   ├── generated/                # Auto-generated from /steps
│   ├── account-management.spec.ts  # Manual POM tests
│   ├── traveldesk.spec.ts
│   └── demo.spec.ts              # Demo test (playwright.dev)
├── scripts/
│   ├── record.ts                 # CLI: Record test steps
│   ├── generate.ts               # CLI: Generate .spec.ts from steps
│   └── run-suite.ts              # CLI: Run with options
├── reports/                      # Test reports (auto-generated)
├── playwright.config.ts
├── package.json
└── tsconfig.json
```

## 🚀 Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Install Playwright browsers
npx playwright install

# 3. Run demo test to verify setup
npx playwright test tests/demo.spec.ts --headed
```

## 📋 Workflow: Record → Generate → Test → Report

### Step 1: Record test steps

```bash
npm run record
```

3 recording methods:
- **[1] Playwright Codegen** - Mở browser, tương tác → tự động capture steps
- **[2] Paste codegen output** - Copy/paste code từ codegen đã chạy trước
- **[3] Interactive** - Tạo steps thủ công qua CLI

Output: JSON file trong `/steps/`

### Step 2: Generate test files

```bash
npm run generate                    # Generate tất cả
npm run generate -- --screenshots   # Kèm screenshot mỗi step
```

Output: `.spec.ts` files trong `/tests/generated/`

### Step 3: Run tests

```bash
npm test                           # Run tất cả tests
npm run test:headed                # Có browser UI
npm run test:ui                    # Playwright UI mode
npm run test:debug                 # Debug mode

# Filter
npx playwright test --grep @smoke           # Chạy tag @smoke
npx playwright test --grep "Account"        # Chạy theo tên
npx playwright test --project chromium      # Chỉ Chromium
```

### Step 4: View reports

```bash
npm run report                     # Mở Playwright HTML report
# Hoặc mở trực tiếp: reports/vib-report.html
```

## 🔧 Customization

### Thêm Page Object mới

```typescript
// src/pages/my-module.page.ts
import { Page } from '@playwright/test';
import { BasePage } from '../core/base-page';

export class MyModulePage extends BasePage {
  private readonly myButton = 'button:has-text("Click me")';

  constructor(page: Page) {
    super(page);
  }

  async doSomething() {
    await this.click(this.myButton);
  }
}
```

### Thêm test thủ công

```typescript
// tests/my-module.spec.ts
import { test, expect } from '../src/fixtures/base-fixture';
import { MyModulePage } from '../src/pages/my-module.page';

test.describe('My Module', () => {
  test('should do something', async ({ page }) => {
    const myPage = new MyModulePage(page);
    await myPage.goto('/my-module');
    await myPage.doSomething();
  });
});
```

### Edit JSON steps trực tiếp

Mở file trong `/steps/`, sửa steps:

```json
{
  "id": "step_5",
  "action": "click",
  "selector": "button[role='switch']",
  "description": "Toggle system access switch"
}
```

Supported actions: `navigate`, `click`, `fill`, `select`, `check`, `uncheck`, `hover`, `press`, `upload`, `wait`, `assert_visible`, `assert_text`, `assert_value`, `assert_url`, `screenshot`, `custom`

### Dùng auth SSO

```bash
# Lưu auth state 1 lần
npx playwright codegen --save-storage=auth.json https://ops-aad.ehr-test.vib

# Chạy tests với auth
npx playwright test --project chrome-auth
```

## 📊 Reports

- **VIB Custom Report**: `reports/vib-report.html` - Dashboard với pass/fail/skip, filter, step details
- **Playwright HTML Report**: `reports/html/index.html` - Built-in report với trace viewer
- **JSON Report**: `reports/vib-report.json` - Machine-readable cho CI/CD

## 🏷️ Tags

Dùng tags để tổ chức và filter tests:

```bash
npx playwright test --grep @smoke        # Smoke tests
npx playwright test --grep @regression   # Regression tests
npx playwright test --grep @account-mgmt # Account Management
npx playwright test --grep @traveldesk   # Travel Desk
```

## ⚙️ Environment Variables

```bash
BASE_URL=https://ops-aad.ehr-test.vib npm test   # Custom base URL
CI=true npm test                                   # CI mode (retries, single worker)
```

## 🔗 CI/CD

GitHub Actions tự động chạy tests khi push/PR vào `main`. Report được upload dưới dạng artifact.

Manual trigger: Actions tab → "VIB Automation Tests" → Run workflow → nhập filter nếu cần.
