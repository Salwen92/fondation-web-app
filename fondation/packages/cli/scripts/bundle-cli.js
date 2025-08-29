#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { chmodSync, copyFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const __dirname = dirname(fileURLToPath(import.meta.url));
const isProduction = process.argv.includes('--production');

async function buildCLI() {
  try {
    // Ensure dist directory exists
    if (!existsSync('dist')) {
      mkdirSync('dist', { recursive: true });
    }
    const tscResult = spawnSync('npm', ['run', 'build'], {
      encoding: 'utf-8',
      shell: true,
    });

    if (tscResult.status !== 0) {
      process.exit(1);
    }

    // Bundle strategy: include most core dependencies, exclude heavy/optional ones
    const result = await build({
      entryPoints: ['dist/cli.js'],
      bundle: true,
      platform: 'node',
      target: 'node18',
      format: 'cjs',
      outfile: 'dist/cli.bundled.cjs',
      define: {
        'import.meta.url': 'import_meta_url',
      },
      banner: {
        js: `const import_meta_url = require('url').pathToFileURL(__filename).toString();`,
      },
      external: [
        // Only exclude heavy or platform-specific dependencies
        '@anthropic-ai/sdk', // Large, changes frequently
        'react', // Heavy UI dependency
        'ink', // Heavy UI dependency
        '@babel/*', // Build-time only
        'typescript', // Build-time only
        'esbuild', // Build-time only
        '@biomejs/*', // Linting
        'vitest', // Testing
        '@vitest/*', // Testing
        'node:*', // Node built-ins
      ],
      minify: isProduction,
      sourcemap: !isProduction,
      metafile: true,
      // Enable tree shaking
      treeShaking: true,
      // Optimize for size
      mainFields: ['module', 'main'],
    });

    // Report bundle size and analyze what was bundled
    if (result.metafile) {
      const outputs = Object.values(result.metafile.outputs);
      const mainOutput = outputs[0];
      if (mainOutput) {
        const sizeKB = (mainOutput.bytes / 1024).toFixed(2);
        const sizeMB = (mainOutput.bytes / 1024 / 1024).toFixed(2);
        console.log(`\n📦 Bundle created: ${sizeKB}KB (${sizeMB}MB)`);
        
        // Count bundled vs external modules
        const inputs = Object.keys(result.metafile.inputs);
        const nodeModules = inputs.filter(path => path.includes('node_modules')).length;
        const srcFiles = inputs.filter(path => !path.includes('node_modules')).length;
        console.log(`   - Source files: ${srcFiles}`);
        console.log(`   - Dependencies bundled: ${nodeModules}`);
      }
    }

    // Copy prompts directory
    const promptsDest = join(__dirname, '..', 'dist', 'prompts');
    if (!existsSync(promptsDest)) {
      mkdirSync(promptsDest, { recursive: true });
    }

    const generalPrompt = join(__dirname, '..', 'prompts', 'general.md');
    if (existsSync(generalPrompt)) {
      copyFileSync(generalPrompt, join(promptsDest, 'general.md'));
    }

    // Make the bundled file executable
    if (process.platform !== 'win32') {
      chmodSync('dist/cli.bundled.cjs', '755');
    }

    // Test the CLI
    const start = Date.now();
    const testResult = spawnSync('node', ['dist/cli.bundled.cjs', '--help'], {
      encoding: 'utf-8',
    });
    const duration = Date.now() - start;

    if (testResult.status === 0) {
      console.log(`\n✅ CLI test passed (${duration}ms)`);
    } else {
      console.error('\n❌ CLI test failed');
      if (testResult.error) {
        console.error('Error:', testResult.error);
      }
      if (testResult.stderr) {
        console.error('Stderr:', testResult.stderr);
      }
      if (testResult.stdout) {
        console.error('Stdout:', testResult.stdout);
      }
      console.error('Exit code:', testResult.status);
      process.exit(1);
    }
  } catch (_error) {
    process.exit(1);
  }
}

buildCLI();
