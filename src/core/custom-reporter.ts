import type {
  Reporter,
  FullConfig,
  Suite,
  TestCase,
  TestResult,
  FullResult,
} from '@playwright/test/reporter';
import * as fs from 'fs';
import * as path from 'path';

interface TestRecord {
  title: string;
  suite: string;
  status: string;
  duration: number;
  error?: string;
  retry: number;
  steps: { title: string; duration: number; error?: string }[];
}

/**
 * VIB Custom HTML Reporter
 * Generates a clean, branded HTML report with:
 * - Summary dashboard (pass/fail/skip counts)
 * - Detailed test results with steps
 * - Duration tracking
 * - Error details with stack traces
 * - Filter by status
 */
class VIBReporter implements Reporter {
  private results: TestRecord[] = [];
  private startTime = 0;
  private outputDir: string;

  constructor(options?: { outputDir?: string }) {
    this.outputDir = options?.outputDir || './reports';
  }

  onBegin(config: FullConfig, suite: Suite) {
    this.startTime = Date.now();
    console.log(`\n🚀 VIB Test Studio - Starting ${suite.allTests().length} test(s)\n`);
  }

  onTestEnd(test: TestCase, result: TestResult) {
    const status = result.status;
    const icon = status === 'passed' ? '✅' : status === 'failed' ? '❌' : '⏭️';
    console.log(`${icon} ${test.title} (${result.duration}ms)`);

    this.results.push({
      title: test.title,
      suite: test.parent?.title || 'Default',
      status,
      duration: result.duration,
      error: result.error?.message,
      retry: result.retry,
      steps: result.steps.map((s) => ({
        title: s.title,
        duration: s.duration,
        error: s.error?.message,
      })),
    });
  }

  async onEnd(result: FullResult) {
    const totalDuration = Date.now() - this.startTime;

    // Deduplicate: keep only the last attempt (highest retry) per test
    const lastAttempt = new Map<string, TestRecord>();
    for (const r of this.results) {
      const key = r.suite + '::' + r.title;
      const existing = lastAttempt.get(key);
      if (!existing || r.retry > existing.retry) {
        lastAttempt.set(key, r);
      }
    }
    this.results = Array.from(lastAttempt.values());

    const passed = this.results.filter((r) => r.status === 'passed').length;
    const failed = this.results.filter((r) => r.status === 'failed').length;
    const skipped = this.results.filter((r) => r.status === 'skipped').length;

    console.log(`\n${'─'.repeat(50)}`);
    console.log(`📊 Results: ${passed} passed | ${failed} failed | ${skipped} skipped`);
    console.log(`⏱️  Duration: ${(totalDuration / 1000).toFixed(1)}s`);
    console.log(`${'─'.repeat(50)}\n`);

    // Generate HTML report
    this.generateHTMLReport(passed, failed, skipped, totalDuration);
    // Generate JSON report
    this.generateJSONReport(passed, failed, skipped, totalDuration);
  }

  private generateHTMLReport(
    passed: number,
    failed: number,
    skipped: number,
    totalDuration: number
  ) {
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }

