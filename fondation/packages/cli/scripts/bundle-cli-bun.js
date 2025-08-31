#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { chmodSync, copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const isProduction = process.argv.includes('--production');

async function buildCLI() {
  try {
    console.log('🔨 Starting CLI build process with Bun...');
    
    // Ensure dist directory exists
    if (!existsSync('dist')) {
      mkdirSync('dist', { recursive: true });
    }
    
    // TypeScript should already be built by the caller
    console.log('📦 Starting bundle process...');

    // Verify dist/cli.js exists
    if (!existsSync('dist/cli.js')) {
      throw new Error('dist/cli.js not found after TypeScript build');
    }
    
    // Step 2: Bundle with Bun (not esbuild!)
    console.log('📦 Bundling CLI with Bun...');
    
    const bundleArgs = [
      'build',
      'dist/cli.js',
      '--outfile', 'dist/cli.bundled.mjs',
      '--target', 'node',
      '--format', 'esm',
      '--external', '@anthropic-ai/claude-code',
      '--external', '@anthropic-ai/*',
      '--external', 'child_process',
      '--external', 'fs', 
      '--external', 'path',
      '--external', 'crypto',
      '--external', 'os',
      '--external', 'util',
      '--external', 'node:*'
    ];
    
    if (isProduction) {
      bundleArgs.push('--minify');
    }
    
    const bundleResult = spawnSync('bun', bundleArgs, {
      encoding: 'utf-8',
      shell: true,
      stdio: 'inherit',
    });

    if (bundleResult.status !== 0) {
      console.error('❌ Bun bundling failed');
      console.error('Exit code:', bundleResult.status);
      if (bundleResult.stderr) {
        console.error('Error:', bundleResult.stderr);
      }
      process.exit(1);
    }
    
    // Check bundle was created and get size
    if (existsSync('dist/cli.bundled.cjs')) {
      const stats = readFileSync('dist/cli.bundled.cjs');
      const sizeKB = (stats.length / 1024).toFixed(2);
      const sizeMB = (stats.length / 1024 / 1024).toFixed(2);
      console.log(`📦 Bundle created: ${sizeKB}KB (${sizeMB}MB)`);
    } else {
      throw new Error('Bundle file was not created');
    }
    
    console.log('✅ Bundle created successfully');

    // Step 3: Copy prompts directory
    console.log('📄 Copying prompts...');
    const promptsSrc = join(__dirname, '..', 'prompts');
    const promptsDest = join(__dirname, '..', 'dist', 'prompts');
    
    if (existsSync(promptsSrc)) {
      if (!existsSync(promptsDest)) {
        mkdirSync(promptsDest, { recursive: true });
      }

      const promptFiles = readdirSync(promptsSrc).filter(f => f.endsWith('.md'));
      for (const file of promptFiles) {
        copyFileSync(join(promptsSrc, file), join(promptsDest, file));
      }
      console.log(`✅ Copied ${promptFiles.length} prompt files`);
    } else {
      console.log('⚠️  No prompts directory found, skipping');
    }

    // Step 4: Make executable
    if (process.platform !== 'win32') {
      chmodSync('dist/cli.bundled.mjs', '755');
    }
    
    // Step 5: Test the CLI (simple version check only)
    console.log('🧪 Testing bundled CLI...');
    const testResult = spawnSync('node', ['dist/cli.bundled.mjs', '--version'], {
      encoding: 'utf-8',
      timeout: 5000, // 5 second timeout
    });

    if (testResult.status === 0 && testResult.stdout) {
      console.log('✅ CLI test passed');
      console.log(`   Version: ${testResult.stdout.trim()}`);
    } else {
      console.warn('⚠️  CLI version test failed, but continuing...');
      if (testResult.stderr) {
        console.warn('   Error:', testResult.stderr);
      }
    }
    
    console.log('🎉 Build process completed successfully!');
    console.log('📁 Output files:');
    console.log('   - dist/cli.bundled.mjs (bundled CLI)');
    console.log('   - dist/prompts/ (prompt templates)');

  } catch (error) {
    console.error('❌ Bundle build failed:');
    console.error('Error:', error.message);
    if (error.stack) {
      console.error('Stack:', error.stack);
    }
    process.exit(1);
  }
}

buildCLI();