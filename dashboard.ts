/**
 * VIB Test Studio - Dashboard Server
 * 
 * Run: npm run dashboard
 * Opens: http://localhost:3456
 */
import express from 'express';
import { execSync, exec, ChildProcess } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

const app = express();
const PORT = 3456;
const STEPS_DIR = path.resolve('./steps');
const TESTS_DIR = path.resolve('./tests');
const GENERATED_DIR = path.resolve('./tests/generated');
const REPORTS_DIR = path.resolve('./reports');

app.use(express.json());

// ── API: List recorded test cases ──────────────────────
app.get('/api/steps', (req, res) => {
  try {
    if (!fs.existsSync(STEPS_DIR)) return res.json([]);
    const files = fs.readdirSync(STEPS_DIR).filter(f => f.endsWith('.json'));
    const steps = files.map(f => {
      const content = JSON.parse(fs.readFileSync(path.join(STEPS_DIR, f), 'utf-8'));
      return { file: f, ...content };
    });
    res.json(steps);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ── API: Get single test case ──────────────────────────
app.get('/api/steps/:file', (req, res) => {
  try {
    const filePath = path.join(STEPS_DIR, req.params.file);
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Not found' });
    const content = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    res.json(content);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ── API: Save/update test case ─────────────────────────
app.post('/api/steps/:file', (req, res) => {
  try {
    if (!fs.existsSync(STEPS_DIR)) fs.mkdirSync(STEPS_DIR, { recursive: true });
    const filePath = path.join(STEPS_DIR, req.params.file);
    const data = { ...req.body, updatedAt: new Date().toISOString() };
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
    res.json({ success: true, file: req.params.file });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ── API: Create new test case ──────────────────────────
app.post('/api/steps', (req, res) => {
  try {
    if (!fs.existsSync(STEPS_DIR)) fs.mkdirSync(STEPS_DIR, { recursive: true });
    const name = req.body.name || 'new-test';
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const fileName = `${slug}.json`;
    const filePath = path.join(STEPS_DIR, fileName);
    const data = {
      id: `tc_${Date.now()}`,
      name: req.body.name || 'New Test Case',
      description: req.body.description || '',
      baseUrl: req.body.baseUrl || '',
      tags: req.body.tags || [],
      steps: req.body.steps || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
    res.json({ success: true, file: fileName });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ── API: Delete test case ──────────────────────────────
app.delete('/api/steps/:file', (req, res) => {
  try {
    const filePath = path.join(STEPS_DIR, req.params.file);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ── API: List generated test files ─────────────────────
app.get('/api/tests', (req, res) => {
  try {
    const allTests: { file: string; dir: string; content: string }[] = [];
    // Generated tests
    if (fs.existsSync(GENERATED_DIR)) {
      fs.readdirSync(GENERATED_DIR).filter(f => f.endsWith('.spec.ts')).forEach(f => {
        allTests.push({ file: f, dir: 'generated', content: fs.readFileSync(path.join(GENERATED_DIR, f), 'utf-8') });
      });
    }
    // Manual tests
    fs.readdirSync(TESTS_DIR).filter(f => f.endsWith('.spec.ts')).forEach(f => {
      allTests.push({ file: f, dir: 'manual', content: fs.readFileSync(path.join(TESTS_DIR, f), 'utf-8') });
    });
    res.json(allTests);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ── API: Generate tests from steps ─────────────────────
app.post('/api/generate', (req, res) => {
  try {
    const file = req.body.file;
    let cmd = 'npx ts-node scripts/generate.ts';
    if (file) cmd += ` --file ${file}`;
    const output = execSync(cmd, { encoding: 'utf-8', timeout: 30000 });
    res.json({ success: true, output });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ── API: Run tests ─────────────────────────────────────
let runningProcess: ChildProcess | null = null;

app.post('/api/run', (req, res) => {
  try {
    const { file, project, headed, grep } = req.body;
    let cmd = 'npx playwright test';
    if (file) cmd += ` ${file}`;
    if (project) cmd += ` --project ${project}`;
    if (headed) cmd += ' --headed';
    if (grep) cmd += ` --grep "${grep}"`;

    const output = execSync(cmd, { encoding: 'utf-8', timeout: 300000 });
    res.json({ success: true, output });
  } catch (e: any) {
    // Tests may fail but still produce output
    res.json({ success: false, output: e.stdout || e.message });
  }
});

// ── API: Get report data ───────────────────────────────
app.get('/api/report', (req, res) => {
  try {
    const jsonReport = path.join(REPORTS_DIR, 'vib-report.json');
    if (!fs.existsSync(jsonReport)) return res.json(null);
    const content = JSON.parse(fs.readFileSync(jsonReport, 'utf-8'));
    res.json(content);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ── API: Auth status ───────────────────────────────────
app.get('/api/auth', (req, res) => {
  const authFile = path.resolve('./auth.json');
  if (!fs.existsSync(authFile)) return res.json({ valid: false, reason: 'No auth file' });
  const stats = fs.statSync(authFile);
  const ageHours = (Date.now() - stats.mtimeMs) / (1000 * 60 * 60);
  res.json({
    valid: ageHours < 8,
    ageHours: parseFloat(ageHours.toFixed(1)),
    lastLogin: stats.mtime.toISOString(),
  });
});

// ── API: Connect SSO ───────────────────────────────────
let connectStatus = 'idle'; // idle | launching | waiting | saving | success | failed

app.post('/api/connect', (req, res) => {
  const url = req.body.url || 'https://ops-aad.ehr-test.vib';
  connectStatus = 'launching';
  
  const child = exec(`npx ts-node scripts/connect.ts "${url}"`, { timeout: 600000 });
  
  child.stdout?.on('data', (data: string) => {
    const lines = data.toString().split('\n');
    for (const line of lines) {
      if (line.startsWith('STATUS:')) {
        const s = line.replace('STATUS:', '').trim().toLowerCase();
        if (s === 'waiting_login') connectStatus = 'waiting';
        else if (s === 'saving') connectStatus = 'saving';
        else if (s === 'success') connectStatus = 'success';
        else if (s === 'failed') connectStatus = 'failed';
        else if (s === 'done') connectStatus = 'success';
      }
    }
    console.log('[connect]', data.toString().trim());
  });

  child.stderr?.on('data', (data: string) => {
    console.error('[connect error]', data.toString().trim());
  });

  child.on('exit', (code) => {
    if (connectStatus !== 'success') connectStatus = code === 0 ? 'success' : 'failed';
    // Reset to idle after 10s
    setTimeout(() => { connectStatus = 'idle'; }, 10000);
  });

  res.json({ success: true, message: 'Connect launched' });
});

app.get('/api/connect/status', (req, res) => {
  const authFile = path.resolve('./auth.json');
  let authValid = false;
  let ageHours = -1;
  if (fs.existsSync(authFile)) {
    const stats = fs.statSync(authFile);
    ageHours = parseFloat(((Date.now() - stats.mtimeMs) / (1000 * 60 * 60)).toFixed(1));
    authValid = ageHours < 8;
  }
  res.json({ status: connectStatus, authValid, ageHours });
});

// ── API: Launch codegen ────────────────────────────────
app.post('/api/codegen', (req, res) => {
  const url = req.body.url || 'https://ops-aad.ehr-test.vib';
  try {
    exec(`npx playwright codegen ${url}`, { timeout: 600000 });
    res.json({ success: true, message: 'Codegen launched' });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ── Serve Dashboard HTML ───────────────────────────────
app.get('/', (req, res) => {
  res.send(DASHBOARD_HTML);
});

// ── Serve reports ──────────────────────────────────────
app.use('/reports', express.static(REPORTS_DIR));

// ── Dashboard HTML ─────────────────────────────────────
const DASHBOARD_HTML = `<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>VIB Test Studio</title>
<style>
:root{
  --bg:#0f1117;--bg2:#1a1d27;--bg3:#242836;--accent:#3b82f6;--accent2:#60a5fa;
  --green:#10b981;--red:#ef4444;--yellow:#f59e0b;--text:#e2e8f0;--muted:#94a3b8;
  --border:#2d3348;--radius:10px;
}
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Segoe UI',system-ui,sans-serif;background:var(--bg);color:var(--text);min-height:100vh}
a{color:var(--accent2);text-decoration:none}

/* Layout */
.app{display:grid;grid-template-columns:260px 1fr;grid-template-rows:56px 1fr;height:100vh}
.header{grid-column:1/-1;background:var(--bg2);border-bottom:1px solid var(--border);display:flex;align-items:center;padding:0 24px;gap:16px;z-index:10}
.header h1{font-size:16px;font-weight:600;display:flex;align-items:center;gap:8px}
.header .logo{font-size:20px}
.header .auth-badge{margin-left:auto;font-size:12px;padding:4px 10px;border-radius:12px;font-weight:500}
.auth-valid{background:#064e3b;color:#6ee7b7}
.auth-expired{background:#7f1d1d;color:#fca5a5}

.sidebar{background:var(--bg2);border-right:1px solid var(--border);overflow-y:auto;padding:16px 0}
.sidebar .section-title{font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:var(--muted);padding:12px 20px 8px;font-weight:600}
.sidebar .nav-item{display:flex;align-items:center;gap:10px;padding:10px 20px;cursor:pointer;font-size:14px;transition:all .15s;border-left:3px solid transparent}
.sidebar .nav-item:hover{background:var(--bg3)}
.sidebar .nav-item.active{background:var(--bg3);border-left-color:var(--accent);color:var(--accent2)}
.sidebar .nav-icon{font-size:16px;width:20px;text-align:center}

.main{overflow-y:auto;padding:24px}
.page{display:none}
.page.active{display:block}

/* Cards */
.card{background:var(--bg2);border:1px solid var(--border);border-radius:var(--radius);padding:20px;margin-bottom:16px}
.card-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:16px}
.card-title{font-size:15px;font-weight:600}

/* Buttons */
.btn{padding:8px 16px;border-radius:8px;border:none;cursor:pointer;font-size:13px;font-weight:500;display:inline-flex;align-items:center;gap:6px;transition:all .15s}
.btn-primary{background:var(--accent);color:#fff}
.btn-primary:hover{background:#2563eb}
.btn-success{background:var(--green);color:#fff}
.btn-success:hover{background:#059669}
.btn-danger{background:var(--red);color:#fff}
.btn-danger:hover{background:#dc2626}
.btn-outline{background:transparent;border:1px solid var(--border);color:var(--text)}
.btn-outline:hover{background:var(--bg3)}
.btn-sm{padding:5px 10px;font-size:12px}

/* Stats */
.stats{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:20px}
.stat-card{background:var(--bg2);border:1px solid var(--border);border-radius:var(--radius);padding:16px;text-align:center}
.stat-num{font-size:28px;font-weight:700}
.stat-label{font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:.05em;margin-top:4px}
.stat-card.green .stat-num{color:var(--green)}
.stat-card.red .stat-num{color:var(--red)}
.stat-card.yellow .stat-num{color:var(--yellow)}
.stat-card.blue .stat-num{color:var(--accent2)}

/* Table */
.table{width:100%;border-collapse:collapse;font-size:13px}
.table th{text-align:left;padding:10px 12px;border-bottom:1px solid var(--border);color:var(--muted);font-weight:500;font-size:11px;text-transform:uppercase;letter-spacing:.05em}
.table td{padding:10px 12px;border-bottom:1px solid var(--border)}
.table tr:hover td{background:var(--bg3)}
.tag{display:inline-block;padding:2px 8px;border-radius:4px;font-size:11px;background:var(--bg3);color:var(--muted);margin-right:4px}
.badge{padding:3px 8px;border-radius:4px;font-size:11px;font-weight:600}
.badge-pass{background:#064e3b;color:#6ee7b7}
.badge-fail{background:#7f1d1d;color:#fca5a5}
.badge-skip{background:#78350f;color:#fde68a}

/* Forms */
input,textarea,select{background:var(--bg3);border:1px solid var(--border);color:var(--text);padding:8px 12px;border-radius:8px;font-size:13px;width:100%;font-family:inherit}
input:focus,textarea:focus,select:focus{outline:none;border-color:var(--accent)}
textarea{resize:vertical;min-height:80px}
.form-group{margin-bottom:14px}
.form-label{display:block;font-size:12px;color:var(--muted);margin-bottom:6px;font-weight:500}

/* Modal */
.modal-overlay{display:none;position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:100;align-items:center;justify-content:center}
.modal-overlay.open{display:flex}
.modal{background:var(--bg2);border:1px solid var(--border);border-radius:12px;padding:24px;width:560px;max-height:80vh;overflow-y:auto}
.modal-title{font-size:16px;font-weight:600;margin-bottom:16px}

/* Terminal */
.terminal{background:#0a0a0a;border:1px solid var(--border);border-radius:8px;padding:16px;font-family:'Consolas','Fira Code',monospace;font-size:12px;color:#a3e635;max-height:400px;overflow-y:auto;white-space:pre-wrap;line-height:1.6}

/* Step editor */
.step-row{display:flex;gap:8px;align-items:center;padding:8px;background:var(--bg3);border-radius:8px;margin-bottom:6px}
.step-row .step-num{width:28px;height:28px;background:var(--accent);color:#fff;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:600;flex-shrink:0}
.step-row select,.step-row input{width:auto;flex:1}
.step-row .btn-danger{flex-shrink:0}

/* Loading */
.spinner{display:inline-block;width:16px;height:16px;border:2px solid var(--border);border-top-color:var(--accent);border-radius:50%;animation:spin .6s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}
.btn-connecting{background:#f59e0b;color:#000;animation:pulse 1.5s infinite}
.btn-connected{background:var(--green);color:#fff;cursor:default}
</style>
</head>
<body>
<div class="app">
  <!-- Header -->
  <div class="header">
    <h1><span class="logo">&#9881;</span> VIB Test Studio</h1>
    <button class="btn btn-primary" id="connectBtn" onclick="connectSSO()" style="margin-left:auto">&#128274; Connect SSO</button>
    <div id="authBadge" class="auth-badge auth-expired">Checking...</div>
  </div>

  <!-- Sidebar -->
  <div class="sidebar">
    <div class="section-title">Dashboard</div>
    <div class="nav-item active" data-page="overview">
      <span class="nav-icon">&#9632;</span> Overview
    </div>
    <div class="section-title">Test Management</div>
    <div class="nav-item" data-page="steps">
      <span class="nav-icon">&#9998;</span> Recorded Steps
    </div>
    <div class="nav-item" data-page="tests">
      <span class="nav-icon">&#9654;</span> Test Files
    </div>
    <div class="nav-item" data-page="runner">
      <span class="nav-icon">&#9881;</span> Run Tests
    </div>
    <div class="section-title">Reports</div>
    <div class="nav-item" data-page="report">
      <span class="nav-icon">&#9776;</span> Test Report
    </div>
    <div class="section-title">Tools</div>
    <div class="nav-item" data-page="codegen">
      <span class="nav-icon">&#8858;</span> Codegen
    </div>
  </div>

  <!-- Main Content -->
  <div class="main">

    <!-- Overview Page -->
    <div class="page active" id="page-overview">
      <h2 style="margin-bottom:20px">Dashboard</h2>
      <div class="stats" id="overviewStats">
        <div class="stat-card blue"><div class="stat-num" id="statSteps">-</div><div class="stat-label">Recorded Steps</div></div>
        <div class="stat-card blue"><div class="stat-num" id="statTests">-</div><div class="stat-label">Test Files</div></div>
        <div class="stat-card green"><div class="stat-num" id="statPassed">-</div><div class="stat-label">Last Passed</div></div>
        <div class="stat-card red"><div class="stat-num" id="statFailed">-</div><div class="stat-label">Last Failed</div></div>
      </div>
      <div class="card">
        <div class="card-header">
          <div class="card-title">Quick Actions</div>
        </div>
        <div style="display:flex;gap:10px;flex-wrap:wrap">
          <button class="btn btn-primary" onclick="navigate('codegen')">Launch Codegen</button>
          <button class="btn btn-success" onclick="navigate('runner')">Run Tests</button>
          <button class="btn btn-outline" onclick="navigate('steps')">Manage Steps</button>
          <button class="btn btn-outline" onclick="generateAll()">Generate All Tests</button>
          <button class="btn btn-outline" onclick="openReport()">Open HTML Report</button>
        </div>
      </div>
      <div class="card">
        <div class="card-header"><div class="card-title">Latest Report</div></div>
        <div id="latestReport" style="color:var(--muted);font-size:13px">Loading...</div>
      </div>
    </div>

    <!-- Recorded Steps Page -->
    <div class="page" id="page-steps">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">
        <h2>Recorded Steps</h2>
        <button class="btn btn-primary" onclick="openCreateModal()">+ New Test Case</button>
      </div>
      <div class="card" style="padding:0">
        <table class="table">
          <thead><tr><th>Name</th><th>Steps</th><th>Tags</th><th>Updated</th><th>Actions</th></tr></thead>
          <tbody id="stepsTable"></tbody>
        </table>
      </div>
    </div>

    <!-- Test Files Page -->
    <div class="page" id="page-tests">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">
        <h2>Test Files</h2>
        <button class="btn btn-primary" onclick="generateAll()">Generate All</button>
      </div>
      <div class="card" style="padding:0">
        <table class="table">
          <thead><tr><th>File</th><th>Type</th><th>Actions</th></tr></thead>
          <tbody id="testsTable"></tbody>
        </table>
      </div>
      <div class="card" id="codeViewer" style="display:none">
        <div class="card-header"><div class="card-title" id="codeViewerTitle">Code</div></div>
        <div class="terminal" id="codeContent"></div>
      </div>
    </div>

    <!-- Runner Page -->
    <div class="page" id="page-runner">
      <h2 style="margin-bottom:20px">Run Tests</h2>
      <div class="card">
        <div class="card-header"><div class="card-title">Configuration</div></div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px">
          <div class="form-group">
            <label class="form-label">Test File (empty = all)</label>
            <input id="runFile" placeholder="e.g. tests/demo.spec.ts">
          </div>
          <div class="form-group">
            <label class="form-label">Project</label>
            <select id="runProject">
              <option value="chromium">Chromium (with auth)</option>
              <option value="no-auth">No Auth (public sites)</option>
              <option value="firefox">Firefox</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Filter (grep)</label>
            <input id="runGrep" placeholder="e.g. @smoke, login">
          </div>
          <div class="form-group">
            <label class="form-label">Options</label>
            <label style="font-size:13px;cursor:pointer"><input type="checkbox" id="runHeaded"> Headed (show browser)</label>
          </div>
        </div>
        <div style="margin-top:12px;display:flex;gap:10px">
          <button class="btn btn-success" id="runBtn" onclick="runTests()">Run Tests</button>
          <button class="btn btn-outline" onclick="runDemo()">Run Demo Test</button>
        </div>
      </div>
      <div class="card">
        <div class="card-header"><div class="card-title">Output</div></div>
        <div class="terminal" id="runOutput">Ready to run...</div>
      </div>
    </div>

    <!-- Report Page -->
    <div class="page" id="page-report">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">
        <h2>Test Report</h2>
        <button class="btn btn-outline" onclick="openReport()">Open Full Report</button>
      </div>
      <div class="stats" id="reportStats">
        <div class="stat-card blue"><div class="stat-num" id="rptTotal">-</div><div class="stat-label">Total</div></div>
        <div class="stat-card green"><div class="stat-num" id="rptPassed">-</div><div class="stat-label">Passed</div></div>
        <div class="stat-card red"><div class="stat-num" id="rptFailed">-</div><div class="stat-label">Failed</div></div>
        <div class="stat-card yellow"><div class="stat-num" id="rptSkipped">-</div><div class="stat-label">Skipped</div></div>
      </div>
      <div class="card" style="padding:0">
        <table class="table">
          <thead><tr><th>Test</th><th>Suite</th><th>Duration</th><th>Status</th></tr></thead>
          <tbody id="reportTable"></tbody>
        </table>
      </div>
    </div>

    <!-- Codegen Page -->
    <div class="page" id="page-codegen">
      <h2 style="margin-bottom:20px">Playwright Codegen</h2>
      <div class="card">
        <div class="card-header"><div class="card-title">Launch Codegen</div></div>
        <div class="form-group">
          <label class="form-label">Target URL</label>
          <input id="codegenUrl" value="https://ops-aad.ehr-test.vib" placeholder="https://...">
        </div>
        <button class="btn btn-primary" onclick="launchCodegen()">Launch Codegen Browser</button>
        <p style="margin-top:12px;font-size:12px;color:var(--muted)">Browser will open. Interact with the page to record actions. Close browser when done, then paste the output below.</p>
      </div>
      <div class="card">
        <div class="card-header"><div class="card-title">Paste Codegen Output</div></div>
        <div class="form-group">
          <textarea id="codegenOutput" rows="12" placeholder="Paste your Playwright codegen output here..."></textarea>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px">
          <div class="form-group">
            <label class="form-label">Test Case Name</label>
            <input id="codegenName" placeholder="e.g. Login Flow">
          </div>
          <div class="form-group">
            <label class="form-label">Tags (comma-separated)</label>
            <input id="codegenTags" placeholder="e.g. smoke, login">
          </div>
        </div>
        <button class="btn btn-success" onclick="parseAndSave()">Parse & Save Steps</button>
        <div id="parseResult" style="margin-top:12px"></div>
      </div>
    </div>

  </div>
</div>

<!-- Create/Edit Modal -->
<div class="modal-overlay" id="createModal">
  <div class="modal">
    <div class="modal-title" id="modalTitle">New Test Case</div>
    <div class="form-group">
      <label class="form-label">Name</label>
      <input id="modalName" placeholder="Test case name">
    </div>
    <div class="form-group">
      <label class="form-label">Description</label>
      <input id="modalDesc" placeholder="Description">
    </div>
    <div class="form-group">
      <label class="form-label">Base URL</label>
      <input id="modalUrl" value="https://ops-aad.ehr-test.vib">
    </div>
    <div class="form-group">
      <label class="form-label">Tags (comma-separated)</label>
      <input id="modalTags" placeholder="smoke, regression">
    </div>
    <div style="display:flex;justify-content:space-between;align-items:center;margin:16px 0 10px">
      <div class="form-label" style="margin:0">Steps</div>
      <button class="btn btn-sm btn-outline" onclick="addStepRow()">+ Add Step</button>
    </div>
    <div id="modalSteps"></div>
    <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:20px">
      <button class="btn btn-outline" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" onclick="saveModal()">Save</button>
    </div>
  </div>
</div>

<script>
// ── State ─────────────────────────────────────────────
let currentPage='overview', editingFile=null;

// ── Navigation ────────────────────────────────────────
document.querySelectorAll('.nav-item').forEach(el=>{
  el.addEventListener('click',()=>navigate(el.dataset.page));
});

function navigate(page){
  currentPage=page;
  document.querySelectorAll('.nav-item').forEach(n=>n.classList.toggle('active',n.dataset.page===page));
  document.querySelectorAll('.page').forEach(p=>p.classList.toggle('active',p.id==='page-'+page));
  if(page==='overview')loadOverview();
  if(page==='steps')loadSteps();
  if(page==='tests')loadTests();
  if(page==='report')loadReport();
}

// ── API helpers ───────────────────────────────────────
async function api(url,opts={}){
  const res=await fetch(url,{headers:{'Content-Type':'application/json'},...opts});
  return res.json();
}

// ── Overview ──────────────────────────────────────────
async function loadOverview(){
  const[steps,tests,report,auth]=await Promise.all([
    api('/api/steps'),api('/api/tests'),api('/api/report'),api('/api/auth')
  ]);
  document.getElementById('statSteps').textContent=steps.length;
  document.getElementById('statTests').textContent=tests.length;
  checkAuthStatus();
  if(report&&report.summary){
    document.getElementById('statPassed').textContent=report.summary.passed;
    document.getElementById('statFailed').textContent=report.summary.failed;
    const lr=document.getElementById('latestReport');
    lr.innerHTML='<b>'+report.summary.total+'</b> tests | <span style="color:var(--green)">'+report.summary.passed+' passed</span> | <span style="color:var(--red)">'+report.summary.failed+' failed</span> | Duration: '+(report.duration/1000).toFixed(1)+'s | '+new Date(report.timestamp).toLocaleString('vi-VN');
  }else{
    document.getElementById('latestReport').textContent='No report yet. Run tests first.';
  }
}

// ── Steps ─────────────────────────────────────────────
async function loadSteps(){
  const steps=await api('/api/steps');
  const tbody=document.getElementById('stepsTable');
  if(!steps.length){tbody.innerHTML='<tr><td colspan="5" style="text-align:center;color:var(--muted);padding:20px">No recorded steps yet</td></tr>';return;}
  tbody.innerHTML=steps.map(s=>'<tr>'
    +'<td><b>'+esc(s.name)+'</b><br><span style="font-size:11px;color:var(--muted)">'+esc(s.description||'')+'</span></td>'
    +'<td>'+s.steps.length+'</td>'
    +'<td>'+(s.tags||[]).map(t=>'<span class="tag">'+esc(t)+'</span>').join('')+'</td>'
    +'<td style="font-size:12px;color:var(--muted)">'+(s.updatedAt?new Date(s.updatedAt).toLocaleDateString('vi-VN'):'')+'</td>'
    +'<td><button class="btn btn-sm btn-outline" onclick="editStep(\\''+s.file+'\\')">Edit</button> '
    +'<button class="btn btn-sm btn-primary" onclick="generateOne(\\''+s.file+'\\')">Generate</button> '
    +'<button class="btn btn-sm btn-danger" onclick="deleteStep(\\''+s.file+'\\')">Delete</button></td>'
    +'</tr>').join('');
}

async function deleteStep(file){
  if(!confirm('Delete '+file+'?'))return;
  await api('/api/steps/'+file,{method:'DELETE'});
  loadSteps();
}

async function generateOne(file){
  const res=await api('/api/generate',{method:'POST',body:JSON.stringify({file})});
  alert(res.success?'Generated!':'Error: '+res.error);
  loadTests();
}

async function generateAll(){
  const res=await api('/api/generate',{method:'POST',body:JSON.stringify({})});
  alert(res.success?'All tests generated!':'Error: '+res.error);
}

// ── Tests ─────────────────────────────────────────────
async function loadTests(){
  const tests=await api('/api/tests');
  const tbody=document.getElementById('testsTable');
  if(!tests.length){tbody.innerHTML='<tr><td colspan="3" style="text-align:center;color:var(--muted);padding:20px">No test files yet</td></tr>';return;}
  tbody.innerHTML=tests.map(t=>'<tr>'
    +'<td><b>'+esc(t.file)+'</b></td>'
    +'<td><span class="tag">'+t.dir+'</span></td>'
    +'<td><button class="btn btn-sm btn-outline" onclick="viewCode(\\''+esc(t.file)+'\\',\\''+btoa(unescape(encodeURIComponent(t.content)))+'\\')">View Code</button> '
    +'<button class="btn btn-sm btn-success" onclick="runSingleTest(\\''+esc(t.dir==='generated'?'tests/generated/'+t.file:'tests/'+t.file)+'\\')">Run</button></td>'
    +'</tr>').join('');
}

function viewCode(title,b64){
  document.getElementById('codeViewer').style.display='block';
  document.getElementById('codeViewerTitle').textContent=title;
  document.getElementById('codeContent').textContent=decodeURIComponent(escape(atob(b64)));
}

async function runSingleTest(file){
  document.getElementById('runFile').value=file;
  navigate('runner');
  runTests();
}

// ── Runner ────────────────────────────────────────────
async function runTests(){
  const btn=document.getElementById('runBtn');
  const out=document.getElementById('runOutput');
  btn.innerHTML='<span class="spinner"></span> Running...';btn.disabled=true;
  out.textContent='Running tests...\\n';
  try{
    const res=await api('/api/run',{method:'POST',body:JSON.stringify({
      file:document.getElementById('runFile').value,
      project:document.getElementById('runProject').value,
      headed:document.getElementById('runHeaded').checked,
      grep:document.getElementById('runGrep').value,
    })});
    out.textContent=res.output||'Done';
  }catch(e){out.textContent='Error: '+e.message;}
  btn.innerHTML='Run Tests';btn.disabled=false;
  loadOverview();
}

function runDemo(){
  document.getElementById('runFile').value='tests/demo.spec.ts';
  document.getElementById('runProject').value='no-auth';
  document.getElementById('runHeaded').checked=true;
  runTests();
}

// ── Report ────────────────────────────────────────────
async function loadReport(){
  const report=await api('/api/report');
  if(!report||!report.results){
    document.getElementById('reportTable').innerHTML='<tr><td colspan="4" style="text-align:center;color:var(--muted);padding:20px">No report yet</td></tr>';return;
  }
  document.getElementById('rptTotal').textContent=report.summary.total;
  document.getElementById('rptPassed').textContent=report.summary.passed;
  document.getElementById('rptFailed').textContent=report.summary.failed;
  document.getElementById('rptSkipped').textContent=report.summary.skipped;
  document.getElementById('reportTable').innerHTML=report.results.map(r=>'<tr>'
    +'<td>'+esc(r.title)+'</td>'
    +'<td>'+esc(r.suite)+'</td>'
    +'<td>'+r.duration+'ms</td>'
    +'<td><span class="badge badge-'+(r.status==='passed'?'pass':r.status==='failed'?'fail':'skip')+'">'+r.status+'</span></td>'
    +'</tr>').join('');
}

function openReport(){window.open('/reports/vib-report.html','_blank');}

// ── Codegen ───────────────────────────────────────────
async function launchCodegen(){
  const url=document.getElementById('codegenUrl').value;
  await api('/api/codegen',{method:'POST',body:JSON.stringify({url})});
  alert('Codegen browser launched!');
}

async function parseAndSave(){
  const code=document.getElementById('codegenOutput').value;
  const name=document.getElementById('codegenName').value;
  const tags=document.getElementById('codegenTags').value;
  if(!code||!name){alert('Please enter codegen output and test name');return;}
  const res=await api('/api/steps',{method:'POST',body:JSON.stringify({
    name,tags:tags?tags.split(',').map(t=>t.trim()):[],
    steps:parseCodegen(code),baseUrl:document.getElementById('codegenUrl').value,
  })});
  document.getElementById('parseResult').innerHTML=res.success
    ?'<span style="color:var(--green)">Saved: '+res.file+'</span>'
    :'<span style="color:var(--red)">Error: '+res.error+'</span>';
}

function parseCodegen(code){
  const steps=[];let i=0;
  code.split('\\n').forEach(line=>{
    line=line.trim();
    let m;
    if(m=line.match(/page\\.goto\\(['"](.*?)['"]\\)/)){steps.push({id:'step_'+i++,action:'navigate',value:m[1],description:'Navigate to '+m[1]});return;}
    if(line.includes('.click(')){const s=extractSel(line);steps.push({id:'step_'+i++,action:'click',selector:s,description:'Click '+s});return;}
    if(m=line.match(/\\.fill\\(['"](.*?)['"]\\)/)){const s=extractSel(line);steps.push({id:'step_'+i++,action:'fill',selector:s,value:m[1],description:'Fill "'+m[1]+'" into '+s});return;}
    if(m=line.match(/\\.press\\(['"](.*?)['"]\\)/)){const s=extractSel(line);steps.push({id:'step_'+i++,action:'press',selector:s,value:m[1],description:'Press '+m[1]});return;}
  });
  return steps;
}
function extractSel(line){
  let m;
  if(m=line.match(/getByRole\\(['"](.*?)['"],\\s*\\{.*?name:\\s*['"](.*?)['"]/))return 'role='+m[1]+'[name="'+m[2]+'"]';
  if(m=line.match(/getByText\\(['"](.*?)['"]\\)/))return 'text="'+m[1]+'"';
  if(m=line.match(/getByLabel\\(['"](.*?)['"]\\)/))return 'label="'+m[1]+'"';
  if(m=line.match(/getByPlaceholder\\(['"](.*?)['"]\\)/))return 'placeholder="'+m[1]+'"';
  if(m=line.match(/locator\\(['"](.*?)['"]\\)/))return m[1];
  return 'unknown';
}

// ── Modal ─────────────────────────────────────────────
function openCreateModal(){
  editingFile=null;
  document.getElementById('modalTitle').textContent='New Test Case';
  document.getElementById('modalName').value='';
  document.getElementById('modalDesc').value='';
  document.getElementById('modalUrl').value='https://ops-aad.ehr-test.vib';
  document.getElementById('modalTags').value='';
  document.getElementById('modalSteps').innerHTML='';
  addStepRow();
  document.getElementById('createModal').classList.add('open');
}

async function editStep(file){
  const data=await api('/api/steps/'+file);
  editingFile=file;
  document.getElementById('modalTitle').textContent='Edit: '+data.name;
  document.getElementById('modalName').value=data.name;
  document.getElementById('modalDesc').value=data.description||'';
  document.getElementById('modalUrl').value=data.baseUrl||'';
  document.getElementById('modalTags').value=(data.tags||[]).join(', ');
  const container=document.getElementById('modalSteps');container.innerHTML='';
  (data.steps||[]).forEach(s=>addStepRow(s));
  document.getElementById('createModal').classList.add('open');
}

function closeModal(){document.getElementById('createModal').classList.remove('open');}

function addStepRow(step={}){
  const container=document.getElementById('modalSteps');
  const num=container.children.length+1;
  const div=document.createElement('div');div.className='step-row';
  div.innerHTML='<span class="step-num">'+num+'</span>'
    +'<select class="step-action" style="width:120px"><option value="navigate">navigate</option><option value="click">click</option><option value="fill">fill</option><option value="select">select</option><option value="check">check</option><option value="hover">hover</option><option value="press">press</option><option value="wait">wait</option><option value="assert_visible">assert_visible</option><option value="assert_text">assert_text</option><option value="custom">custom</option></select>'
    +'<input class="step-selector" placeholder="Selector" value="'+esc(step.selector||'')+'">'
    +'<input class="step-value" placeholder="Value" value="'+esc(step.value||'')+'">'
    +'<input class="step-desc" placeholder="Description" value="'+esc(step.description||'')+'">'
    +'<button class="btn btn-sm btn-danger" onclick="this.parentElement.remove()">X</button>';
  div.querySelector('.step-action').value=step.action||'click';
  container.appendChild(div);
}

async function saveModal(){
  const steps=[];
  document.querySelectorAll('#modalSteps .step-row').forEach((row,i)=>{
    steps.push({
      id:'step_'+i,
      action:row.querySelector('.step-action').value,
      selector:row.querySelector('.step-selector').value,
      value:row.querySelector('.step-value').value,
      description:row.querySelector('.step-desc').value,
    });
  });
  const data={
    name:document.getElementById('modalName').value,
    description:document.getElementById('modalDesc').value,
    baseUrl:document.getElementById('modalUrl').value,
    tags:document.getElementById('modalTags').value.split(',').map(t=>t.trim()).filter(Boolean),
    steps
  };
  if(editingFile){await api('/api/steps/'+editingFile,{method:'POST',body:JSON.stringify(data)});}
  else{await api('/api/steps',{method:'POST',body:JSON.stringify(data)});}
  closeModal();loadSteps();
}

// ── Utils ─────────────────────────────────────────────
function esc(s){return(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}

// ── Init ──────────────────────────────────────────────
loadOverview();
checkAuthStatus();

// ── Connect SSO ───────────────────────────────────────
let connectPolling=null;

async function connectSSO(){
  const btn=document.getElementById('connectBtn');
  btn.innerHTML='<span class="spinner"></span> Opening browser...';
  btn.className='btn btn-connecting';
  btn.disabled=true;

  try{
    await api('/api/connect',{method:'POST',body:JSON.stringify({url:'https://ops-aad.ehr-test.vib'})});
  }catch(e){}

  // Start polling status
  if(connectPolling) clearInterval(connectPolling);
  connectPolling=setInterval(async()=>{
    const s=await api('/api/connect/status');
    updateConnectUI(s);
    if(s.status==='success'||s.status==='failed'||s.status==='idle'){
      if(s.authValid){
        clearInterval(connectPolling);connectPolling=null;
        loadOverview();
      }
      if(s.status==='failed'){
        clearInterval(connectPolling);connectPolling=null;
      }
    }
  },2000);
}

function updateConnectUI(s){
  const btn=document.getElementById('connectBtn');
  const badge=document.getElementById('authBadge');
  
  if(s.status==='waiting'||s.status==='launching'){
    btn.innerHTML='&#9203; Waiting for SSO login...';
    btn.className='btn btn-connecting';
    btn.disabled=true;
    badge.textContent='Logging in...';badge.className='auth-badge auth-expired';
  }else if(s.status==='saving'){
    btn.innerHTML='&#128190; Saving session...';
    btn.className='btn btn-connecting';
    btn.disabled=true;
  }else if(s.status==='success'||s.authValid){
    btn.innerHTML='&#9989; Connected';
    btn.className='btn btn-connected';
    btn.disabled=false;
    btn.onclick=()=>{if(confirm('Re-login SSO?'))connectSSO();};
    badge.textContent='Auth valid ('+s.ageHours+'h)';badge.className='auth-badge auth-valid';
  }else if(s.status==='failed'){
    btn.innerHTML='&#10060; Failed - Retry';
    btn.className='btn btn-danger';
    btn.disabled=false;
    btn.onclick=connectSSO;
    badge.textContent='Auth failed';badge.className='auth-badge auth-expired';
  }else{
    // idle
    if(s.authValid){
      btn.innerHTML='&#9989; Connected';
      btn.className='btn btn-connected';
      btn.onclick=()=>{if(confirm('Re-login SSO?'))connectSSO();};
      badge.textContent='Auth valid ('+s.ageHours+'h)';badge.className='auth-badge auth-valid';
    }else{
      btn.innerHTML='&#128274; Connect SSO';
      btn.className='btn btn-primary';
      btn.disabled=false;
      btn.onclick=connectSSO;
      badge.textContent='Not connected';badge.className='auth-badge auth-expired';
    }
  }
}

async function checkAuthStatus(){
  const s=await api('/api/connect/status');
  updateConnectUI(s);
}
</script>
</body>
</html>`;

// ── Start Server ───────────────────────────────────────
app.listen(PORT, () => {
  console.log('');
  console.log('╔══════════════════════════════════════════════╗');
  console.log('║     🏦 VIB Test Studio Dashboard              ║');
  console.log('║                                              ║');
  console.log(`║     http://localhost:${PORT}                    ║`);
  console.log('╚══════════════════════════════════════════════╝');
  console.log('');

  // Auto-open browser
  try {
    const cmd = process.platform === 'win32' ? 'start' : process.platform === 'darwin' ? 'open' : 'xdg-open';
    exec(`${cmd} http://localhost:${PORT}`);
  } catch {}
});
