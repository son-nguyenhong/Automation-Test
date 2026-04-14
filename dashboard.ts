/**
 * VIB Test Studio - Multi-System Dashboard
 * Manages 10+ systems with SSO, codegen, test execution, reporting
 */
import express from 'express';
import { execSync, exec } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

const app = express();
const PORT = 3456;
const CONFIG_DIR = path.resolve('./config');
const STEPS_DIR = path.resolve('./steps');
const REPORTS_DIR = path.resolve('./reports');
const AUTH_DIR = path.resolve('./auth');

// Ensure directories
[CONFIG_DIR, STEPS_DIR, REPORTS_DIR, AUTH_DIR].forEach(d => {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
});

app.use(express.json());

// ── Helpers ────────────────────────────────────────────
function getSystems(): any[] {
  const p = path.join(CONFIG_DIR, 'systems.json');
  if (!fs.existsSync(p)) return [];
  return JSON.parse(fs.readFileSync(p, 'utf-8')).systems || [];
}

function saveSystems(systems: any[]) {
  fs.writeFileSync(path.join(CONFIG_DIR, 'systems.json'), JSON.stringify({ systems }, null, 2), 'utf-8');
}

function getAuthStatus(systemId: string): { valid: boolean; ageHours: number; lastLogin: string } {
  const authFile = path.join(AUTH_DIR, systemId + '.json');
  if (!fs.existsSync(authFile)) return { valid: false, ageHours: -1, lastLogin: '' };
  const stats = fs.statSync(authFile);
  const ageHours = parseFloat(((Date.now() - stats.mtimeMs) / 3600000).toFixed(1));
  try {
    const c = JSON.parse(fs.readFileSync(authFile, 'utf-8'));
    return { valid: ageHours < 8 && c.cookies?.length > 0, ageHours, lastLogin: stats.mtime.toLocaleString('vi-VN') };
  } catch { return { valid: false, ageHours, lastLogin: '' }; }
}

function getSystemSteps(systemId: string): any[] {
  const dir = path.join(STEPS_DIR, systemId);
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter(f => f.endsWith('.json')).map(f => ({
    file: f, ...JSON.parse(fs.readFileSync(path.join(dir, f), 'utf-8'))
  }));
}

function getSystemReport(systemId: string): any {
  const p = path.join(REPORTS_DIR, systemId, 'vib-report.json');
  if (!fs.existsSync(p)) return null;
  try { return JSON.parse(fs.readFileSync(p, 'utf-8')); } catch { return null; }
}

// ── API: Systems ───────────────────────────────────────
app.get('/api/systems', (req, res) => {
  const systems = getSystems().map(s => ({
    ...s,
    auth: getAuthStatus(s.id),
    testCount: getSystemSteps(s.id).length,
    report: getSystemReport(s.id)?.summary || null
  }));
  res.json(systems);
});

app.post('/api/systems', (req, res) => {
  const systems = getSystems();
  const id = (req.body.name || 'sys').toLowerCase().replace(/[^a-z0-9]+/g, '-');
  systems.push({ id, ...req.body });
  saveSystems(systems);
  // Create directories
  [path.join(STEPS_DIR, id), path.join(REPORTS_DIR, id)].forEach(d => fs.mkdirSync(d, { recursive: true }));
  res.json({ success: true, id });
});

app.put('/api/systems/:id', (req, res) => {
  const systems = getSystems().map(s => s.id === req.params.id ? { ...s, ...req.body } : s);
  saveSystems(systems);
  res.json({ success: true });
});

app.delete('/api/systems/:id', (req, res) => {
  saveSystems(getSystems().filter(s => s.id !== req.params.id));
  res.json({ success: true });
});

// ── API: Connect SSO (per system) ──────────────────────
const connectStatuses: Record<string, string> = {};

app.post('/api/systems/:id/connect', (req, res) => {
  const sys = getSystems().find(s => s.id === req.params.id);
  if (!sys) return res.status(404).json({ error: 'System not found' });
  
  const url = sys.url;
  const authFile = path.join(AUTH_DIR, sys.id + '.json');
  connectStatuses[sys.id] = 'launching';

  // Use connect script with custom auth file path
  const child = exec(`npx ts-node scripts/connect.ts "${url}" "${authFile}"`, { timeout: 600000 });
  child.stdout?.on('data', (d: string) => {
    for (const line of d.toString().split('\n')) {
      if (line.startsWith('STATUS:')) {
        const s = line.replace('STATUS:', '').trim().toLowerCase();
        connectStatuses[sys.id] = s === 'done' ? 'success' : s;
      }
    }
    console.log(`[${sys.id}]`, d.toString().trim());
  });
  child.on('exit', () => { setTimeout(() => { connectStatuses[sys.id] = 'idle'; }, 5000); });
  res.json({ success: true });
});

app.get('/api/systems/:id/connect/status', (req, res) => {
  res.json({ status: connectStatuses[req.params.id] || 'idle', ...getAuthStatus(req.params.id) });
});

// ── API: Steps (per system) ────────────────────────────
app.get('/api/systems/:id/steps', (req, res) => {
  res.json(getSystemSteps(req.params.id));
});

