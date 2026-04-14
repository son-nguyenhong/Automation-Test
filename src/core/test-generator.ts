import * as fs from 'fs';
import * as path from 'path';
import { RecordedTestCase, TestStep } from '../types';
import { StepRecorder } from './step-recorder';

/**
 * TestGenerator - Converts recorded JSON steps into executable .spec.ts files
 * 
 * Features:
 * - Generates proper Playwright test structure
 * - Optional POM (Page Object Model) usage
 * - Screenshot on each step or on failure
 * - Customizable before/after hooks
 * - Readable test descriptions
 */
export class TestGenerator {
  private stepsDir: string;
  private outputDir: string;

  constructor(stepsDir = './steps', outputDir = './tests/generated') {
    this.stepsDir = stepsDir;
    this.outputDir = outputDir;
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
  }

  /**
   * Generate .spec.ts from a recorded test case JSON
   */
  generateFromFile(
    jsonPath: string,
    options: {
      screenshotOnStep?: boolean;
      screenshotOnFailure?: boolean;
      timeout?: number;
    } = {}
  ): string {
    const recorder = new StepRecorder(this.stepsDir);
    const testCase = recorder.loadTestCase(jsonPath);
    return this.generateSpec(testCase, options);
  }

  /**
   * Generate all test cases from /steps directory
   */
  generateAll(options: { screenshotOnStep?: boolean; screenshotOnFailure?: boolean } = {}): string[] {
    const recorder = new StepRecorder(this.stepsDir);
    const testCases = recorder.listTestCases();
    const generated: string[] = [];

    for (const tc of testCases) {
      const outputPath = this.generateSpec(tc.testCase, options);
      generated.push(outputPath);
    }

    console.log(`\n✅ Generated ${generated.length} test file(s) in ${this.outputDir}`);
    return generated;
  }

  /**
   * Generate a .spec.ts file from a RecordedTestCase
   */
  generateSpec(
    testCase: RecordedTestCase,
    options: {
      screenshotOnStep?: boolean;
      screenshotOnFailure?: boolean;
      timeout?: number;
    } = {}
  ): string {
    const fileName = this.slugify(testCase.name) + '.spec.ts';
    const filePath = path.join(this.outputDir, fileName);
    const code = this.buildSpecCode(testCase, options);

    fs.writeFileSync(filePath, code, 'utf-8');
    console.log(`📄 Generated: ${filePath}`);
    return filePath;
  }

  /**
   * Build the TypeScript spec file content
   */
  private buildSpecCode(
    testCase: RecordedTestCase,
    options: {
      screenshotOnStep?: boolean;
      screenshotOnFailure?: boolean;
      timeout?: number;
    }
  ): string {
    const timeout = options.timeout ?? 30000;
    const steps = testCase.steps;

    let code = `import { test, expect } from '@playwright/test';

/**
 * ${testCase.name}
 * ${testCase.description}
 * 
 * Tags: ${testCase.tags.length > 0 ? testCase.tags.map((t) => `@${t}`).join(' ') : 'none'}
 * Generated: ${new Date().toISOString()}
 * Source: steps/${this.slugify(testCase.name)}.json
 */
test.describe('${this.escapeString(testCase.name)}', () => {
  test.setTimeout(${timeout});
`;

    // beforeEach hook
    if (testCase.baseUrl) {
      code += `
  test.beforeEach(async ({ page }) => {
    await page.goto('${testCase.baseUrl}');
    await page.waitForLoadState('domcontentloaded');
  });
`;
    }

    // afterEach hook for screenshot on failure
    if (options.screenshotOnFailure) {
      code += `
  test.afterEach(async ({ page }, testInfo) => {
    if (testInfo.status !== testInfo.expectedStatus) {
      const screenshotPath = \`reports/screenshots/\${testInfo.title}-failure-\${Date.now()}.png\`;
      await page.screenshot({ path: screenshotPath, fullPage: true });
      testInfo.attachments.push({
        name: 'failure-screenshot',
        path: screenshotPath,
        contentType: 'image/png',
      });
    }
  });
`;
    }

    // Main test
    code += `
  test('${this.escapeString(testCase.description)}', async ({ page }) => {
`;

    // Generate step code
    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      code += this.generateStepCode(step, i, options.screenshotOnStep);
    }

    code += `  });
`;

