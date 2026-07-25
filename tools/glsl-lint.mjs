// ---------------------------------------------------------------------------
// GLSL ES 1.00 linter.
//
// RawShaderMaterial compiles shaders as GLSL ES 1.00 and injects NOTHING — no
// precision qualifier, no built-in uniforms or attributes. A single GLSL 3.00
// construct makes the shader fail to compile, and a failed terrain shader means
// an invisible world with no obvious error. This catches that class of bug
// without a GPU. Run:  node tools/glsl-lint.mjs
// ---------------------------------------------------------------------------
import * as S from '../src/render/shaders.js';

const RULES = [
  { re: /(float|int|vec[234]|mat[234])\s*\[\s*\d+\s*\]\s*\(/, msg: 'array constructor = GLSL 3.00 only' },
  { re: /^\s*(in|out)\s+(vec|float|int|mat)/m, msg: 'in/out qualifiers = GLSL 3.00' },
  { re: /(^|[^2DEXT\w])texture\s*\(/m, msg: 'texture() = GLSL 3.00 (use texture2D)' },
  { re: /\btextureGrad\s*\(/, msg: 'textureGrad = GLSL 3.00' },
  { re: /\bgl_FragDepth\b/, msg: 'gl_FragDepth needs an extension' },
  { re: /\bswitch\s*\(/, msg: 'switch = GLSL 3.00' },
  { re: /\bfor\s*\(\s*(?!int|float)\w+\s+\w+\s*=/, msg: 'non-int loop counter is fragile' },
  { re: /\buint\b|\bivec[234]\b\s*\(\s*-/, msg: 'uint = GLSL 3.00' },
];
// Derivatives / LOD require extensions; only legal if a directive enables them.
const NEEDS_EXT = [
  { re: /\bdFdx\b|\bdFdy\b|\bfwidth\b/, ext: 'GL_OES_standard_derivatives' },
  { re: /texture2DGradEXT|texture2DLodEXT/, ext: 'GL_EXT_shader_texture_lod' },
];

let fails = 0;

/**
 * Every identifier a shader uses must be declared earlier in the SAME source.
 * A helper injected above its uniforms compiles to
 * "'uAtlas' : undeclared identifier" and the whole program fails to link.
 */
function checkDeclOrder(name, src) {
  const lines = src.split('\n');
  const declLine = {};
  const bad = [];
  const declRe = /^\s*(?:uniform|attribute|varying)\s+\w+\s+(\w+)/;
  lines.forEach((l, i) => {
    const m = l.match(declRe);
    if (m && declLine[m[1]] === undefined) declLine[m[1]] = i;
  });
  // Any use of a declared name must come after its declaration.
  for (const [nm, at] of Object.entries(declLine)) {
    const useRe = new RegExp('\\b' + nm + '\\b');
    for (let i = 0; i < at; i++) {
      const l = lines[i];
      if (!l.trim() || l.trim().startsWith('//') || l.trim().startsWith('#')) continue;
      if (l.match(declRe)) continue;
      if (useRe.test(l)) { bad.push(`'${nm}' used on line ${i + 1} but declared on line ${at + 1}`); break; }
    }
  }
  if (bad.length) { fails++; console.log('  FAIL ' + name + ' (declaration order)'); bad.forEach(b => console.log('        - ' + b)); }
  else console.log('  ok   ' + name + ' (declaration order)');
}

function check(name, src) {
  const bad = [];
  for (const r of RULES) if (r.re.test(src)) bad.push(r.msg);
  for (const n of NEEDS_EXT) {
    if (n.re.test(src) && !src.includes('#extension ' + n.ext)) {
      bad.push(`uses ${n.ext} feature without the #extension directive`);
    }
  }
  if (!/precision\s+(lowp|mediump|highp)\s+float/.test(src)) bad.push('no float precision declared');
  // #extension must precede all non-comment, non-preprocessor code.
  const lines = src.split('\n').map(l => l.trim()).filter(Boolean);
  const ext = lines.findIndex(l => l.startsWith('#extension'));
  const code = lines.findIndex(l => !l.startsWith('//') && !l.startsWith('#') && !l.startsWith('/*') && !l.startsWith('*'));
  if (ext !== -1 && code !== -1 && ext > code) bad.push('#extension appears AFTER code (fatal)');
  // Braces / parens must balance.
  const bal = (a, b) => (src.split(a).length - src.split(b).length);
  if (bal('{', '}') !== 0) bad.push('unbalanced braces');
  if (bal('(', ')') !== 0) bad.push('unbalanced parens');
  if (!/void\s+main\s*\(/.test(src)) bad.push('no main()');
  if (bad.length) { fails++; console.log('  FAIL ' + name); bad.forEach(b => console.log('        - ' + b)); }
  else console.log('  ok   ' + name);
}

console.log('=== вершинные/фрагментные шейдеры ===');
for (const n of Object.keys(S)) {
  const v = S[n];
  if (n === 'TERRAIN_FRAG') continue;   // assembled by buildTerrainFragment; checked below
  if (typeof v === 'string' && /void\s+main/.test(v)) check(n, v);
}
console.log('=== собранный фрагмент террейна (все 4 комбинации расширений) ===');
for (const g of [true, false]) for (const d of [true, false]) {
  const src = S.buildTerrainFragment(g, d);
  check(`buildTerrainFragment(grad=${g}, deriv=${d})`, src);
  checkDeclOrder(`buildTerrainFragment(grad=${g}, deriv=${d})`, src);
}
// Каждый uniform/attribute в шейдере должен быть объявлен (RawShaderMaterial
// не добавляет ничего автоматически).
console.log('=== RawShaderMaterial: встроенные значения объявлены вручную? ===');
const BUILTIN = ['modelViewMatrix','projectionMatrix','modelMatrix','viewMatrix','normalMatrix','cameraPosition','position','normal','uv','instanceMatrix'];
for (const n of ['TERRAIN_VERT','ENTITY_VERT','SKY_VERT','PARTICLE_VERT','FLAT_VERT','OVERLAY_VERT']) {
  let src = S[n]; if (!src) continue;
  // Strip comments so a word like "uv" in prose is not mistaken for real usage.
  src = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
  const used = BUILTIN.filter(b => new RegExp('\\b'+b+'\\b').test(src));
  const undecl = used.filter(b => !new RegExp('(uniform|attribute)\\s+\\w+\\s+'+b+'\\b').test(src));
  console.log((undecl.length ? '  FAIL ' : '  ok   ') + n + (undecl.length ? ' -> НЕ объявлены: ' + undecl.join(', ') : ''));
  if (undecl.length) fails++;
}
// A shader that declares position/uv/modelViewMatrix/projectionMatrix itself
// MUST be used with RawShaderMaterial. ShaderMaterial prepends its own copies
// and the compiler rejects the redefinition.
console.log('=== тип материала соответствует шейдеру? ===');
{
  const { readFileSync } = await import('node:fs');
  const { globSync } = await import('node:fs');
  const files = ['src/render/particles.js', 'src/render/chunkRenderer.js',
                 'src/render/entityRenderer.js', 'src/main.js'];
  for (const f of files) {
    let txt = '';
    try { txt = readFileSync(new URL('../' + f, import.meta.url), 'utf8'); } catch (e) { continue; }
    const usesPlain = /new\s+THREE\.ShaderMaterial\s*\(/.test(txt);
    if (usesPlain) {
      console.log('  FAIL ' + f + ' uses THREE.ShaderMaterial; these shaders declare their own built-ins and need RawShaderMaterial');
      fails++;
    } else {
      console.log('  ok   ' + f);
    }
  }
}

console.log(fails === 0 ? '\nВСЁ ЧИСТО' : `\n${fails} ПРОБЛЕМ`);
process.exit(fails ? 1 : 0);
