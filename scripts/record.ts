/**
 * VIB Test Studio - Record Script
 * 
 * Usage:
 *   npx ts-node scripts/record.ts
 *   npx ts-node scripts/record.ts --url https://example.com --name "my-test"
 * 
 * Flow:
 * 1. Opens Playwright codegen with target URL
 * 2. User interacts with the page → codegen records actions
 * 3. After closing, paste the codegen output
 * 4. Parser converts to structured JSON steps
 * 5. Saves to /steps/<name>.json
 */

import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';
import { execSync } from 'child_process';
import { StepRecorder } from '../src/core/step-recorder';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function ask(question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, (answer) => resolve(answer.trim()));
  });
}

async function main() {
  console.log('');
  console.log('╔══════════════════════════════════════════════╗');
  console.log('║     🎬 VIB Test Studio - Step Recorder       ║');
  console.log('╚══════════════════════════════════════════════╝');
  console.log('');

  // Parse CLI args
  const args = process.argv.slice(2);
  let url = '';
  let name = '';
  let description = '';
  let tags = '';

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--url' && args[i + 1]) url = args[++i];
    if (args[i] === '--name' && args[i + 1]) name = args[++i];
  }

  // Interactive prompts
  if (!url) url = await ask('🌐 Target URL (e.g., https://ops-aad.ehr-test.vib): ');
  if (!name) name = await ask('📝 Test case name: ');
  description = await ask('📋 Description (optional): ');
  tags = await ask('🏷️  Tags (comma-separated, optional): ');

  console.log('');
  console.log('Choose recording method:');
  console.log('  [1] Launch Playwright Codegen (recommended)');
  console.log('  [2] Paste codegen output manually');
  console.log('  [3] Create steps interactively');
  console.log('');

  const method = await ask('Select (1/2/3): ');

  const recorder = new StepRecorder('./steps');

  if (method === '1') {
    // Launch codegen
    console.log('\n🎬 Launching Playwright Codegen...');
    console.log('   Record your actions, then close the browser.');
    console.log('   The generated code will be saved automatically.\n');

    const tempFile = path.join(__dirname, '..', '.temp-codegen.ts');
    try {
      execSync(
        `npx playwright codegen ${url} --target javascript -o "${tempFile}"`,
        { stdio: 'inherit' }
      );

      if (fs.existsSync(tempFile)) {
        const codegenOutput = fs.readFileSync(tempFile, 'utf-8');
        const steps = recorder.parseCodegenOutput(codegenOutput);
        console.log(`\n📊 Parsed ${steps.length} step(s) from codegen output`);

        // Show steps for confirmation
        steps.forEach((s, i) => {
          console.log(`  ${i + 1}. [${s.action}] ${s.description}`);
        });

        const confirm = await ask('\n✅ Save these steps? (y/n): ');
        if (confirm.toLowerCase() === 'y') {
          recorder.saveTestCase(name, steps, {
            description,
            baseUrl: url,
            tags: tags ? tags.split(',').map((t) => t.trim()) : [],
          });
        }
        fs.unlinkSync(tempFile);
      }
    } catch (e) {
      console.log('⚠️  Codegen closed. Checking for output...');
      if (fs.existsSync(tempFile)) {
        fs.unlinkSync(tempFile);
      }
    }
  } else if (method === '2') {
    // Paste mode
    console.log('\n📋 Paste your Playwright codegen output below.');
    console.log('   Type "END" on a new line when done:\n');

    let codegenOutput = '';
    const lines: string[] = [];

    process.stdin.resume();
    for await (const line of rl) {
      if (line.trim() === 'END') break;
      lines.push(line);
    }
    codegenOutput = lines.join('\n');

    const steps = recorder.parseCodegenOutput(codegenOutput);
    console.log(`\n📊 Parsed ${steps.length} step(s)`);

    steps.forEach((s, i) => {
      console.log(`  ${i + 1}. [${s.action}] ${s.description}`);
    });

    recorder.saveTestCase(name, steps, {
      description,
      baseUrl: url,
      tags: tags ? tags.split(',').map((t) => t.trim()) : [],
    });
  } else if (method === '3') {
    // Interactive step creation
    console.log('\n🔧 Create steps interactively. Type "done" to finish.\n');

    const steps: any[] = [];
    let stepNum = 1;

    while (true) {
      console.log(`── Step ${stepNum} ──`);
      const action = await ask('  Action (navigate/click/fill/select/check/assert_visible/assert_text/wait/done): ');
      if (action === 'done') break;

      let selector = '';
      let value = '';
      let expected = '';
      let desc = '';

      if (['click', 'fill', 'select', 'check', 'uncheck', 'hover', 'press', 'assert_visible', 'assert_text'].includes(action)) {
        selector = await ask('  Selector: ');
      }
      if (['navigate', 'fill', 'select', 'press', 'wait'].includes(action)) {
        value = await ask('  Value: ');
      }
      if (['assert_text', 'assert_value', 'assert_url'].includes(action)) {
        expected = await ask('  Expected: ');
      }
      desc = await ask('  Description (optional): ');

      steps.push(
        recorder.createManualStep(action as any, { selector, value, description: desc, expected })
      );
      stepNum++;
      console.log('');
    }

    console.log(`\n📊 Created ${steps.length} step(s)`);
    recorder.saveTestCase(name, steps, {
      description,
      baseUrl: url,
      tags: tags ? tags.split(',').map((t) => t.trim()) : [],
    });
  }

  console.log('\n🎉 Done! Run "npx ts-node scripts/generate.ts" to generate test files.\n');
  rl.close();
}

main().catch(console.error);
