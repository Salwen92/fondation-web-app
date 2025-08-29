// patch-esm-imports.js
import fs from 'node:fs';
import path from 'node:path';

const root = process.argv[2] || '/app/packages/cli/dist';
const exts = ['.js', '.mjs', '.cjs', '.json'];
const hasExt = s => exts.some(e => s.endsWith(e));

function patchFile(f) {
  let s = fs.readFileSync(f, 'utf8');
  const t = s;
  s = s.replace(/(from\s+['"])(\.\.?\/[^'"]+)(['"])/g,
    (m, a, sp, c) => hasExt(sp) ? m : `${a}${sp}.js${c}`);
  s = s.replace(/(import\(\s*['"])(\.\.?\/[^'"]+)(['"]\s*\))/g,
    (m, a, sp, c) => hasExt(sp) ? m : `${a}${sp}.js${c}`);
  if (s !== t) { fs.writeFileSync(f, s); console.log('Patched:', f); }
}

function walk(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p);
    else if (e.isFile() && p.endsWith('.js')) patchFile(p);
  }
}

console.log('Patching ESM imports under', root);
walk(root);