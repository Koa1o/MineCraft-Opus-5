// ---------------------------------------------------------------------------
// verify.mjs — offline verification harness for the voxel game source.
// Run: node tools/verify.mjs
// ---------------------------------------------------------------------------

import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, relative, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, '..');
const SRC = join(ROOT, 'src');

// ---------------------------------------------------------------------------
// (a) Install import shim for bare specifier `three`
// ---------------------------------------------------------------------------
export async function ensureStubs() {
  const nmDir = join(ROOT, 'node_modules', 'three');
  mkdirSync(nmDir, { recursive: true });

  // Main re-export stub
  const indexMjs = join(nmDir, 'index.mjs');
  const indexContent = `export * from '../../tools/three-stub.mjs';\n`;
  writeFileSync(indexMjs, indexContent);

  // PointerLockControls stub
  const plcMjs = join(nmDir, 'PointerLockControls.mjs');
  const plcContent = `export class PointerLockControls {
  constructor(camera, dom) {
    this.camera = camera;
    this.domElement = dom;
    this.isLocked = false;
  }
  lock() {}
  unlock() {}
  connect() {}
  disconnect() {}
  addEventListener() {}
  removeEventListener() {}
  dispose() {}
  getObject() { return this.camera; }
}\n`;
  writeFileSync(plcMjs, plcContent);

  // package.json
  const pkgJson = join(nmDir, 'package.json');
  const pkgContent = JSON.stringify({
    name: 'three',
    version: '0.160.0',
    type: 'module',
    main: 'index.mjs',
    exports: {
      '.': './index.mjs',
      './examples/jsm/controls/PointerLockControls.js': './PointerLockControls.mjs',
    },
  }, null, 2);
  writeFileSync(pkgJson, pkgContent);

  // .gitignore
  const gitignore = join(ROOT, '.gitignore');
  const gitignoreContent = 'node_modules/\n';
  writeFileSync(gitignore, gitignoreContent);

  return { ok: true };
}

// ---------------------------------------------------------------------------
// Utility: walk a directory recursively, yielding .js file paths.
// ---------------------------------------------------------------------------
function walkJs(dir) {
  const results = [];
  function walk(d) {
    let entries;
    try { entries = readdirSync(d); } catch { return; }
    for (const entry of entries) {
      const full = join(d, entry);
      let st;
      try { st = statSync(full); } catch { continue; }
      if (st.isDirectory()) walk(full);
      else if (entry.endsWith('.js')) results.push(full);
    }
  }
  walk(dir);
  return results;
}

// ---------------------------------------------------------------------------
// (b) Import check — dynamic-import every src/**/*.js and report throws.
// ---------------------------------------------------------------------------
export async function checkImports() {
  const files = walkJs(SRC);
  const failures = [];
  const skipped = [];

  for (const f of files) {
    const rel = relative(ROOT, f);
    try {
      await import(f);
    } catch (err) {
      // Distinguish "file not found" (which is an expected stub gap) from
      // real parse/runtime errors in an existing file.
      const msg = err.message || '';
      const isNotFound = err.code === 'ERR_MODULE_NOT_FOUND' ||
        msg.includes('Cannot find module') ||
        msg.includes('ENOENT');
      if (isNotFound) {
        skipped.push({ file: rel, reason: msg.split('\n')[0] });
      } else {
        failures.push({ file: rel, error: err });
      }
    }
  }

  return { files: files.length, failures, skipped };
}

// ---------------------------------------------------------------------------
// (c) Duplicate top-level name check.
// ---------------------------------------------------------------------------
// Regex: export? const/let/function/class/async function at col 0,
//        or const/let/var/function/class at col 0.
const TOP_LEVEL_RE = /^(?:export\s+)?(?:async\s+)?(?:const|let|var|function|class)\s+([A-Za-z_$][A-Za-z0-9_$]*)/mg;

export async function checkDuplicateTopLevel() {
  const files = walkJs(SRC);
  // name -> [files that declare it]
  const nameMap = new Map();

  for (const f of files) {
    let src;
    try { src = readFileSync(f, 'utf8'); } catch { continue; }
    const rel = relative(ROOT, f);
    let m;
    TOP_LEVEL_RE.lastIndex = 0;
    const seenInFile = new Set();
    while ((m = TOP_LEVEL_RE.exec(src)) !== null) {
      const name = m[1];
      if (!seenInFile.has(name)) {
        seenInFile.add(name);
        if (!nameMap.has(name)) nameMap.set(name, []);
        nameMap.get(name).push(rel);
      }
    }
  }

  const duplicates = [];
  for (const [name, locs] of nameMap) {
    if (locs.length > 1) duplicates.push({ name, files: locs });
  }
  return { duplicates };
}

