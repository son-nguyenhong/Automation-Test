import * as fs from 'fs';
import * as path from 'path';
import { RecordedTestCase, TestStep, ActionType } from '../types';

/**
 * StepRecorder - Parses Playwright codegen output into structured JSON
 * 
 * Flow:
 * 1. User runs `npx playwright codegen <url>` → records actions
 * 2. Codegen outputs TypeScript code
 * 3. StepRecorder parses that code → JSON steps
 * 4. JSON saved to /steps/<name>.json
 */
export class StepRecorder {
  private stepsDir: string;

  constructor(stepsDir = './steps') {
    this.stepsDir = stepsDir;
    if (!fs.existsSync(stepsDir)) {
      fs.mkdirSync(stepsDir, { recursive: true });
    }
  }

  /**
   * Parse raw Playwright codegen output (TypeScript) into TestSteps
   */
  parseCodegenOutput(codegenCode: string): TestStep[] {
    const lines = codegenCode
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith('//') && !l.startsWith('import') && !l.startsWith('const'));

    const steps: TestStep[] = [];
    let stepIndex = 0;

    for (const line of lines) {
      const step = this.parseLine(line, stepIndex);
      if (step) {
        steps.push(step);
        stepIndex++;
      }
    }

    return steps;
  }

  /**
   * Parse a single line of codegen output
   */
  private parseLine(line: string, index: number): TestStep | null {
    // page.goto('url')
    const gotoMatch = line.match(/page\.goto\(['"](.*?)['"]\)/);
    if (gotoMatch) {
      return {
        id: `step_${index}`,
        action: 'navigate',
        value: gotoMatch[1],
        description: `Navigate to ${gotoMatch[1]}`,
      };
    }

    // page.locator('selector').click()
    const clickMatch = line.match(/(?:page\.)?(?:locator|getByRole|getByText|getByLabel|getByPlaceholder|getByTestId)\((.*?)\)\.click\(/);
    if (clickMatch) {
      const selector = this.extractSelector(line);
      return {
        id: `step_${index}`,
        action: 'click',
        selector,
        description: `Click on ${selector}`,
      };
    }

    // page.locator('selector').fill('value')
    const fillMatch = line.match(/\.fill\(['"](.*?)['"]\)/);
    if (fillMatch) {
      const selector = this.extractSelector(line);
      return {
        id: `step_${index}`,
        action: 'fill',
        selector,
        value: fillMatch[1],
        description: `Fill "${fillMatch[1]}" into ${selector}`,
      };
    }

    // page.locator('selector').selectOption('value')
    const selectMatch = line.match(/\.selectOption\(['"](.*?)['"]\)/);
    if (selectMatch) {
      const selector = this.extractSelector(line);
      return {
        id: `step_${index}`,
        action: 'select',
        selector,
        value: selectMatch[1],
        description: `Select "${selectMatch[1]}" in ${selector}`,
      };
    }

    // page.locator('selector').check()
    if (line.includes('.check()')) {
      const selector = this.extractSelector(line);
      return {
        id: `step_${index}`,
        action: 'check',
        selector,
        description: `Check ${selector}`,
      };
    }

    // page.locator('selector').uncheck()
    if (line.includes('.uncheck()')) {
      const selector = this.extractSelector(line);
      return {
        id: `step_${index}`,
        action: 'uncheck',
        selector,
        description: `Uncheck ${selector}`,
      };
    }

    // page.locator('selector').hover()
    if (line.includes('.hover()')) {
      const selector = this.extractSelector(line);
      return {
        id: `step_${index}`,
        action: 'hover',
        selector,
        description: `Hover over ${selector}`,
      };
    }

    // page.locator('selector').press('key')
    const pressMatch = line.match(/\.press\(['"](.*?)['"]\)/);
    if (pressMatch) {
      const selector = this.extractSelector(line);
      return {
        id: `step_${index}`,
        action: 'press',
        selector,
        value: pressMatch[1],
        description: `Press "${pressMatch[1]}" on ${selector}`,
      };
    }

    // page.locator('selector').setInputFiles('path')
    const uploadMatch = line.match(/\.setInputFiles\(['"](.*?)['"]\)/);
    if (uploadMatch) {
      const selector = this.extractSelector(line);
      return {
        id: `step_${index}`,
        action: 'upload',
        selector,
        value: uploadMatch[1],
        description: `Upload file "${uploadMatch[1]}" to ${selector}`,
      };
    }

    // expect assertions
    if (line.includes('expect(')) {
      return this.parseExpectLine(line, index);
    }

    // page.waitForTimeout
    const waitMatch = line.match(/waitForTimeout\((\d+)\)/);
    if (waitMatch) {
      return {
        id: `step_${index}`,
        action: 'wait',
        value: waitMatch[1],
        description: `Wait ${waitMatch[1]}ms`,
        timeout: parseInt(waitMatch[1]),
      };
    }

    return null;
  }

  /**
   * Extract selector string from a codegen line
   */
  private extractSelector(line: string): string {
    // getByRole('button', { name: 'Submit' })
    const getByRoleMatch = line.match(/getByRole\(['"](.*?)['"],\s*\{.*?name:\s*['"](.*?)['"]/);
    if (getByRoleMatch) return `role=${getByRoleMatch[1]}[name="${getByRoleMatch[2]}"]`;

    // getByRole('button')
    const getByRoleSimple = line.match(/getByRole\(['"](.*?)['"]\)/);
    if (getByRoleSimple) return `role=${getByRoleSimple[1]}`;

    // getByText('text')
    const getByTextMatch = line.match(/getByText\(['"](.*?)['"]\)/);
    if (getByTextMatch) return `text="${getByTextMatch[1]}"`;

    // getByLabel('label')
    const getByLabelMatch = line.match(/getByLabel\(['"](.*?)['"]\)/);
    if (getByLabelMatch) return `label="${getByLabelMatch[1]}"`;

    // getByPlaceholder('placeholder')
    const getByPlaceholderMatch = line.match(/getByPlaceholder\(['"](.*?)['"]\)/);
    if (getByPlaceholderMatch) return `placeholder="${getByPlaceholderMatch[1]}"`;

    // getByTestId('testid')
    const getByTestIdMatch = line.match(/getByTestId\(['"](.*?)['"]\)/);
    if (getByTestIdMatch) return `data-testid="${getByTestIdMatch[1]}"`;

    // locator('css-selector')
    const locatorMatch = line.match(/locator\(['"](.*?)['"]\)/);
    if (locatorMatch) return locatorMatch[1];

    return 'unknown';
  }

  /**
   * Parse expect() assertion lines
   */
  private parseExpectLine(line: string, index: number): TestStep | null {
    // toBeVisible
    if (line.includes('toBeVisible')) {
      const selector = this.extractSelector(line);
      return {
        id: `step_${index}`,
        action: 'assert_visible',
        selector,
        description: `Assert ${selector} is visible`,
      };
    }

    // toContainText / toHaveText
    const textMatch = line.match(/to(?:Contain|Have)Text\(['"](.*?)['"]\)/);
    if (textMatch) {
      const selector = this.extractSelector(line);
      return {
        id: `step_${index}`,
        action: 'assert_text',
        selector,
        expected: textMatch[1],
        description: `Assert ${selector} contains "${textMatch[1]}"`,
      };
    }

    // toHaveURL
    const urlMatch = line.match(/toHaveURL\(['"](.*?)['"]\)/);
    if (urlMatch) {
      return {
        id: `step_${index}`,
        action: 'assert_url',
        expected: urlMatch[1],
        description: `Assert URL is "${urlMatch[1]}"`,
      };
    }

    return null;
  }

  /**
   * Save recorded steps as JSON
   */
  saveTestCase(
    name: string,
    steps: TestStep[],
    options: { description?: string; baseUrl?: string; tags?: string[] } = {}
  ): string {
    const id = `tc_${Date.now()}`;
    const testCase: RecordedTestCase = {
      id,
      name,
      description: options.description || `Test case: ${name}`,
      baseUrl: options.baseUrl || '',
      tags: options.tags || [],
      steps,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const filePath = path.join(this.stepsDir, `${this.slugify(name)}.json`);
    fs.writeFileSync(filePath, JSON.stringify(testCase, null, 2), 'utf-8');
    console.log(`✅ Test case saved: ${filePath}`);
    return filePath;
  }

  /**
   * Load a recorded test case from JSON
   */
  loadTestCase(filePath: string): RecordedTestCase {
    const raw = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(raw) as RecordedTestCase;
  }

  /**
   * List all recorded test cases
   */
  listTestCases(): { name: string; path: string; testCase: RecordedTestCase }[] {
    if (!fs.existsSync(this.stepsDir)) return [];
    const files = fs.readdirSync(this.stepsDir).filter((f) => f.endsWith('.json'));
    return files.map((f) => {
      const fullPath = path.join(this.stepsDir, f);
      const testCase = this.loadTestCase(fullPath);
      return { name: f.replace('.json', ''), path: fullPath, testCase };
    });
  }

  /**
   * Create steps manually (without codegen)
   */
  createManualStep(
    action: ActionType,
    options: { selector?: string; value?: string; description?: string; expected?: string; timeout?: number }
  ): TestStep {
    return {
      id: `step_${Date.now()}`,
      action,
      selector: options.selector,
      value: options.value,
      description: options.description || `${action} ${options.selector || ''}`,
      expected: options.expected,
      timeout: options.timeout,
    };
  }

  private slugify(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }
}