    // Generate individual step tests (granular)
    code += `
  // ── Individual Step Tests (for debugging) ──────────────
`;
    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      code += `
  test.skip('Step ${i + 1}: ${this.escapeString(step.description)}', async ({ page }) => {
${this.generateStepCode(step, i, false, '    ')}  });
`;
    }

    code += `});
`;

    return code;
  }

  /**
   * Generate code for a single step
   */
  private generateStepCode(
    step: TestStep,
    index: number,
    screenshotOnStep?: boolean,
    indent = '    '
  ): string {
    let code = `${indent}// Step ${index + 1}: ${step.description}\n`;
    code += `${indent}await test.step('${this.escapeString(step.description)}', async () => {\n`;

    switch (step.action) {
      case 'navigate':
        code += `${indent}  await page.goto('${step.value}');\n`;
        code += `${indent}  await page.waitForLoadState('domcontentloaded');\n`;
        break;

      case 'click':
        code += `${indent}  await page.${this.buildLocator(step.selector!)}.click();\n`;
        break;

      case 'fill':
        code += `${indent}  await page.${this.buildLocator(step.selector!)}.click();\n`;
        code += `${indent}  await page.${this.buildLocator(step.selector!)}.fill('${this.escapeString(step.value!)}');\n`;
        break;

      case 'select':
        code += `${indent}  await page.${this.buildLocator(step.selector!)}.selectOption('${this.escapeString(step.value!)}');\n`;
        break;

      case 'check':
        code += `${indent}  await page.${this.buildLocator(step.selector!)}.check();\n`;
        break;

      case 'uncheck':
        code += `${indent}  await page.${this.buildLocator(step.selector!)}.uncheck();\n`;
        break;

      case 'hover':
        code += `${indent}  await page.${this.buildLocator(step.selector!)}.hover();\n`;
        break;

      case 'press':
        code += `${indent}  await page.${this.buildLocator(step.selector!)}.press('${step.value}');\n`;
        break;

      case 'upload':
        code += `${indent}  await page.${this.buildLocator(step.selector!)}.setInputFiles('${step.value}');\n`;
        break;

      case 'wait':
        code += `${indent}  await page.waitForTimeout(${step.timeout || step.value || 1000});\n`;
        break;

      case 'assert_visible':
        code += `${indent}  await expect(page.${this.buildLocator(step.selector!)}).toBeVisible();\n`;
        break;

      case 'assert_text':
        code += `${indent}  await expect(page.${this.buildLocator(step.selector!)}).toContainText('${this.escapeString(step.expected!)}');\n`;
        break;

      case 'assert_value':
        code += `${indent}  await expect(page.${this.buildLocator(step.selector!)}).toHaveValue('${this.escapeString(step.expected!)}');\n`;
        break;

      case 'assert_url':
        code += `${indent}  await expect(page).toHaveURL('${this.escapeString(step.expected!)}');\n`;
        break;

      case 'screenshot':
        code += `${indent}  await page.screenshot({ path: 'reports/screenshots/step-${index + 1}.png', fullPage: true });\n`;
        break;

      case 'custom':
        if (step.customCode) {
          code += step.customCode
            .split('\n')
            .map((l) => `${indent}  ${l}`)
            .join('\n') + '\n';
        }
        break;
    }

    if (screenshotOnStep) {
      code += `${indent}  await page.screenshot({ path: 'reports/screenshots/${this.slugify(step.description)}-${index}.png' });\n`;
    }

    code += `${indent}});\n\n`;
    return code;
  }

  /**
   * Build Playwright locator from our selector format
   */
  private buildLocator(selector: string): string {
    // role=button[name="Submit"]
    const roleMatch = selector.match(/^role=(\w+)\[name="(.*)"\]$/);
    if (roleMatch) return `getByRole('${roleMatch[1]}', { name: '${roleMatch[2]}' })`;

    // role=button
    const roleSimple = selector.match(/^role=(\w+)$/);
    if (roleSimple) return `getByRole('${roleSimple[1]}')`;

    // text="..."
    const textMatch = selector.match(/^text="(.*)"$/);
    if (textMatch) return `getByText('${textMatch[1]}')`;

    // label="..."
    const labelMatch = selector.match(/^label="(.*)"$/);
    if (labelMatch) return `getByLabel('${labelMatch[1]}')`;

    // placeholder="..."
    const placeholderMatch = selector.match(/^placeholder="(.*)"$/);
    if (placeholderMatch) return `getByPlaceholder('${placeholderMatch[1]}')`;

    // data-testid="..."
    const testIdMatch = selector.match(/^data-testid="(.*)"$/);
    if (testIdMatch) return `getByTestId('${testIdMatch[1]}')`;

    // CSS selector (default)
    return `locator('${selector}')`;
  }

  private escapeString(str: string): string {
    return str.replace(/'/g, "\\'").replace(/\n/g, '\\n');
  }

  private slugify(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }
}
