// ---------------------------------------------------------------------------
// dist/game.html generator.
//
// Produces the single-file, fully self-contained build by hand-inlining every
// ES module into one <script type="module">. No bundler is involved: the script
// resolves the import graph itself, topologically sorts it, strips the
// import/export syntax (every module was written to be concatenation-safe — see
// CONTRACTS.md) and concatenates the result in dependency order.
//
// The only remaining external reference is the three.js CDN URL, which stays as
// a real `import * as THREE from '...'` at the top of the bundle so the file
// still works by double-clicking it (module scripts in a file:// page may load
// remote modules; it is the *relative* imports that browsers block, and those
// are exactly what this inlining removes).
//
// Usage:  node tools/inline.mjs [--check]
//   --check  verify dist/game.html is in sync with src/ instead of writing it.
// ---------------------------------------------------------------------------

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');
const ENTRY = resolve(ROOT, 'src/main.js');
const OUT = resolve(ROOT, 'dist/game.html');

const THREE_URL = 'https://unpkg.com/three@0.160.0/build/three.module.js';
const PLC_URL = 'https://unpkg.com/three@0.160.0/examples/jsm/controls/PointerLockControls.js';

/** Bare specifiers that must stay as real remote imports. */
const EXTERNAL = new Map([
  ['three', { url: THREE_URL, ns: 'THREE' }],
  ['three/examples/jsm/controls/PointerLockControls.js', { url: PLC_URL, ns: null }],
]);

// ---------------------------------------------------------------------------
// Module graph
// ---------------------------------------------------------------------------

const IMPORT_RE = /^[ \t]*import\s+(?:[\s\S]*?)\s*from\s*['"]([^'"]+)['"][ \t]*;?[ \t]*$/gm;
const BARE_IMPORT_RE = /^[ \t]*import\s*['"]([^'"]+)['"][ \t]*;?[ \t]*$/gm;

function readModule(file) {
  return readFileSync(file, 'utf8');
}

/** All relative specifiers a module imports. */
function depsOf(file, src) {
  const out = [];
  const scan = (re) => {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(src))) {
      const spec = m[1];
      if (EXTERNAL.has(spec)) continue;
      if (!spec.startsWith('.')) {
        throw new Error(`${relative(ROOT, file)}: unexpected bare import '${spec}'`);
      }
      out.push(resolve(dirname(file), spec));
    }
  };
  scan(IMPORT_RE);
  scan(BARE_IMPORT_RE);
  return out;
}

/** Depth-first topological sort of the import graph. */
function buildOrder(entry) {
  const order = [];
  const state = new Map();   // file -> 'visiting' | 'done'
  const sources = new Map();

  const visit = (file, stack) => {
    const s = state.get(file);
    if (s === 'done') return;
    if (s === 'visiting') {
      // A cycle is fine for hoisted function/class declarations, but the order
      // has to be deterministic, so we break it at the back-edge and warn.
      const cyc = [...stack.slice(stack.indexOf(file)), file].map((f) => relative(ROOT, f));
      console.warn('  ! import cycle: ' + cyc.join(' -> '));
      return;
    }
    state.set(file, 'visiting');
    const src = readModule(file);
    sources.set(file, src);
    for (const d of depsOf(file, src)) visit(d, [...stack, file]);
    state.set(file, 'done');
    order.push(file);
  };

  visit(entry, []);
  return { order, sources };
}

// ---------------------------------------------------------------------------
// Import / export stripping
// ---------------------------------------------------------------------------

/**
 * Remove module syntax so the file can be concatenated into one scope.
 * Because every top-level name in the project is globally unique (enforced by
 * tools/verify.mjs), `export` can simply be deleted.
 */