app.post('/api/systems/:id/steps', (req, res) => {
  const dir = path.join(STEPS_DIR, req.params.id);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const slug = (req.body.name || 'test').toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const file = slug + '.json';
  fs.writeFileSync(path.join(dir, file), JSON.stringify({
    id: 'tc_' + Date.now(), ...req.body, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
  }, null, 2), 'utf-8');
  res.json({ success: true, file });
});

app.post('/api/systems/:id/steps/:file', (req, res) => {
  const dir = path.join(STEPS_DIR, req.params.id);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, req.params.file), JSON.stringify({ ...req.body, updatedAt: new Date().toISOString() }, null, 2), 'utf-8');
  res.json({ success: true });
});

app.delete('/api/systems/:id/steps/:file', (req, res) => {
  const p = path.join(STEPS_DIR, req.params.id, req.params.file);
  if (fs.existsSync(p)) fs.unlinkSync(p);
  res.json({ success: true });
});

// ── API: Generate (per system) ─────────────────────────
app.post('/api/systems/:id/generate', (req, res) => {
  try {
    const dir = path.join(STEPS_DIR, req.params.id);
    const outDir = path.resolve('./tests/generated/' + req.params.id);
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
    // Generate from system steps
    const output = execSync(`npx ts-node scripts/generate.ts --stepsDir "${dir}" --outDir "${outDir}"`, { encoding: 'utf-8', timeout: 30000 });
    res.json({ success: true, output });
  } catch (e: any) { res.json({ success: false, error: e.message }); }
});

// ── API: Run tests (per system) ────────────────────────
app.post('/api/systems/:id/run', (req, res) => {
  try {
    const sys = getSystems().find(s => s.id === req.params.id);
    const authFile = path.join(AUTH_DIR, req.params.id + '.json');
    const { file, headed, grep } = req.body;
    let cmd = 'npx playwright test';
    if (file) cmd += ' ' + file;
    cmd += ' --project chromium';
    if (headed) cmd += ' --headed';
    if (grep) cmd += ` --grep "${grep}"`;
    // Pass auth and base URL via env
    const env = {
      ...process.env,
      BASE_URL: sys?.url || '',
      AUTH_FILE: fs.existsSync(authFile) ? authFile : '',
    };
    const output = execSync(cmd, { encoding: 'utf-8', timeout: 300000, env });
    // Copy report
    const rptDir = path.join(REPORTS_DIR, req.params.id);
    if (!fs.existsSync(rptDir)) fs.mkdirSync(rptDir, { recursive: true });
    const srcRpt = path.resolve('./reports/vib-report.json');
    if (fs.existsSync(srcRpt)) fs.copyFileSync(srcRpt, path.join(rptDir, 'vib-report.json'));
    res.json({ success: true, output });
  } catch (e: any) { res.json({ success: false, output: e.stdout || e.message }); }
});

// ── API: Report (per system) ───────────────────────────
app.get('/api/systems/:id/report', (req, res) => {
  const r = getSystemReport(req.params.id);
  res.json(r);
});

// ── API: Codegen ───────────────────────────────────────
app.post('/api/codegen', (req, res) => {
  exec('npx playwright codegen ' + (req.body.url || ''), { timeout: 600000 });
  res.json({ success: true });
});

// ── API: Global stats ──────────────────────────────────
app.get('/api/stats', (req, res) => {
  const systems = getSystems();
  let totalTests = 0, totalPassed = 0, totalFailed = 0, connectedCount = 0;
  systems.forEach(s => {
    totalTests += getSystemSteps(s.id).length;
    if (getAuthStatus(s.id).valid) connectedCount++;
    const rpt = getSystemReport(s.id);
    if (rpt?.summary) { totalPassed += rpt.summary.passed; totalFailed += rpt.summary.failed; }
  });
  res.json({ systemCount: systems.length, connectedCount, totalTests, totalPassed, totalFailed });
});

app.use('/reports', express.static(REPORTS_DIR));
app.get('/', (req, res) => res.send(HTML));

