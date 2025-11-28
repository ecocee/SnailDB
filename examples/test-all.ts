/**
 * Test Runner for All Examples
 * Verifies that all examples compile and run correctly
 */

import { spawn } from 'child_process';
import path from 'path';

interface ExampleTest {
  name: string;
  file: string;
  description: string;
}

const EXAMPLES: ExampleTest[] = [
  {
    name: '01-ai-search',
    file: 'dist/examples/src/01-ai-search.js',
    description: 'AI-Powered Search Engine',
  },
  {
    name: '02-ecommerce',
    file: 'dist/examples/src/02-ecommerce.js',
    description: 'E-Commerce Recommendations',
  },
  {
    name: '03-llm-memory',
    file: 'dist/examples/src/03-llm-memory.js',
    description: 'LLM Conversation Memory',
  },
  {
    name: '04-analytics',
    file: 'dist/examples/src/04-analytics.js',
    description: 'Real-Time Analytics',
  },
  {
    name: '05-session-management',
    file: 'dist/examples/src/05-session-management.js',
    description: 'Session Management',
  },
  {
    name: '06-rate-limiting',
    file: 'dist/examples/src/06-rate-limiting.js',
    description: 'Rate Limiting',
  },
  {
    name: '07-cache-layer',
    file: 'dist/examples/src/07-cache-layer.js',
    description: 'Cache Layer',
  },
  {
    name: '08-queue-system',
    file: 'dist/examples/src/08-queue-system.js',
    description: 'Queue System',
  },
];

async function runExample(example: ExampleTest): Promise<{ success: boolean; output: string; error?: string }> {
  return new Promise((resolve) => {
    const examplePath = path.join(__dirname, '..', example.file);

    const process = spawn('node', [examplePath], {
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: 30000,
    });

    let output = '';
    let error = '';

    process.stdout.on('data', (data) => {
      output += data.toString();
    });

    process.stderr.on('data', (data) => {
      error += data.toString();
    });

    process.on('close', (code) => {
      resolve({
        success: code === 0,
        output,
        error: error || undefined,
      });
    });

    process.on('error', (err) => {
      resolve({
        success: false,
        output,
        error: err.message,
      });
    });

    // Timeout after 30 seconds
    setTimeout(() => {
      process.kill();
      resolve({
        success: false,
        output,
        error: 'Process timeout',
      });
    }, 30000);
  });
}

async function runAllTests() {
  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║          SNAILDB Examples Test Runner                  ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');

  console.log(`Found ${EXAMPLES.length} examples to test\n`);
  console.log('Prerequisites:');
  console.log('  ✓ npm run build (TypeScript compiled)');
  console.log('  ✓ SNAILDB server running on localhost:12222\n');

  let passed = 0;
  let failed = 0;

  for (const example of EXAMPLES) {
    const exampleNumber = example.name.split('-')[0];
    const exampleName = example.description;

    process.stdout.write(`[${exampleNumber}] Testing ${exampleName.padEnd(35)} ... `);

    const result = await runExample(example);

    if (result.success) {
      console.log('✅ PASSED');
      passed++;

      // Show key output indicators
      if (result.output.includes('✅ Example completed successfully')) {
        console.log('    └─ Example executed successfully\n');
      }
    } else {
      console.log('❌ FAILED');
      failed++;

      if (result.error) {
        console.log(`    Error: ${result.error.split('\n')[0]}\n`);
      }

      if (result.output) {
        console.log(`    Last output: ${result.output.split('\n').slice(-3).join('\n    ')}\n`);
      }
    }
  }

  // Summary
  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║                   TEST SUMMARY                         ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');

  console.log(`Total Tests: ${EXAMPLES.length}`);
  console.log(`✅ Passed:   ${passed}/${EXAMPLES.length}`);
  console.log(`❌ Failed:   ${failed}/${EXAMPLES.length}`);
  console.log(`Pass Rate:   ${((passed / EXAMPLES.length) * 100).toFixed(1)}%\n`);

  if (failed === 0) {
    console.log('🎉 All examples passed!\n');
    process.exit(0);
  } else {
    console.log(`⚠️  ${failed} example(s) failed. See details above.\n`);
    console.log('Troubleshooting:');
    console.log('  1. Verify npm run build completed without errors');
    console.log('  2. Check that SNAILDB server is running');
    console.log('  3. Review error messages for specific issues\n');
    process.exit(1);
  }
}

// Run tests
runAllTests().catch(console.error);