function stripModuleSyntax(src, file) {
  let out = src;

  // 1. Drop every relative import statement (single or multi-line).
  out = out.replace(/^[ \t]*import\s+[\s\S]*?\s+from\s*['"](\.[^'"]*)['"][ \t]*;?[ \t]*$/gm, '');
  out = out.replace(/^[ \t]*import\s*['"](\.[^'"]*)['"][ \t]*;?[ \t]*$/gm, '');

  // 2. Rewrite external imports. `import * as THREE from 'three'` is hoisted to
  //    the top of the bundle once, so remove it here.
  out = out.replace(/^[ \t]*import\s+\*\s+as\s+\w+\s+from\s*['"]three['"][ \t]*;?[ \t]*$/gm, '');
  out = out.replace(
    /^[ \t]*import\s*\{([^}]*)\}\s*from\s*['"]three['"][ \t]*;?[ \t]*$/gm,
    (_m, names) => `const {${names}} = THREE;`,
  );
  // PointerLockControls comes from a second remote module.
  out = out.replace(
    /^[ \t]*import\s*\{([^}]*)\}\s*from\s*['"]three\/examples\/jsm\/controls\/PointerLockControls\.js['"][ \t]*;?[ \t]*$/gm,
    (_m, names) => `const {${names}} = THREE_PLC;`,
  );

  // 3. `export` keyword removal.
  out = out.replace(/^[ \t]*export\s+(?=(?:async\s+)?(?:function|class|const|let|var)\b)/gm, '');
  // `export { a, b }` / `export { a as b }` re-export lists: drop them.
  out = out.replace(/^[ \t]*export\s*\{[^}]*\}[ \t]*;?[ \t]*$/gm, '');
  out = out.replace(/^[ \t]*export\s*\*\s*from[^\n]*$/gm, '');

  if (/^[ \t]*export\s+default/m.test(out)) {
    throw new Error(`${relative(ROOT, file)}: 'export default' is not concatenation-safe`);
  }
  const leftover = out.match(/^[ \t]*(import|export)\b[^\n]*/m);
  if (leftover) {
    throw new Error(`${relative(ROOT, file)}: unhandled module syntax: ${leftover[0].trim()}`);
  }
  return out;
}

// ---------------------------------------------------------------------------
// HTML assembly
// ---------------------------------------------------------------------------

function buildBundle() {
  console.log('resolving import graph from src/main.js …');
  const { order, sources } = buildOrder(ENTRY);
  console.log(`  ${order.length} modules`);

  const parts = [];
  let totalIn = 0;
  for (const file of order) {
    const rel = relative(ROOT, file).replace(/\\/g, '/');
    const src = sources.get(file);
    totalIn += src.length;
    const body = stripModuleSyntax(src, file).replace(/\n{3,}/g, '\n\n').trim();
    parts.push(
      `// ${'='.repeat(74)}\n// ${rel}\n// ${'='.repeat(74)}\n${body}\n`,
    );
  }

  const bundle = parts.join('\n');
  console.log(`  ${(totalIn / 1024).toFixed(0)} KB source -> ${(bundle.length / 1024).toFixed(0)} KB inlined`);
  return { bundle, count: order.length, order };
}

function buildHtml(bundle) {
  const stamp = new Date().toISOString().slice(0, 10);
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, user-scalable=no">
<title>Voxelcraft — Opus 5 (single file build)</title>
<!--
  ===========================================================================
  SELF-CONTAINED BUILD — generated ${stamp} by tools/inline.mjs
  ===========================================================================
  Every module from src/ is inlined below in dependency order. There is no
  bundler output here: the generator strips ES module syntax and concatenates
  the files, which is safe because every top-level name in the project is
  globally unique (enforced by tools/verify.mjs).

  Just open this file in a browser. The only network request is three.js from
  the CDN on first load; everything else — every texture, model, sound and
  mob skin — is generated procedurally in code.

  Do not edit this file by hand. Edit src/ and re-run:  node tools/inline.mjs
  ===========================================================================
-->
<style>
  html, body {
    margin: 0; padding: 0; width: 100%; height: 100%;
    overflow: hidden; background: #0b0d10; color: #e6e6e6;
    font-family: ui-monospace, "SF Mono", Menlo, Consolas, monospace;
  }
  #mc-root { position: fixed; inset: 0; }
  canvas { display: block; width: 100%; height: 100%; image-rendering: pixelated; }
  #mc-boot {
    position: fixed; inset: 0; z-index: 9999;
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    background: radial-gradient(120% 80% at 50% 0%, #2b3d55 0%, #141a22 55%, #0b0d10 100%);
    transition: opacity .5s ease;
  }
  #mc-boot.hidden { opacity: 0; pointer-events: none; }
  #mc-boot h1 {
    margin: 0 0 .35em; font-size: clamp(28px, 6vw, 58px); letter-spacing: .06em;
    font-weight: 700; text-shadow: 0 3px 0 #1b2430, 0 6px 18px rgba(0,0,0,.6);
  }
  #mc-boot .sub { opacity: .62; font-size: 13px; letter-spacing: .18em; text-transform: uppercase; }
  #mc-bar { margin-top: 26px; width: min(420px, 74vw); height: 14px; border: 2px solid #4a586b; background: #1b222c; padding: 2px; }
  #mc-bar > i { display: block; height: 100%; width: 0%; background: linear-gradient(#8bc34a, #5d9732); transition: width .25s ease; }
  #mc-status { margin-top: 12px; font-size: 12px; opacity: .75; min-height: 1.2em; }
  #mc-hint { margin-top: 34px; font-size: 12px; line-height: 1.9; opacity: .55; text-align: center; }
  #mc-hint b { color: #cfe3a3; font-weight: 600; }
  #mc-error {
    display: none; margin-top: 22px; max-width: min(620px, 88vw);
    border: 1px solid #7a3b3b; background: #2a1a1a; padding: 14px 16px;
    font-size: 12px; line-height: 1.6; color: #ffb9b9; white-space: pre-wrap; text-align: left;
  }
  #mc-play {
    margin-top: 30px; padding: 12px 34px; font: inherit; font-size: 15px;
    letter-spacing: .1em; text-transform: uppercase; cursor: pointer;
    color: #f2f7e8; background: #5d9732; border: 2px solid #3f6b21;
    box-shadow: inset 0 -3px 0 rgba(0,0,0,.25);
  }
  #mc-play:hover { background: #6cad3b; }
  #mc-play:active { transform: translateY(1px); }