// ═══════════════════════════════════════════════════════
//  DASHBOARD HTML
// ═══════════════════════════════════════════════════════
const HTML = `<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>VIB Test Studio</title>
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
<style>
:root{--bg:#08090d;--s1:#0e1018;--s2:#151822;--s3:#1c2030;--s4:#252a3a;--accent:#2dd4bf;--accent2:#14b8a6;--blue:#3b82f6;--green:#22c55e;--red:#ef4444;--amber:#f59e0b;--text:#e8ecf4;--t2:#94a3b8;--t3:#64748b;--border:rgba(148,163,184,.1);--r:8px;--font:'DM Sans',system-ui,sans-serif;--mono:'JetBrains Mono',monospace}
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:var(--font);background:var(--bg);color:var(--text);min-height:100vh;font-size:13px}
::selection{background:var(--accent);color:#000}
::-webkit-scrollbar{width:6px}::-webkit-scrollbar-thumb{background:var(--s4);border-radius:3px}

/* Layout */
.shell{display:grid;grid-template-columns:240px 1fr;grid-template-rows:48px 1fr;height:100vh}
.topbar{grid-column:1/-1;background:var(--s1);border-bottom:1px solid var(--border);display:flex;align-items:center;padding:0 20px;gap:14px}
.topbar h1{font-size:14px;font-weight:600;letter-spacing:-.02em;color:var(--accent)}
.topbar .pipe{width:1px;height:20px;background:var(--border)}
.topbar .glob{display:flex;gap:16px;margin-left:auto;font-size:11px;color:var(--t2)}
.glob .gv{font-weight:600;font-variant-numeric:tabular-nums}
.glob .gv.ok{color:var(--green)}.glob .gv.bad{color:var(--red)}

.side{background:var(--s1);border-right:1px solid var(--border);overflow-y:auto;padding:12px 0}
.side-title{font-size:10px;text-transform:uppercase;letter-spacing:.1em;color:var(--t3);padding:14px 16px 6px;font-weight:600}
.sys-item{display:flex;align-items:center;gap:10px;padding:9px 16px;cursor:pointer;transition:.12s;border-left:2px solid transparent;font-size:13px}
.sys-item:hover{background:var(--s2)}
.sys-item.on{background:var(--s2);border-left-color:var(--accent)}
.sys-dot{width:7px;height:7px;border-radius:50%;flex-shrink:0}
.sys-dot.ok{background:var(--green);box-shadow:0 0 6px rgba(34,197,94,.4)}
.sys-dot.off{background:var(--red);box-shadow:0 0 6px rgba(239,68,68,.3)}
.sys-dot.na{background:var(--t3)}
.sys-name{flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.sys-count{font-size:11px;color:var(--t3);font-variant-numeric:tabular-nums}
.add-sys{display:flex;align-items:center;gap:8px;padding:9px 16px;cursor:pointer;color:var(--t3);font-size:12px;transition:.12s}
.add-sys:hover{color:var(--accent);background:var(--s2)}

.main{overflow-y:auto}

/* Overview (no system selected) */
.overview{padding:28px}
.ov-title{font-size:20px;font-weight:700;letter-spacing:-.03em;margin-bottom:4px}
.ov-sub{color:var(--t2);font-size:13px;margin-bottom:24px}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:14px}
.sys-card{background:var(--s1);border:1px solid var(--border);border-radius:12px;padding:18px;cursor:pointer;transition:.2s;position:relative;overflow:hidden}
.sys-card:hover{border-color:var(--accent);transform:translateY(-2px);box-shadow:0 8px 24px rgba(0,0,0,.3)}
.sys-card .sc-top{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px}
.sys-card .sc-name{font-size:15px;font-weight:600}
.sys-card .sc-desc{color:var(--t2);font-size:12px;margin-bottom:14px;line-height:1.5}
.sys-card .sc-stats{display:flex;gap:16px;font-size:11px;color:var(--t3)}
.sys-card .sc-stats b{font-weight:600;font-variant-numeric:tabular-nums}
.sc-bar{height:3px;background:var(--s3);border-radius:2px;margin-top:12px;overflow:hidden}
.sc-bar div{height:100%;border-radius:2px}

/* System detail */
.detail{display:none}.detail.on{display:block}
.det-hdr{padding:20px 28px;border-bottom:1px solid var(--border);background:var(--s1)}
.det-hdr .dh-top{display:flex;align-items:center;gap:12px;margin-bottom:4px}
.det-hdr .dh-name{font-size:18px;font-weight:700;letter-spacing:-.02em}
.det-hdr .dh-env{font-size:10px;padding:3px 8px;border-radius:4px;background:var(--s3);color:var(--t2);text-transform:uppercase;letter-spacing:.05em;font-weight:600}
.det-hdr .dh-url{font-size:12px;color:var(--t3);font-family:var(--mono)}
.det-tabs{display:flex;border-bottom:1px solid var(--border);background:var(--s1);padding:0 28px}
.dt{padding:11px 18px;cursor:pointer;font-size:12px;font-weight:500;color:var(--t3);border-bottom:2px solid transparent;transition:.12s}
.dt:hover{color:var(--text)}.dt.on{color:var(--accent);border-bottom-color:var(--accent)}

.det-body{padding:24px 28px}
.dp{display:none}.dp.on{display:block}

/* Cards & forms */
.card{background:var(--s1);border:1px solid var(--border);border-radius:10px;padding:20px;margin-bottom:14px}
.card-t{font-size:13px;font-weight:600;margin-bottom:14px;display:flex;align-items:center;gap:8px}
.btn{padding:8px 16px;border-radius:6px;border:none;cursor:pointer;font-size:12px;font-weight:600;display:inline-flex;align-items:center;gap:6px;transition:.12s;font-family:var(--font)}
.btn-a{background:var(--accent);color:#0a0a0a}.btn-a:hover{background:var(--accent2)}
.btn-b{background:var(--blue);color:#fff}.btn-b:hover{opacity:.9}
.btn-g{background:var(--green);color:#fff}.btn-g:hover{opacity:.9}
.btn-r{background:var(--red);color:#fff}.btn-r:hover{opacity:.9}
.btn-o{background:transparent;border:1px solid var(--border);color:var(--t2)}.btn-o:hover{border-color:var(--t2);color:var(--text)}
.btn-sm{padding:5px 10px;font-size:11px}
.btn:disabled{opacity:.4;cursor:not-allowed}
.big{width:100%;padding:14px;border-radius:10px;justify-content:center;font-size:14px}
.sb{display:flex;align-items:center;gap:10px;padding:11px 14px;border-radius:8px;font-size:12px;margin-bottom:14px}
.sb-ok{background:rgba(34,197,94,.08);border:1px solid rgba(34,197,94,.2);color:#86efac}
.sb-w{background:rgba(245,158,11,.08);border:1px solid rgba(245,158,11,.2);color:#fde68a}
.sb-e{background:rgba(239,68,68,.08);border:1px solid rgba(239,68,68,.2);color:#fca5a5}
input,textarea,select{background:var(--s3);border:1px solid var(--border);color:var(--text);padding:8px 12px;border-radius:6px;font-size:12px;width:100%;font-family:var(--font)}
input:focus,textarea:focus{outline:none;border-color:var(--accent)}
textarea{resize:vertical;min-height:90px;font-family:var(--mono)}
.fl{display:block;font-size:11px;color:var(--t3);margin-bottom:4px;font-weight:500;text-transform:uppercase;letter-spacing:.04em}
.fg{margin-bottom:12px}
.row{display:grid;grid-template-columns:1fr 1fr;gap:12px}

/* Table */
.tbl{width:100%;border-collapse:collapse;font-size:12px}
.tbl th{text-align:left;padding:8px 10px;border-bottom:1px solid var(--border);color:var(--t3);font-size:10px;text-transform:uppercase;letter-spacing:.06em;font-weight:600}
.tbl td{padding:8px 10px;border-bottom:1px solid var(--border)}
.tbl tr:hover td{background:var(--s2)}
.tag{display:inline-block;padding:1px 7px;border-radius:3px;font-size:10px;background:var(--s3);color:var(--t3);margin-right:3px}
.badge{padding:2px 7px;border-radius:3px;font-size:10px;font-weight:600}
.bp{background:rgba(34,197,94,.12);color:#86efac}
.bf{background:rgba(239,68,68,.12);color:#fca5a5}
.bs{background:rgba(245,158,11,.12);color:#fde68a}

.term{background:#06060a;border:1px solid var(--border);border-radius:8px;padding:14px;font-family:var(--mono);font-size:11px;color:#a3e635;max-height:360px;overflow-y:auto;white-space:pre-wrap;line-height:1.8}

.stats-row{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:16px}
.stat{background:var(--s2);border:1px solid var(--border);border-radius:8px;padding:12px;text-align:center}
.stat .n{font-size:22px;font-weight:700;font-variant-numeric:tabular-nums}
.stat .l{font-size:10px;color:var(--t3);text-transform:uppercase;letter-spacing:.04em;margin-top:2px}

/* Step row */
.sr{display:flex;gap:6px;align-items:center;padding:7px 10px;background:var(--s2);border-radius:6px;margin-bottom:5px}
.sr .sn{min-width:22px;height:22px;border-radius:50%;background:var(--accent);color:#0a0a0a;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700}
.sr select,.sr input{width:auto;flex:1;font-size:11px;padding:6px 8px}

.spin{display:inline-block;width:14px;height:14px;border:2px solid var(--s4);border-top-color:var(--accent);border-radius:50%;animation:sp .5s linear infinite}
@keyframes sp{to{transform:rotate(360deg)}}

/* Modal */
.mo{display:none;position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:100;align-items:center;justify-content:center}
.mo.on{display:flex}
.mo-c{background:var(--s1);border:1px solid var(--border);border-radius:14px;padding:24px;width:580px;max-height:85vh;overflow-y:auto}
.mo-c h3{font-size:15px;font-weight:600;margin-bottom:16px}

/* Empty state */
.empty{text-align:center;padding:40px 20px;color:var(--t3)}
.empty-icon{font-size:32px;margin-bottom:8px;opacity:.3}
</style>
</head>
<body>
<div class="shell">

<!-- Topbar -->
<div class="topbar">
  <h1>VIB Test Studio</h1>
  <div class="pipe"></div>
  <span style="font-size:11px;color:var(--t3)">Automation QC Platform</span>
  <div class="glob">
    <span>Systems <span class="gv" id="gSys">0</span></span>
    <span>Connected <span class="gv ok" id="gCon">0</span></span>
    <span>Tests <span class="gv" id="gTest">0</span></span>
    <span>Passed <span class="gv ok" id="gPass">0</span></span>
    <span>Failed <span class="gv bad" id="gFail">0</span></span>
  </div>
</div>

<!-- Sidebar -->
<div class="side">
  <div class="side-title">Systems</div>
  <div id="sysList"></div>
  <div class="add-sys" onclick="openAddSys()">+ Add system</div>
  <div class="side-title" style="margin-top:12px">Quick Actions</div>
  <div class="add-sys" onclick="showOv()">&#9632; Overview</div>
</div>

<!-- Main -->
<div class="main">

  <!-- Overview -->
  <div class="overview" id="ovPage">
    <div class="ov-title">Systems Overview</div>
    <div class="ov-sub">Monitor all systems at a glance. Click a system to manage.</div>
    <div class="grid" id="ovGrid"></div>
  </div>

  <!-- System Detail -->
  <div class="detail" id="detPage">
    <div class="det-hdr">
      <div class="dh-top">
        <div class="sys-dot" id="dDot"></div>
        <div class="dh-name" id="dName"></div>
        <div class="dh-env" id="dEnv"></div>
      </div>
      <div class="dh-url" id="dUrl"></div>
    </div>
    <div class="det-tabs">
      <div class="dt on" onclick="dtab(0)">Connect</div>
      <div class="dt" onclick="dtab(1)">Test Cases</div>
      <div class="dt" onclick="dtab(2)">Run</div>
      <div class="dt" onclick="dtab(3)">Report</div>
    </div>
    <div class="det-body">

      <!-- Tab 0: Connect -->
      <div class="dp on" id="dp0">
        <div id="conSt"></div>
        <div class="card">
          <div class="card-t">SSO Connection</div>
          <p style="color:var(--t3);margin-bottom:14px">Click Connect &rarr; Chrome opens &rarr; login &rarr; close browser &rarr; session saved.</p>
          <button class="btn btn-a big" id="conBtn" onclick="doConnect()">Connect SSO</button>
        </div>
        <div class="card" id="conInfo" style="display:none">
          <div class="card-t">Session Info</div>
          <div id="conDetail" style="color:var(--t2)"></div>
        </div>
      </div>

      <!-- Tab 1: Test Cases -->
      <div class="dp" id="dp1">
        <div class="card">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">
            <div class="card-t" style="margin:0">Test Cases</div>
            <div style="display:flex;gap:6px">
              <button class="btn btn-sm btn-o" onclick="openNewTC()">+ Manual</button>
              <button class="btn btn-sm btn-a" onclick="genAll()">Generate All</button>
            </div>
          </div>
          <table class="tbl"><thead><tr><th>Name</th><th>Steps</th><th>Tags</th><th style="width:180px">Actions</th></tr></thead><tbody id="tcBody"></tbody></table>
        </div>
        <div class="card">
          <div class="card-t">Quick Add from Codegen</div>
          <div class="row"><div class="fg"><label class="fl">Name</label><input id="qcN" placeholder="Test name"></div><div class="fg"><label class="fl">Tags</label><input id="qcT" placeholder="smoke, login"></div></div>
          <div class="fg"><label class="fl">Paste codegen output</label><textarea id="qcC" placeholder="await page.goto(...)"></textarea></div>
          <button class="btn btn-a" onclick="quickAdd()">Parse &amp; Save</button>
          <div id="qcR" style="margin-top:10px"></div>
        </div>
      </div>

      <!-- Tab 2: Run -->
      <div class="dp" id="dp2">
        <div class="card">
          <div class="card-t">Run Configuration</div>
          <div class="row">
            <div class="fg"><label class="fl">Test File</label><input id="rfFile" placeholder="empty = all tests"></div>
            <div class="fg"><label class="fl">Filter</label><input id="rfGrep" placeholder="@smoke"></div>
          </div>
          <div style="display:flex;align-items:center;gap:14px;margin-bottom:14px">
            <label style="cursor:pointer;font-size:12px"><input type="checkbox" id="rfHead"> Show browser</label>
          </div>
          <div style="display:flex;gap:8px">
            <button class="btn btn-a big" id="runBtn" onclick="doRun()" style="flex:1">Run Tests</button>
            <button class="btn btn-o" onclick="doRunDemo()">Demo</button>
          </div>
        </div>
        <div class="card"><div class="card-t">Output</div><div class="term" id="runOut">Ready...</div></div>
      </div>

      <!-- Tab 3: Report -->
      <div class="dp" id="dp3">
        <div class="stats-row">
          <div class="stat"><div class="n" style="color:var(--blue)" id="rpT">-</div><div class="l">Total</div></div>
          <div class="stat"><div class="n" style="color:var(--green)" id="rpP">-</div><div class="l">Passed</div></div>
          <div class="stat"><div class="n" style="color:var(--red)" id="rpF">-</div><div class="l">Failed</div></div>
          <div class="stat"><div class="n" style="color:var(--amber)" id="rpS">-</div><div class="l">Skipped</div></div>
        </div>
        <div class="card" style="padding:0">
          <table class="tbl"><thead><tr><th>Test</th><th>Suite</th><th>Duration</th><th>Status</th></tr></thead><tbody id="rpBody"></tbody></table>
        </div>
      </div>

    </div>
  </div>
</div>
</div>

<!-- Add System Modal -->
<div class="mo" id="addSysMo">
<div class="mo-c">
  <h3 id="asTi">Add System</h3>
  <div class="fg"><label class="fl">Name</label><input id="asN" placeholder="OPS Portal"></div>
  <div class="fg"><label class="fl">URL</label><input id="asU" placeholder="https://..."></div>
  <div class="fg"><label class="fl">Description</label><input id="asD" placeholder="Account management..."></div>
  <div class="row">
    <div class="fg"><label class="fl">Environment</label><select id="asE"><option>test</option><option>staging</option><option>production</option></select></div>
    <div class="fg"><label class="fl">Tags</label><input id="asT" placeholder="core, ops"></div>
  </div>
  <div style="display:flex;gap:8px;justify-content:flex-end"><button class="btn btn-o" onclick="closeMo('addSysMo')">Cancel</button><button class="btn btn-a" onclick="saveSys()">Save</button></div>
</div></div>

<!-- Edit Test Case Modal -->
<div class="mo" id="tcMo">
<div class="mo-c">
  <h3 id="tcTi">New Test Case</h3>
  <div class="fg"><label class="fl">Name</label><input id="tcN"></div>
  <div class="fg"><label class="fl">Description</label><input id="tcD"></div>
  <div class="row"><div class="fg"><label class="fl">Base URL</label><input id="tcU"></div><div class="fg"><label class="fl">Tags</label><input id="tcTg"></div></div>
  <div style="display:flex;justify-content:space-between;align-items:center;margin:12px 0 6px"><label class="fl" style="margin:0">Steps</label><button class="btn btn-sm btn-o" onclick="addSR()">+ Step</button></div>
  <div id="tcSR"></div>
  <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:14px"><button class="btn btn-o" onclick="closeMo('tcMo')">Cancel</button><button class="btn btn-a" onclick="saveTc()">Save</button></div>
</div></div>

<script>
const F=async(u,o={})=>(await fetch(u,{headers:{'Content-Type':'application/json'},...o})).json();
const E=s=>(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
let curSys=null,editTcFile=null,allSystems=[];

// ── Global ────────────────────────────────────────────
async function loadAll(){
  allSystems=await F('/api/systems');
  const st=await F('/api/stats');
  document.getElementById('gSys').textContent=st.systemCount;
  document.getElementById('gCon').textContent=st.connectedCount;
  document.getElementById('gTest').textContent=st.totalTests;
  document.getElementById('gPass').textContent=st.totalPassed;
  document.getElementById('gFail').textContent=st.totalFailed;
  renderSidebar();
  renderOverview();
}

function renderSidebar(){
  document.getElementById('sysList').innerHTML=allSystems.map(s=>{
    const dot=s.auth.valid?'ok':'off';
    return '<div class="sys-item'+(curSys?.id===s.id?' on':'')+'" onclick="selectSys(\\''+s.id+'\\')">'
      +'<div class="sys-dot '+dot+'"></div><div class="sys-name">'+E(s.name)+'</div>'
      +'<div class="sys-count">'+s.testCount+'</div></div>';
  }).join('');
}

function renderOverview(){
  document.getElementById('ovGrid').innerHTML=allSystems.map(s=>{
    const rpt=s.report;
    const total=rpt?(rpt.passed+rpt.failed+(rpt.skipped||0)):0;
    const pct=total>0?Math.round(rpt.passed/total*100):0;
    const barW=total>0?(rpt.passed/total*100):0;
    const barC=pct>=80?'var(--green)':pct>=50?'var(--amber)':'var(--red)';
    return '<div class="sys-card" onclick="selectSys(\\''+s.id+'\\')">'
      +'<div class="sc-top"><div><div class="sc-name">'+E(s.name)+'</div></div>'
      +'<div class="sys-dot '+(s.auth.valid?'ok':'off')+'"></div></div>'
      +'<div class="sc-desc">'+E(s.description||s.url)+'</div>'
      +'<div class="sc-stats">'
      +'<span>Tests: <b>'+s.testCount+'</b></span>'
      +(rpt?'<span>Pass: <b style="color:var(--green)">'+rpt.passed+'</b></span><span>Fail: <b style="color:var(--red)">'+rpt.failed+'</b></span><span>Rate: <b>'+pct+'%</b></span>':'<span style="color:var(--t3)">No runs yet</span>')
      +'</div>'
      +'<div class="sc-bar"><div style="width:'+barW+'%;background:'+barC+'"></div></div>'
      +'</div>';
  }).join('')||(allSystems.length===0?'<div class="empty"><div class="empty-icon">&#9881;</div>No systems yet. Click "+ Add system" to start.</div>':'');
}

// ── System Detail ─────────────────────────────────────
function showOv(){curSys=null;document.getElementById('ovPage').style.display='';document.getElementById('detPage').classList.remove('on');renderSidebar();}

function selectSys(id){
  curSys=allSystems.find(s=>s.id===id);
  if(!curSys)return;
  document.getElementById('ovPage').style.display='none';
  document.getElementById('detPage').classList.add('on');
  document.getElementById('dName').textContent=curSys.name;
  document.getElementById('dEnv').textContent=curSys.env||'test';
  document.getElementById('dUrl').textContent=curSys.url;
  document.getElementById('dDot').className='sys-dot '+(curSys.auth.valid?'ok':'off');
  renderSidebar();
  dtab(0);
  checkCon();
  loadTc();
}

function dtab(i){document.querySelectorAll('.dt').forEach((t,j)=>t.classList.toggle('on',j===i));document.querySelectorAll('.dp').forEach((p,j)=>p.classList.toggle('on',j===i));if(i===3)loadRpt();}

// ── Connect ───────────────────────────────────────────
async function checkCon(){
  if(!curSys)return;
  const s=await F('/api/systems/'+curSys.id+'/connect/status');
  const btn=document.getElementById('conBtn'),st=document.getElementById('conSt'),info=document.getElementById('conInfo'),det=document.getElementById('conDetail');
  if(s.valid){
    st.innerHTML='<div class="sb sb-ok">Session active. Ready to test.</div>';
    btn.textContent='Re-connect';btn.className='btn btn-o big';btn.disabled=false;
    info.style.display='block';det.innerHTML='Last: '+E(s.lastLogin)+' | Expires in '+(8-s.ageHours).toFixed(1)+'h';
    document.getElementById('dDot').className='sys-dot ok';
  }else if(s.status==='waiting'||s.status==='launching'){
    st.innerHTML='<div class="sb sb-w">Browser opened. Login SSO then close browser.</div>';
    btn.innerHTML='<span class="spin"></span> Waiting...';btn.disabled=true;info.style.display='none';
  }else{
    st.innerHTML='<div class="sb sb-e">Not connected. Click Connect.</div>';
    btn.textContent='Connect SSO';btn.className='btn btn-a big';btn.disabled=false;info.style.display='none';
    document.getElementById('dDot').className='sys-dot off';
  }
}
async function doConnect(){
  if(!curSys)return;
  document.getElementById('conBtn').innerHTML='<span class="spin"></span> Opening...';
  document.getElementById('conBtn').disabled=true;
  await F('/api/systems/'+curSys.id+'/connect',{method:'POST'});
}

// ── Test Cases ────────────────────────────────────────
async function loadTc(){
  if(!curSys)return;
  const list=await F('/api/systems/'+curSys.id+'/steps');
  const tb=document.getElementById('tcBody');
  if(!list.length){tb.innerHTML='<tr><td colspan="4"><div class="empty"><div class="empty-icon">&#128209;</div>No test cases. Add via codegen or manually.</div></td></tr>';return;}
  tb.innerHTML=list.map(s=>'<tr><td><b>'+E(s.name)+'</b></td><td>'+s.steps.length+'</td><td>'+(s.tags||[]).map(t=>'<span class="tag">'+E(t)+'</span>').join('')+'</td><td style="white-space:nowrap"><button class="btn btn-sm btn-o" onclick="editTc(\\''+s.file+'\\')">Edit</button> <button class="btn btn-sm btn-a" onclick="gen1(\\''+s.file+'\\')">Gen</button> <button class="btn btn-sm btn-r" onclick="delTc(\\''+s.file+'\\')">Del</button></td></tr>').join('');
}
async function gen1(f){await F('/api/systems/'+curSys.id+'/generate',{method:'POST',body:JSON.stringify({file:f})});alert('Generated!');}
async function genAll(){await F('/api/systems/'+curSys.id+'/generate',{method:'POST',body:JSON.stringify({})});alert('All generated!');}
async function delTc(f){if(confirm('Delete?')){await F('/api/systems/'+curSys.id+'/steps/'+f,{method:'DELETE'});loadTc();loadAll();}}

async function quickAdd(){
  if(!curSys)return;
  const c=document.getElementById('qcC').value,n=document.getElementById('qcN').value;
  if(!c||!n){alert('Enter name and codegen output');return;}
  const steps=pCg(c);
  const r=await F('/api/systems/'+curSys.id+'/steps',{method:'POST',body:JSON.stringify({name:n,description:'From codegen',baseUrl:curSys.url,tags:(document.getElementById('qcT').value||'').split(',').map(t=>t.trim()).filter(Boolean),steps})});
  document.getElementById('qcR').innerHTML=r.success?'<div class="sb sb-ok">Saved '+E(r.file)+' ('+steps.length+' steps)</div>':'<div class="sb sb-e">Error</div>';
  document.getElementById('qcC').value='';document.getElementById('qcN').value='';
  loadTc();loadAll();
}

function pCg(c){const s=[];let i=0;c.split('\\n').forEach(l=>{l=l.trim();let m;
if(m=l.match(/page\\.goto\\(['"](.*?)['"]\\)/)){s.push({id:'s'+i++,action:'navigate',value:m[1],description:'Go to '+m[1]});return;}
if(l.includes('.click(')){const x=sl(l);s.push({id:'s'+i++,action:'click',selector:x,description:'Click '+x});return;}
if(m=l.match(/\\.fill\\(['"](.*?)['"]\\)/)){const x=sl(l);s.push({id:'s'+i++,action:'fill',selector:x,value:m[1],description:'Fill "'+m[1]+'"'});return;}
if(m=l.match(/\\.press\\(['"](.*?)['"]\\)/)){const x=sl(l);s.push({id:'s'+i++,action:'press',selector:x,value:m[1],description:'Press '+m[1]});return;}
if(m=l.match(/\\.selectOption\\(['"](.*?)['"]\\)/)){const x=sl(l);s.push({id:'s'+i++,action:'select',selector:x,value:m[1],description:'Select '+m[1]});return;}
});return s;}
function sl(l){let m;if(m=l.match(/getByRole\\(['"](.*?)['"],\\s*\\{.*?name:\\s*['"](.*?)['"]/))return'role='+m[1]+'[name="'+m[2]+'"]';if(m=l.match(/getByText\\(['"](.*?)['"]\\)/))return'text="'+m[1]+'"';if(m=l.match(/getByLabel\\(['"](.*?)['"]\\)/))return'label="'+m[1]+'"';if(m=l.match(/locator\\(['"](.*?)['"]\\)/))return m[1];return'unknown';}

// ── Run ───────────────────────────────────────────────
async function doRun(){
  if(!curSys)return;
  const btn=document.getElementById('runBtn'),out=document.getElementById('runOut');
  btn.innerHTML='<span class="spin"></span> Running...';btn.disabled=true;out.textContent='Running...\\n';
  const r=await F('/api/systems/'+curSys.id+'/run',{method:'POST',body:JSON.stringify({file:document.getElementById('rfFile').value,headed:document.getElementById('rfHead').checked,grep:document.getElementById('rfGrep').value})});
  out.textContent=r.output||'Done';
  btn.textContent='Run Tests';btn.disabled=false;
  loadRpt();loadAll();
}
function doRunDemo(){document.getElementById('rfFile').value='tests/demo.spec.ts';document.getElementById('rfHead').checked=true;doRun();}

// ── Report ────────────────────────────────────────────
async function loadRpt(){
  if(!curSys)return;
  const r=await F('/api/systems/'+curSys.id+'/report');
  const tb=document.getElementById('rpBody');
  if(!r||!r.results){tb.innerHTML='<tr><td colspan="4"><div class="empty"><div class="empty-icon">&#128202;</div>No report yet. Run tests first.</div></td></tr>';return;}
  document.getElementById('rpT').textContent=r.summary.total;document.getElementById('rpP').textContent=r.summary.passed;
  document.getElementById('rpF').textContent=r.summary.failed;document.getElementById('rpS').textContent=r.summary.skipped||0;
  tb.innerHTML=r.results.map(t=>'<tr><td>'+E(t.title)+'</td><td>'+E(t.suite)+'</td><td>'+t.duration+'ms</td><td><span class="badge b'+(t.status==='passed'?'p':t.status==='failed'?'f':'s')+'">'+t.status+'</span></td></tr>').join('');
}

// ── Add System Modal ──────────────────────────────────
function openAddSys(){document.getElementById('asN').value='';document.getElementById('asU').value='';document.getElementById('asD').value='';document.getElementById('asT').value='';document.getElementById('addSysMo').classList.add('on');}
function closeMo(id){document.getElementById(id).classList.remove('on');}
async function saveSys(){
  const r=await F('/api/systems',{method:'POST',body:JSON.stringify({name:document.getElementById('asN').value,url:document.getElementById('asU').value,description:document.getElementById('asD').value,env:document.getElementById('asE').value,tags:(document.getElementById('asT').value||'').split(',').map(t=>t.trim()).filter(Boolean)})});
  closeMo('addSysMo');loadAll();
}

// ── TC Modal ──────────────────────────────────────────
function openNewTC(){editTcFile=null;document.getElementById('tcTi').textContent='New Test Case';document.getElementById('tcN').value='';document.getElementById('tcD').value='';document.getElementById('tcU').value=curSys?.url||'';document.getElementById('tcTg').value='';document.getElementById('tcSR').innerHTML='';addSR();addSR();document.getElementById('tcMo').classList.add('on');}
async function editTc(f){
  if(!curSys)return;
  const d=await F('/api/systems/'+curSys.id+'/steps/'+f);editTcFile=f;
  document.getElementById('tcTi').textContent='Edit: '+d.name;document.getElementById('tcN').value=d.name;document.getElementById('tcD').value=d.description||'';document.getElementById('tcU').value=d.baseUrl||'';document.getElementById('tcTg').value=(d.tags||[]).join(', ');document.getElementById('tcSR').innerHTML='';
  (d.steps||[]).forEach(s=>addSR(s));document.getElementById('tcMo').classList.add('on');
}
function addSR(s={}){const c=document.getElementById('tcSR'),n=c.children.length+1,d=document.createElement('div');d.className='sr';d.innerHTML='<span class="sn">'+n+'</span><select class="sa" style="width:100px"><option>navigate</option><option>click</option><option>fill</option><option>select</option><option>check</option><option>hover</option><option>press</option><option>wait</option><option>assert_visible</option><option>assert_text</option></select><input class="ss" placeholder="Selector" value="'+E(s.selector||'')+'"><input class="sv" placeholder="Value" value="'+E(s.value||'')+'"><input class="sd" placeholder="Desc" value="'+E(s.description||'')+'"><button class="btn btn-sm btn-r" onclick="this.parentElement.remove()" style="padding:3px 7px">X</button>';d.querySelector('.sa').value=s.action||'click';c.appendChild(d);}
async function saveTc(){
  if(!curSys)return;
  const steps=[];document.querySelectorAll('#tcSR .sr').forEach((r,i)=>{steps.push({id:'s'+i,action:r.querySelector('.sa').value,selector:r.querySelector('.ss').value,value:r.querySelector('.sv').value,description:r.querySelector('.sd').value});});
  const body={name:document.getElementById('tcN').value,description:document.getElementById('tcD').value,baseUrl:document.getElementById('tcU').value,tags:document.getElementById('tcTg').value.split(',').map(t=>t.trim()).filter(Boolean),steps};
  if(editTcFile)await F('/api/systems/'+curSys.id+'/steps/'+editTcFile,{method:'POST',body:JSON.stringify(body)});
  else await F('/api/systems/'+curSys.id+'/steps',{method:'POST',body:JSON.stringify(body)});
  closeMo('tcMo');loadTc();loadAll();
}

// ── Init ──────────────────────────────────────────────
loadAll();
setInterval(()=>{if(curSys)checkCon();},3000);
setInterval(loadAll,15000);
</script>
</body></html>`;

app.listen(PORT, () => {
  console.log('\\n  VIB Test Studio — http://localhost:' + PORT + '\\n');
  try { exec((process.platform === 'win32' ? 'start' : 'open') + ' http://localhost:' + PORT); } catch {}
});
