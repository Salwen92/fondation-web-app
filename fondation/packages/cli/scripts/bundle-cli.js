#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { chmodSync, copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync } from 'node:fs';
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

    // Read package.json content to embed in bundle
    const packageJsonContent = readFileSync(join(__dirname, '..', 'package.json'), 'utf-8');
    const packageData = JSON.parse(packageJsonContent);
    
    // Bundle strategy: include most core dependencies, exclude heavy/optional ones
    const result = await build({
      entryPoints: ['dist/cli.js'],
      bundle: true,
      platform: 'node',
      target: 'node20',  // Upgrade to Node 20 for better compatibility
      format: 'cjs',
      outfile: 'dist/cli.bundled.cjs',
      define: {
        'import.meta.url': 'import_meta_url',
        // Embed package.json content as a string to avoid file system reads
        'process.env.PACKAGE_JSON': JSON.stringify(packageJsonContent),
        'process.env.PACKAGE_VERSION': JSON.stringify(packageData.version),
      },
      banner: {
        js: `const import_meta_url = require('url').pathToFileURL(__filename).toString();`,
      },
      external: [
        // CRITICAL: Keep Claude SDK external to preserve spawn functionality
        '@anthropic-ai/claude-code',
        '@anthropic-ai/*', // All Anthropic packages
        // Native Node modules that don't bundle well
        'child_process',
        'fs',
        'path',
        'crypto',
        'os',
        'util',
        // Heavy UI dependencies
        'react',
        'ink',
        // Build-time only
        '@babel/*',
        'typescript',
        'esbuild',
        '@biomejs/*',
        'vitest',
        '@vitest/*',
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

    // Copy ALL prompts directory files
    const promptsSrc = join(__dirname, '..', 'prompts');
    const promptsDest = join(__dirname, '..', 'dist', 'prompts');
    if (!existsSync(promptsDest)) {
      mkdirSync(promptsDest, { recursive: true });
    }

    // Copy all .md files from prompts directory
    const promptFiles = readdirSync(promptsSrc).filter(f => f.endsWith('.md'));
    for (const file of promptFiles) {
      copyFileSync(join(promptsSrc, file), join(promptsDest, file));
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