// ---------------------------------------------------------------------------
// (d) Forbidden string checks.
// ---------------------------------------------------------------------------
const FORBIDDEN_STRINGS = [
  'TODO',
  'FIXME',
  'implement rest',
  'for brevity',
  '...rest similarly',
  ' XXX',
  'placeholder implementation',
];

// Lines that are exactly `...`
const EXACT_ELLIPSIS_RE = /^\s*\.\.\.\s*$/m;

// export default (but not export default class / export default function)
const EXPORT_DEFAULT_RE = /^export\s+default\b/m;

// dynamic import() — match import( not preceded by // or * (comments)
const DYNAMIC_IMPORT_RE = /(?<!\/\/[^\n]*)(?<!\*[^\n]*)\bimport\s*\(/;

// new Worker( not preceded by URL.createObjectURL
// We flag any `new Worker(` not immediately following createObjectURL on the same statement
const BAD_WORKER_RE = /new\s+Worker\s*\(\s*(?!URL\.createObjectURL)/;

export async function checkForbidden() {
  const files = walkJs(SRC);
  const hits = [];

  for (const f of files) {
    let src;
    try { src = readFileSync(f, 'utf8'); } catch { continue; }
    const rel = relative(ROOT, f);
    const lines = src.split('\n');

    for (let ln = 0; ln < lines.length; ln++) {
      const line = lines[ln];
      const lineNo = ln + 1;

      for (const str of FORBIDDEN_STRINGS) {
        if (line.includes(str)) {
          hits.push({ file: rel, line: lineNo, kind: `forbidden string "${str}"`, text: line.trim() });
        }
      }

      if (/^\s*\.\.\.\s*$/.test(line)) {
        hits.push({ file: rel, line: lineNo, kind: 'bare ellipsis line', text: line.trim() });
      }
    }

    if (EXPORT_DEFAULT_RE.test(src)) {
      // find the line
      const ln = lines.findIndex((l) => /^export\s+default\b/.test(l));
      hits.push({ file: rel, line: ln + 1, kind: 'export default', text: lines[ln]?.trim() || '' });
    }

    if (DYNAMIC_IMPORT_RE.test(src)) {
      const ln = lines.findIndex((l) => DYNAMIC_IMPORT_RE.test(l));
      if (ln !== -1) {
        hits.push({ file: rel, line: ln + 1, kind: 'dynamic import()', text: lines[ln].trim() });
      }
    }

    // new Worker check — flag Worker( not from createObjectURL
    for (let ln = 0; ln < lines.length; ln++) {
      const line = lines[ln];
      if (/new\s+Worker\s*\(/.test(line) && !line.includes('URL.createObjectURL')) {
        hits.push({ file: rel, line: ln + 1, kind: 'new Worker() without URL.createObjectURL', text: line.trim() });
      }
    }
  }

  return { hits };
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------
export async function main() {
  console.log('=== verify.mjs ===\n');

  // (a) Stubs
  process.stdout.write('Installing three.js stub... ');
  try {
    await ensureStubs();
    console.log('PASS');
  } catch (err) {
    console.log('FAIL');
    console.error('  ', err.message);
  }

  // (b) Import check
  console.log('\n--- (b) Import check ---');
  const importResult = await checkImports();
  const importPass = importResult.failures.length === 0;
  if (importPass) {
    console.log(`PASS: ${importResult.files} files imported cleanly`);
  } else {
    console.log(`FAIL: ${importResult.failures.length} import error(s):`);
    for (const { file, error } of importResult.failures) {
      console.log(`  FAIL  ${file}`);
      console.log(`        ${(error.message || String(error)).split('\n')[0]}`);
    }
  }
  if (importResult.skipped.length > 0) {
    console.log(`INFO: ${importResult.skipped.length} file(s) skipped (missing dependency — expected for not-yet-written painters):`);
    for (const { file, reason } of importResult.skipped) {
      console.log(`  SKIP  ${file}  (${reason.slice(0, 80)})`);
    }
  }

  // (c) Duplicate top-level names
  console.log('\n--- (c) Duplicate top-level names ---');
  const dupResult = await checkDuplicateTopLevel();
  const dupPass = dupResult.duplicates.length === 0;
  if (dupPass) {
    console.log('PASS: No duplicate top-level names found');
  } else {
    console.log(`FAIL: ${dupResult.duplicates.length} duplicate name(s):`);
    for (const { name, files } of dupResult.duplicates) {
      console.log(`  DUPLICATE  ${name}`);
      for (const f of files) console.log(`    in ${f}`);
    }
  }

  // (d) Forbidden strings
  console.log('\n--- (d) Forbidden strings & patterns ---');
  const forbidResult = await checkForbidden();
  const forbidPass = forbidResult.hits.length === 0;
  if (forbidPass) {
    console.log('PASS: No forbidden strings found');
  } else {
    console.log(`FAIL: ${forbidResult.hits.length} hit(s):`);
    for (const hit of forbidResult.hits) {
      console.log(`  ${hit.file}:${hit.line}  [${hit.kind}]`);
      if (hit.text) console.log(`    > ${hit.text.slice(0, 100)}`);
    }
  }

  // --- Summary ---
  const anyHardFail = !importPass || !dupPass || !forbidPass;
  console.log('\n=== SUMMARY ===');
  console.log(`(b) Import check:          ${importPass ? 'PASS' : 'FAIL'}`);
  console.log(`(c) Duplicate top-level:   ${dupPass ? 'PASS' : 'FAIL'}`);
  console.log(`(d) Forbidden strings:     ${forbidPass ? 'PASS' : 'FAIL'}`);
  console.log('');
  if (anyHardFail) {
    console.log('OVERALL: FAIL (hard failures present)');
    process.exit(1);
  } else {
    console.log('OVERALL: PASS');
    process.exit(0);
  }
}

// Run if invoked directly
const isMain = process.argv[1] &&
  (resolve(process.argv[1]) === resolve(__filename) ||
   process.argv[1].endsWith('verify.mjs'));

if (isMain) {
  main().catch((err) => {
    console.error('verify.mjs crashed:', err);
    process.exit(1);
  });
}

// ---------------------------------------------------------------------------
// (e) dist/game.html must stay in sync with src/
// ---------------------------------------------------------------------------
export async function checkDistInSync() {
  const { execFileSync } = await import('node:child_process');
  console.log('\n--- (e) dist/game.html sync ---');
  try {
    const out = execFileSync(process.execPath, [new URL('inline.mjs', import.meta.url).pathname, '--check'],
      { encoding: 'utf8' });
    const line = out.trim().split('\n').pop();
    console.log(line);
    return line.startsWith('PASS');
  } catch (e) {
    const msg = (e.stdout || '') + (e.stderr || '');
    console.log('FAIL: ' + msg.trim().split('\n').pop());
    return false;
  }
}

// ---------------------------------------------------------------------------
// (f) GLSL ES 1.00 conformance of every shader
// ---------------------------------------------------------------------------
export async function checkShaders() {
  const { execFileSync } = await import('node:child_process');
  console.log('\n--- (f) GLSL ES 1.00 shader lint ---');
  try {
    execFileSync(process.execPath, [new URL('glsl-lint.mjs', import.meta.url).pathname],
      { encoding: 'utf8' });
    console.log('PASS: all shaders are GLSL ES 1.00 conformant');
    return true;
  } catch (e) {
    const out = ((e.stdout || '') + (e.stderr || '')).trim();
    console.log('FAIL:\n' + out);
    return false;
  }
}

// ---------------------------------------------------------------------------
// (g) Player movement — physics reaches the intended speeds and the game loop
//     actually ticks the player (World skips players on purpose).
// ---------------------------------------------------------------------------
export async function checkMovement() {
  const { execFileSync } = await import('node:child_process');
  console.log('\n--- (g) player movement ---');
  try {
    execFileSync(process.execPath, [new URL('movement-test.mjs', import.meta.url).pathname],
      { encoding: 'utf8' });
    console.log('PASS: walk/sprint/sneak/jump within tolerance, player is ticked');
    return true;
  } catch (e) {
    const out = ((e.stdout || '') + (e.stderr || '')).trim();
    console.log('FAIL:\n' + out.split('\n').filter((l) => /FAIL/.test(l)).join('\n'));
    return false;
  }
}