    const total = passed + failed + skipped;
    const passRate = total > 0 ? ((passed / total) * 100).toFixed(1) : '0';
    const timestamp = new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });

    const html = `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>VIB Test Report - ${timestamp}</title>
  <style>
    :root {
      --vib-primary: #1a3c6e;
      --vib-accent: #e31937;
      --vib-success: #10b981;
      --vib-fail: #ef4444;
      --vib-skip: #f59e0b;
      --vib-bg: #f8fafc;
      --vib-card: #ffffff;
      --vib-text: #1e293b;
      --vib-muted: #64748b;
      --vib-border: #e2e8f0;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
      background: var(--vib-bg);
      color: var(--vib-text);
      line-height: 1.6;
    }
    .header {
      background: linear-gradient(135deg, var(--vib-primary), #2563eb);
      color: white;
      padding: 2rem;
      text-align: center;
    }
    .header h1 { font-size: 1.8rem; font-weight: 700; margin-bottom: 0.25rem; }
    .header p { opacity: 0.85; font-size: 0.9rem; }
    .container { max-width: 1200px; margin: 0 auto; padding: 1.5rem; }

    /* Summary Cards */
    .summary {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 1rem;
      margin: -2rem 0 1.5rem;
      position: relative;
      z-index: 1;
    }
    .card {
      background: var(--vib-card);
      border-radius: 12px;
      padding: 1.25rem;
      text-align: center;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
      border-top: 3px solid var(--vib-border);
    }
    .card.passed { border-top-color: var(--vib-success); }
    .card.failed { border-top-color: var(--vib-fail); }
    .card.skipped { border-top-color: var(--vib-skip); }
    .card.total { border-top-color: var(--vib-primary); }
    .card .number { font-size: 2.5rem; font-weight: 800; }
    .card .label { font-size: 0.8rem; color: var(--vib-muted); text-transform: uppercase; letter-spacing: 0.05em; }
    .card.passed .number { color: var(--vib-success); }
    .card.failed .number { color: var(--vib-fail); }
    .card.skipped .number { color: var(--vib-skip); }
    .card.total .number { color: var(--vib-primary); }

    /* Progress Bar */
    .progress-bar {
      width: 100%;
      height: 8px;
      background: var(--vib-border);
      border-radius: 4px;
      overflow: hidden;
      margin-bottom: 1.5rem;
    }
    .progress-bar .fill-passed { background: var(--vib-success); height: 100%; float: left; }
    .progress-bar .fill-failed { background: var(--vib-fail); height: 100%; float: left; }
    .progress-bar .fill-skipped { background: var(--vib-skip); height: 100%; float: left; }

    /* Filters */
    .filters {
      display: flex;
      gap: 0.5rem;
      margin-bottom: 1rem;
      flex-wrap: wrap;
    }
    .filter-btn {
      padding: 0.4rem 1rem;
      border: 1px solid var(--vib-border);
      border-radius: 20px;
      background: var(--vib-card);
      cursor: pointer;
      font-size: 0.85rem;
      transition: all 0.2s;
    }
    .filter-btn:hover, .filter-btn.active {
      background: var(--vib-primary);
      color: white;
      border-color: var(--vib-primary);
    }

    /* Test Results Table */
    .results-table {
      background: var(--vib-card);
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    .test-row {
      padding: 1rem 1.25rem;
      border-bottom: 1px solid var(--vib-border);
      cursor: pointer;
      transition: background 0.2s;
    }
    .test-row:hover { background: #f1f5f9; }
    .test-row:last-child { border-bottom: none; }
    .test-row .test-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .test-row .test-title { font-weight: 600; font-size: 0.95rem; }
    .test-row .test-meta {
      display: flex;
      gap: 1rem;
      align-items: center;
      font-size: 0.8rem;
      color: var(--vib-muted);
    }
    .status-badge {
      padding: 0.2rem 0.6rem;
      border-radius: 4px;
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
    }
    .status-badge.passed { background: #d1fae5; color: #065f46; }
    .status-badge.failed { background: #fee2e2; color: #991b1b; }
    .status-badge.skipped { background: #fef3c7; color: #92400e; }

    /* Steps detail */
    .steps-detail {
      display: none;
      padding: 0.75rem 1.25rem;
      background: #f8fafc;
      border-top: 1px solid var(--vib-border);
    }
    .steps-detail.open { display: block; }
    .step-item {
      display: flex;
      justify-content: space-between;
      padding: 0.35rem 0;
      font-size: 0.85rem;
      border-bottom: 1px dashed var(--vib-border);
    }
    .step-item:last-child { border-bottom: none; }
    .step-icon { margin-right: 0.5rem; }
    .error-box {
      background: #fef2f2;
      border: 1px solid #fecaca;
      border-radius: 6px;
      padding: 0.75rem;
      margin-top: 0.5rem;
      font-family: 'Consolas', monospace;
      font-size: 0.8rem;
      color: #991b1b;
      white-space: pre-wrap;
      word-break: break-all;
    }

    .footer {
      text-align: center;
      padding: 2rem;
      color: var(--vib-muted);
      font-size: 0.8rem;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>🏦 VIB Test Studio Report</h1>
    <p>${timestamp} • Duration: ${(totalDuration / 1000).toFixed(1)}s • Pass Rate: ${passRate}%</p>
  </div>

  <div class="container">
    <div class="summary">
      <div class="card total">
        <div class="number">${total}</div>
        <div class="label">Total Tests</div>
      </div>
      <div class="card passed">
        <div class="number">${passed}</div>
        <div class="label">Passed</div>
      </div>
      <div class="card failed">
        <div class="number">${failed}</div>
        <div class="label">Failed</div>
      </div>
      <div class="card skipped">
        <div class="number">${skipped}</div>
        <div class="label">Skipped</div>
      </div>
    </div>

    <div class="progress-bar">
      <div class="fill-passed" style="width: ${total > 0 ? (passed / total) * 100 : 0}%"></div>
      <div class="fill-failed" style="width: ${total > 0 ? (failed / total) * 100 : 0}%"></div>
      <div class="fill-skipped" style="width: ${total > 0 ? (skipped / total) * 100 : 0}%"></div>
    </div>

    <div class="filters">
      <button class="filter-btn active" onclick="filterTests('all')">All (${total})</button>
      <button class="filter-btn" onclick="filterTests('passed')">✅ Passed (${passed})</button>
      <button class="filter-btn" onclick="filterTests('failed')">❌ Failed (${failed})</button>
      <button class="filter-btn" onclick="filterTests('skipped')">⏭️ Skipped (${skipped})</button>
    </div>

    <div class="results-table" id="results">
      ${this.results
        .map(
          (r, i) => `
      <div class="test-row" data-status="${r.status}" onclick="toggleSteps(${i})">
        <div class="test-header">
          <div class="test-title">${this.escapeHtml(r.title)}</div>
          <div class="test-meta">
            <span>${r.duration}ms</span>
            <span class="status-badge ${r.status}">${r.status}</span>
          </div>
        </div>
      </div>
      <div class="steps-detail" id="steps-${i}">
        <div style="font-size:0.8rem;color:var(--vib-muted);margin-bottom:0.5rem;">
          Suite: ${this.escapeHtml(r.suite)} ${r.retry > 0 ? `• Retry #${r.retry}` : ''}
        </div>
        ${r.steps
          .map(
            (s) => `
        <div class="step-item">
          <span><span class="step-icon">${s.error ? '❌' : '✅'}</span>${this.escapeHtml(s.title)}</span>
          <span>${s.duration}ms</span>
        </div>`
          )
          .join('')}
        ${r.error ? `<div class="error-box">${this.escapeHtml(r.error)}</div>` : ''}
      </div>`
        )
        .join('')}
    </div>
  </div>

  <div class="footer">
    VIB Test Studio • Generated by Playwright Custom Reporter
  </div>

  <script>
    function toggleSteps(index) {
      const el = document.getElementById('steps-' + index);
      el.classList.toggle('open');
    }

    function filterTests(status) {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      event.target.classList.add('active');

      document.querySelectorAll('.test-row').forEach(row => {
        const next = row.nextElementSibling;
        if (status === 'all' || row.dataset.status === status) {
          row.style.display = '';
          if (next?.classList.contains('steps-detail')) next.style.display = '';
        } else {
          row.style.display = 'none';
          if (next?.classList.contains('steps-detail')) next.style.display = 'none';
        }
      });
    }
  </script>
</body>
</html>`;

    const reportPath = path.join(this.outputDir, 'vib-report.html');
    fs.writeFileSync(reportPath, html, 'utf-8');
    console.log(`📊 HTML Report: ${reportPath}`);
  }

  private generateJSONReport(
    passed: number,
    failed: number,
    skipped: number,
    totalDuration: number
  ) {
    const report = {
      timestamp: new Date().toISOString(),
      duration: totalDuration,
      summary: { total: this.results.length, passed, failed, skipped },
      results: this.results,
    };

    const reportPath = path.join(this.outputDir, 'vib-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf-8');
    console.log(`📊 JSON Report: ${reportPath}`);
  }

  private escapeHtml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
}

export default VIBReporter;
