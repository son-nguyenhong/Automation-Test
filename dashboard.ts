/**
 * VIB Test Studio - Multi-System Dashboard v4
 * Added: Launch Codegen button, Run Test with test case selection & ordering
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
const SUITES_DIR = path.resolve('./suites');
const GEN_DIR = path.resolve('./tests/generated');

[CONFIG_DIR, STEPS_DIR, REPORTS_DIR, AUTH_DIR, SUITES_DIR, GEN_DIR].forEach(d => {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
});

app.use(express.json());

function getSystems(): any[] { const p = path.join(CONFIG_DIR, 'systems.json'); if (!fs.existsSync(p)) return []; return JSON.parse(fs.readFileSync(p, 'utf-8')).systems || []; }
function saveSystems(systems: any[]) { fs.writeFileSync(path.join(CONFIG_DIR, 'systems.json'), JSON.stringify({ systems }, null, 2), 'utf-8'); }
function getAuthStatus(sid: string) { const af = path.join(AUTH_DIR, sid + '.json'); if (!fs.existsSync(af)) return { valid: false, ageHours: -1, lastLogin: '' }; const st = fs.statSync(af); const ah = +((Date.now() - st.mtimeMs) / 3600000).toFixed(1); try { const c = JSON.parse(fs.readFileSync(af, 'utf-8')); return { valid: ah < 8 && c.cookies?.length > 0, ageHours: ah, lastLogin: st.mtime.toLocaleString('vi-VN') }; } catch { return { valid: false, ageHours: ah, lastLogin: '' }; } }
function getSystemSteps(sid: string) { const d = path.join(STEPS_DIR, sid); if (!fs.existsSync(d)) return []; return fs.readdirSync(d).filter(f => f.endsWith('.json')).map(f => ({ file: f, ...JSON.parse(fs.readFileSync(path.join(d, f), 'utf-8')) })); }
function getSystemReport(sid: string) { const p = path.join(REPORTS_DIR, sid, 'vib-report.json'); if (!fs.existsSync(p)) return null; try { return JSON.parse(fs.readFileSync(p, 'utf-8')); } catch { return null; } }
function getSystemSuites(sid: string) { const d = path.join(SUITES_DIR, sid); if (!fs.existsSync(d)) return []; return fs.readdirSync(d).filter(f => f.endsWith('.json')).map(f => ({ file: f, ...JSON.parse(fs.readFileSync(path.join(d, f), 'utf-8')) })); }

app.get('/api/systems', (req, res) => { res.json(getSystems().map(s => ({ ...s, auth: getAuthStatus(s.id), testCount: getSystemSteps(s.id).length, report: getSystemReport(s.id)?.summary || null }))); });
app.post('/api/systems', (req, res) => { const sys = getSystems(); const id = (req.body.name || 'sys').toLowerCase().replace(/[^a-z0-9]+/g, '-'); sys.push({ id, ...req.body }); saveSystems(sys); [path.join(STEPS_DIR, id), path.join(REPORTS_DIR, id), path.join(SUITES_DIR, id)].forEach(d => fs.mkdirSync(d, { recursive: true })); res.json({ success: true, id }); });
app.delete('/api/systems/:id', (req, res) => { saveSystems(getSystems().filter(s => s.id !== req.params.id)); res.json({ success: true }); });

const cSt: Record<string, string> = {};
app.post('/api/systems/:id/connect', (req, res) => { const sys = getSystems().find(s => s.id === req.params.id); if (!sys) return res.status(404).json({}); const af = path.join(AUTH_DIR, sys.id + '.json'); cSt[sys.id] = 'launching'; const ch = exec(`npx ts-node scripts/connect.ts "${sys.url}" "${af}"`, { timeout: 600000 }); ch.stdout?.on('data', (d: string) => { for (const l of d.toString().split('\n')) { if (l.startsWith('STATUS:')) { const s = l.replace('STATUS:', '').trim().toLowerCase(); cSt[sys.id] = s === 'done' ? 'success' : s; } } console.log(`[${sys.id}]`, d.toString().trim()); }); ch.on('exit', () => setTimeout(() => { cSt[sys.id] = 'idle'; }, 5000)); res.json({ success: true }); });
app.get('/api/systems/:id/connect/status', (req, res) => { res.json({ status: cSt[req.params.id] || 'idle', ...getAuthStatus(req.params.id) }); });

app.get('/api/systems/:id/steps', (req, res) => { res.json(getSystemSteps(req.params.id)); });
app.post('/api/systems/:id/steps', (req, res) => { const d = path.join(STEPS_DIR, req.params.id); if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true }); const f = (req.body.name || 'test').toLowerCase().replace(/[^a-z0-9]+/g, '-') + '.json'; fs.writeFileSync(path.join(d, f), JSON.stringify({ id: 'tc_' + Date.now(), ...req.body, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }, null, 2)); res.json({ success: true, file: f }); });
app.post('/api/systems/:id/steps/:file', (req, res) => { const d = path.join(STEPS_DIR, req.params.id); if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true }); fs.writeFileSync(path.join(d, req.params.file), JSON.stringify({ ...req.body, updatedAt: new Date().toISOString() }, null, 2)); res.json({ success: true }); });
app.delete('/api/systems/:id/steps/:file', (req, res) => { const p = path.join(STEPS_DIR, req.params.id, req.params.file); if (fs.existsSync(p)) fs.unlinkSync(p); res.json({ success: true }); });

app.get('/api/systems/:id/suites', (req, res) => { res.json(getSystemSuites(req.params.id)); });
app.post('/api/systems/:id/suites', (req, res) => { const d = path.join(SUITES_DIR, req.params.id); if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true }); const f = (req.body.name || 'suite').toLowerCase().replace(/[^a-z0-9]+/g, '-') + '.json'; fs.writeFileSync(path.join(d, f), JSON.stringify({ id: 'su_' + Date.now(), ...req.body, createdAt: new Date().toISOString() }, null, 2)); res.json({ success: true, file: f }); });
app.delete('/api/systems/:id/suites/:file', (req, res) => { const p = path.join(SUITES_DIR, req.params.id, req.params.file); if (fs.existsSync(p)) fs.unlinkSync(p); res.json({ success: true }); });

function bL(sel: string) { let m: any; if (m = sel.match(/^role=(\w+)\[name="(.*)"\]$/)) return `getByRole('${m[1]}', { name: '${m[2]}' })`; if (m = sel.match(/^text="(.*)"$/)) return `getByText('${m[1]}')`; if (m = sel.match(/^label="(.*)"$/)) return `getByLabel('${m[1]}')`; if (m = sel.match(/^placeholder="(.*)"$/)) return `getByPlaceholder('${m[1]}')`; return `locator('${sel}')`; }
function sC(s: any, i: string) { const l = s.selector ? bL(s.selector) : ''; const v = (s.value || '').replace(/'/g, "\\'"); switch (s.action) { case 'navigate': return `${i}await page.goto('${v}');\n${i}await page.waitForLoadState('domcontentloaded');\n`; case 'click': return `${i}await page.${l}.click();\n`; case 'fill': return `${i}await page.${l}.fill('${v}');\n`; case 'select': return `${i}await page.${l}.selectOption('${v}');\n`; case 'check': return `${i}await page.${l}.check();\n`; case 'hover': return `${i}await page.${l}.hover();\n`; case 'press': return `${i}await page.${l}.press('${v}');\n`; case 'wait': return `${i}await page.waitForTimeout(${s.value || 1000});\n`; case 'assert_visible': return `${i}await expect(page.${l}).toBeVisible();\n`; case 'assert_text': return `${i}await expect(page.${l}).toContainText('${(s.expected || '').replace(/'/g, "\\'")}');\n`; default: return ''; } }

app.post('/api/systems/:id/generate-suite', (req, res) => {
  try { const { name, testCases } = req.body; const od = path.join(GEN_DIR, req.params.id); if (!fs.existsSync(od)) fs.mkdirSync(od, { recursive: true }); const fn = (name || 'run').toLowerCase().replace(/[^a-z0-9]+/g, '-') + '.spec.ts';
  let c = `import { test, expect } from '@playwright/test';\n\ntest.describe('${(name || 'Run').replace(/'/g, "\\'")}', () => {\n  test.setTimeout(120000);\n\n`;
  for (const tc of testCases) { c += `  test('${(tc.name || '').replace(/'/g, "\\'")}', async ({ page }) => {\n`; for (const s of tc.steps) { c += `    await test.step('${(s.description || s.action).replace(/'/g, "\\'")}', async () => {\n${sC(s, '      ')}    });\n`; } c += `  });\n\n`; }
  c += `});\n`; fs.writeFileSync(path.join(od, fn), c); res.json({ success: true, file: fn, path: `tests/generated/${req.params.id}/${fn}` }); } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.post('/api/systems/:id/generate', (req, res) => { try { const d = path.join(STEPS_DIR, req.params.id); const od = path.resolve('./tests/generated/' + req.params.id); if (!fs.existsSync(od)) fs.mkdirSync(od, { recursive: true }); const o = execSync(`npx ts-node scripts/generate.ts --stepsDir "${d}" --outDir "${od}"`, { encoding: 'utf-8', timeout: 30000 }); res.json({ success: true, output: o }); } catch (e: any) { res.json({ success: false, error: e.message }); } });

app.post('/api/systems/:id/run', (req, res) => { try { const sys = getSystems().find(s => s.id === req.params.id); const af = path.join(AUTH_DIR, req.params.id + '.json'); const { file, headed, grep } = req.body; let cmd = 'npx playwright test'; if (file) cmd += ' ' + file; cmd += ' --project chromium'; if (headed) cmd += ' --headed'; if (grep) cmd += ` --grep "${grep}"`; const env = { ...process.env, BASE_URL: sys?.url || '', AUTH_FILE: fs.existsSync(af) ? af : '' }; const o = execSync(cmd, { encoding: 'utf-8', timeout: 300000, env }); const rd = path.join(REPORTS_DIR, req.params.id); if (!fs.existsSync(rd)) fs.mkdirSync(rd, { recursive: true }); const sr = path.resolve('./reports/vib-report.json'); if (fs.existsSync(sr)) fs.copyFileSync(sr, path.join(rd, 'vib-report.json')); res.json({ success: true, output: o }); } catch (e: any) { res.json({ success: false, output: e.stdout || e.message }); } });

app.get('/api/systems/:id/report', (req, res) => { res.json(getSystemReport(req.params.id)); });
app.post('/api/codegen', (req, res) => { exec('npx playwright codegen ' + (req.body.url || ''), { timeout: 600000 }); res.json({ success: true }); });
app.get('/api/stats', (req, res) => { const sys = getSystems(); let tt = 0, tp = 0, tf = 0, cc = 0; sys.forEach(s => { tt += getSystemSteps(s.id).length; if (getAuthStatus(s.id).valid) cc++; const r = getSystemReport(s.id); if (r?.summary) { tp += r.summary.passed; tf += r.summary.failed; } }); res.json({ systemCount: sys.length, connectedCount: cc, totalTests: tt, totalPassed: tp, totalFailed: tf }); });
app.use('/reports', express.static(REPORTS_DIR));
app.get('/', (req, res) => {
  res.sendFile(path.resolve('./dashboard.html'));
});

app.listen(PORT, () => {
  console.log('\n  VIB Test Studio — http://localhost:' + PORT + '\n');
  try { exec((process.platform === 'win32' ? 'start' : 'open') + ' http://localhost:' + PORT); } catch {}
});