</style>
</head>
<body>
<div id="mc-root" data-mc-managed="1"></div>

<div id="mc-boot">
  <h1>VOXELCRAFT</h1>
  <div class="sub">Opus 5 &middot; single-file build</div>
  <div id="mc-bar"><i></i></div>
  <div id="mc-status">initialising&hellip;</div>
  <button id="mc-play" style="display:none">Play</button>
  <div id="mc-hint">
    <b>WASD</b> move &nbsp; <b>Space</b> jump &nbsp; <b>Shift</b> sneak &nbsp; <b>Ctrl</b> sprint<br>
    <b>Left</b> mine &nbsp; <b>Right</b> place / use &nbsp; <b>1-9</b> hotbar &nbsp; <b>Wheel</b> cycle<br>
    <b>E</b> inventory &nbsp; <b>Q</b> drop &nbsp; <b>F</b> creative &nbsp; <b>F3</b> debug &nbsp; <b>F5</b> view &nbsp; <b>Esc</b> pause
  </div>
  <div id="mc-error"></div>
</div>

<script type="module">
import * as THREE from '${THREE_URL}';
import * as THREE_PLC from '${PLC_URL}';

const bootEl = document.getElementById('mc-boot');
const barEl = document.querySelector('#mc-bar > i');
const statusEl = document.getElementById('mc-status');
const errEl = document.getElementById('mc-error');
const playEl = document.getElementById('mc-play');
function MC_progress(pct, msg) {
  barEl.style.width = Math.round(pct * 100) + '%';
  if (msg) statusEl.textContent = msg;
}
function MC_fail(title, detail) {
  statusEl.textContent = title;
  errEl.style.display = 'block';
  errEl.textContent = detail;
}
window.addEventListener('error', (e) => MC_fail('Startup failed', e.message || 'unknown error'));

${bundle}

// ---------------------------------------------------------------------------
// boot
// ---------------------------------------------------------------------------
try {
  MC_progress(0.05, 'starting…');
  const MC_game = new Game(document.getElementById('mc-root'), {
    autoEnter: false,
    onProgress: (p, m) => MC_progress(0.05 + p * 0.95, m),
  });
  window.game = MC_game;
  await MC_game.start();
  MC_progress(1, 'ready');
  playEl.style.display = 'inline-block';
  statusEl.textContent = 'click Play to lock the mouse';
  playEl.addEventListener('click', () => {
    bootEl.classList.add('hidden');
    setTimeout(() => { bootEl.style.display = 'none'; }, 520);
    MC_game.enter();
  }, { once: true });
} catch (err) {
  MC_fail('Startup failed', (err && (err.stack || err.message)) || String(err));
  throw err;
}
</script>
</body>
</html>
`;
}

// ---------------------------------------------------------------------------
// main
// ---------------------------------------------------------------------------

const check = process.argv.includes('--check');
const { bundle, count } = buildBundle();
const html = buildHtml(bundle);

if (check) {
  if (!existsSync(OUT)) {
    console.error('FAIL: dist/game.html does not exist. Run: node tools/inline.mjs');
    process.exit(1);
  }
  const cur = readFileSync(OUT, 'utf8');
  const norm = (s) => s.replace(/generated \d{4}-\d{2}-\d{2}/, 'generated <date>');
  const a = createHash('sha256').update(norm(cur)).digest('hex');
  const b = createHash('sha256').update(norm(html)).digest('hex');
  if (a === b) {
    console.log(`PASS: dist/game.html is in sync with src/ (${count} modules)`);
  } else {
    console.error('FAIL: dist/game.html is STALE. Re-run: node tools/inline.mjs');
    process.exit(1);
  }
} else {
  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, html);
  console.log(`wrote dist/game.html — ${(html.length / 1024).toFixed(0)} KB, ${count} modules inlined`);
}
