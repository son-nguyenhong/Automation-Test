/**
 * VIB Test Studio - Test Generator
 * 
 * Usage:
 *   npx ts-node scripts/generate.ts                    # Generate all
 *   npx ts-node scripts/generate.ts --file login.json   # Generate specific
 *   npx ts-node scripts/generate.ts --screenshots       # With screenshots per step
 */

import * as path from 'path';
import * as readline from 'readline';
import { TestGenerator } from '../src/core/test-generator';
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
  console.log('║     ⚙️  VIB Test Studio - Test Generator      ║');
  console.log('╚══════════════════════════════════════════════╝');
  console.log('');

  const args = process.argv.slice(2);
  const generator = new TestGenerator('./steps', './tests/generated');
  const recorder = new StepRecorder('./steps');

  // Parse CLI options
  const hasScreenshots = args.includes('--screenshots');
  const fileIndex = args.indexOf('--file');
  const specificFile = fileIndex !== -1 ? args[fileIndex + 1] : null;

  if (specificFile) {
    // Generate specific file
    const filePath = path.join('./steps', specificFile);
    console.log(`📄 Generating from: ${filePath}`);
    generator.generateFromFile(filePath, {
      screenshotOnStep: hasScreenshots,
      screenshotOnFailure: true,
    });
  } else {
    // List available test cases
    const testCases = recorder.listTestCases();

    if (testCases.length === 0) {
      console.log('⚠️  No recorded test cases found in ./steps/');
      console.log('   Run "npm run record" to record test steps first.\n');
      rl.close();
      return;
    }

    console.log(`📂 Found ${testCases.length} test case(s):\n`);
    testCases.forEach((tc, i) => {
      const steps = tc.testCase.steps.length;
      const tags = tc.testCase.tags.length > 0 ? ` [${tc.testCase.tags.join(', ')}]` : '';
      console.log(`  ${i + 1}. ${tc.testCase.name} (${steps} steps)${tags}`);
    });

    console.log('');
    const choice = await ask('Generate: [a]ll or enter number (e.g., 1,3): ');

    const options = {
      screenshotOnStep: hasScreenshots,
      screenshotOnFailure: true,
    };

    if (choice.toLowerCase() === 'a' || choice === '') {
      generator.generateAll(options);
    } else {
      const indices = choice.split(',').map((s) => parseInt(s.trim()) - 1);
      for (const idx of indices) {
        if (idx >= 0 && idx < testCases.length) {
          generator.generateFromFile(testCases[idx].path, options);
        }
      }
    }
  }

  console.log('\n🎉 Done! Run "npm test" to execute tests.\n');
  rl.close();
}

main().catch(console.error);
