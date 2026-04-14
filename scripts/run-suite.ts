/**
 * VIB Test Studio - Suite Runner
 * 
 * Usage:
 *   npx ts-node scripts/run-suite.ts                     # Run all
 *   npx ts-node scripts/run-suite.ts --headed             # With browser UI
 *   npx ts-node scripts/run-suite.ts --tag smoke          # Filter by tag
 *   npx ts-node scripts/run-suite.ts --grep "login"       # Filter by name
 *   npx ts-node scripts/run-suite.ts --retries 2          # With retries
 */

import { execSync } from 'child_process';
import * as fs from 'fs';

function main() {
  console.log('');
  console.log('╔══════════════════════════════════════════════╗');
  console.log('║     🚀 VIB Test Studio - Suite Runner         ║');
  console.log('╚══════════════════════════════════════════════╝');
  console.log('');

  const args = process.argv.slice(2);

  // Build playwright command
  let cmd = 'npx playwright test';
  const playwrightArgs: string[] = [];

  // Parse our custom args → playwright args
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--headed':
        playwrightArgs.push('--headed');
        break;
      case '--tag':
        if (args[i + 1]) {
          playwrightArgs.push(`--grep @${args[++i]}`);
        }
        break;
      case '--grep':
        if (args[i + 1]) {
          playwrightArgs.push(`--grep "${args[++i]}"`);
        }
        break;
      case '--retries':
        if (args[i + 1]) {
          playwrightArgs.push(`--retries ${args[++i]}`);
        }
        break;
      case '--workers':
        if (args[i + 1]) {
          playwrightArgs.push(`--workers ${args[++i]}`);
        }
        break;
      case '--project':
        if (args[i + 1]) {
          playwrightArgs.push(`--project ${args[++i]}`);
        }
        break;
      case '--debug':
        playwrightArgs.push('--debug');
        break;
      case '--ui':
        playwrightArgs.push('--ui');
        break;
    }
  }

  cmd += ' ' + playwrightArgs.join(' ');

  // Ensure report directories exist
  if (!fs.existsSync('./reports/screenshots')) {
    fs.mkdirSync('./reports/screenshots', { recursive: true });
  }

  console.log(`▶ Running: ${cmd}\n`);

  try {
    execSync(cmd, { stdio: 'inherit' });
  } catch (e) {
    // Tests may fail but we still want the report
    console.log('\n⚠️  Some tests failed. Check the report for details.');
  }

  // Show report location
  if (fs.existsSync('./reports/vib-report.html')) {
    console.log('\n📊 Report: ./reports/vib-report.html');
  }
  console.log('📊 Playwright Report: npx playwright show-report reports/html\n');
}

main();
