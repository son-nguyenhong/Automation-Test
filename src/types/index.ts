// ============================================================
// VIB Test Studio - Type Definitions
// ============================================================

/** Supported action types that can be recorded/replayed */
export type ActionType =
  | 'navigate'
  | 'click'
  | 'fill'
  | 'select'
  | 'check'
  | 'uncheck'
  | 'hover'
  | 'press'
  | 'upload'
  | 'screenshot'
  | 'wait'
  | 'assert_visible'
  | 'assert_text'
  | 'assert_value'
  | 'assert_url'
  | 'custom';

/** A single test step */
export interface TestStep {
  id: string;
  action: ActionType;
  selector?: string;
  value?: string;
  description: string;
  timeout?: number;
  /** Optional: screenshot after this step */
  screenshot?: boolean;
  /** Optional: custom code to execute */
  customCode?: string;
  /** Optional: assertion expected value */
  expected?: string;
}

/** A recorded test case (JSON format stored in /steps) */
export interface RecordedTestCase {
  id: string;
  name: string;
  description: string;
  baseUrl: string;
  tags: string[];
  steps: TestStep[];
  createdAt: string;
  updatedAt: string;
}

/** Test suite grouping multiple test cases */
export interface TestSuite {
  id: string;
  name: string;
  description: string;
  testCaseIds: string[];
  tags: string[];
  createdAt: string;
}

/** Result of a single step execution */
export interface StepResult {
  stepId: string;
  status: 'passed' | 'failed' | 'skipped';
  duration: number;
  error?: string;
  screenshotPath?: string;
}

/** Result of a full test case execution */
export interface TestCaseResult {
  testCaseId: string;
  testCaseName: string;
  status: 'passed' | 'failed' | 'skipped';
  duration: number;
  steps: StepResult[];
  startTime: string;
  endTime: string;
}

/** Full report for a test run */
export interface TestReport {
  suiteId?: string;
  suiteName?: string;
  results: TestCaseResult[];
  totalPassed: number;
  totalFailed: number;
  totalSkipped: number;
  totalDuration: number;
  timestamp: string;
  environment: {
    browser: string;
    baseUrl: string;
    os: string;
  };
}

/** Config for codegen recording session */
export interface RecordConfig {
  baseUrl: string;
  outputName: string;
  browser?: 'chromium' | 'firefox' | 'webkit';
  viewport?: { width: number; height: number };
  /** Use existing auth state */
  authFile?: string;
}

/** Config for test generation */
export interface GenerateConfig {
  stepFile: string;
  outputDir: string;
  /** Include Page Object Model */
  usePOM?: boolean;
  /** Add screenshot after each step */
  screenshotOnStep?: boolean;
  /** Add screenshot on failure */
  screenshotOnFailure?: boolean;
}
