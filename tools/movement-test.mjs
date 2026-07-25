// ---------------------------------------------------------------------------
// Player movement regression test.
//
// The player is deliberately skipped by World._tickEntities() ("ticked by their
// controller"), so nothing but the game loop advances player physics. That wire
// was missing entirely — Player.updatePhysics() had zero callers and the player
// could not move at all. Separately, acceleration was specified as a fraction of
// the target speed while friction is multiplicative, which settles at 8x too
// slow. Both are silent failures, so they get a test.
//
// Runs against a minimal flat world, no renderer and no DOM.
// Usage:  node tools/movement-test.mjs
// ---------------------------------------------------------------------------

import { createBlockRegistry } from '../src/world/blockDefs.js';
import { Player } from '../src/player/player.js';

const { registry, flags } = createBlockRegistry();
const MOVETEST_STONE = registry.id('stone');
const MOVETEST_FLOOR_Y = 64;

/** Infinite flat floor, everything above is air. */
function movetestWorld() {
  return {
    registry, flags,
    getBlock: (x, y, z) => (y === MOVETEST_FLOOR_Y ? MOVETEST_STONE : 0),
    getMeta: () => 0, setBlock() {}, setMeta() {}, markDirty() {},
    isSolid: (x, y, z) => y === MOVETEST_FLOOR_Y,
    getLight: () => 15, getSkyLight: () => 15, getBlockLight: () => 0,
    biomeAt: () => ({ id: 0, name: 'test', rain: true }),
    heightAt: () => MOVETEST_FLOOR_Y + 1,
    spawnParticles() {}, playSound() {}, dropItem() {},
    entities: [], players: [],
    rand: { next: () => 0.5, range: (a) => a, chance: () => false, int: () => 0 },
    tickCount: 0, timeOfDay: 6000, dimension: 'overworld',
    raycast: () => null, spawnEntity() {}, explode() {},
  };
}

const MOVETEST_NO_INPUT = {
  forward: false, back: false, left: false, right: false,
  jump: false, sneak: false, sprint: false,
};

let movetestFails = 0;
function movetestAssert(label, ok, detail) {
  if (ok) console.log('  ok   ' + label + (detail ? '  (' + detail + ')' : ''));
  else { movetestFails++; console.log('  FAIL ' + label + '  ' + detail); }
}

/** Blocks per second reached while holding `input` for one second. */
function movetestSpeed(p, world, input, ticks = 60) {
  p.pos.x = 0.5; p.pos.y = MOVETEST_FLOOR_Y + 1; p.pos.z = 0.5;
  p.vel.x = 0; p.vel.y = 0; p.vel.z = 0;
  p.yaw = 0; p.pitch = 0;
  p.isSprinting = false; p.isCrouching = false;
  for (let i = 0; i < 5; i++) p.tick(world, MOVETEST_NO_INPUT, registry);
  p.pos.x = 0.5; p.pos.z = 0.5; p.vel.x = 0; p.vel.z = 0;
  for (let i = 0; i < ticks; i++) p.tick(world, { ...MOVETEST_NO_INPUT, ...input }, registry);
  const d = Math.hypot(p.pos.x - 0.5, p.pos.z - 0.5);
  return d / (ticks / 20);
}

const world = movetestWorld();
const player = new Player(world, registry, flags);

console.log('=== player is tickable ===');
movetestAssert('Player.tick exists', typeof player.tick === 'function',
  'without it nothing advances player physics');

console.log('\n=== walk / sprint / sneak speeds (blocks per second) ===');
const walk = movetestSpeed(player, world, { forward: true });
const back = movetestSpeed(player, world, { back: true });
const left = movetestSpeed(player, world, { left: true });
const right = movetestSpeed(player, world, { right: true });
const sprint = movetestSpeed(player, world, { forward: true, sprint: true });
const sneak = movetestSpeed(player, world, { forward: true, sneak: true });
const diag = movetestSpeed(player, world, { forward: true, right: true });

// Minecraft reference: walk 4.317, sprint 5.612, sneak 1.3 blocks/s.
movetestAssert('walk ≈ 4.32', walk > 3.8 && walk < 4.8, walk.toFixed(2));
movetestAssert('sprint ≈ 5.61', sprint > 5.0 && sprint < 6.2, sprint.toFixed(2));
movetestAssert('sprint faster than walk', sprint > walk * 1.15,
  sprint.toFixed(2) + ' vs ' + walk.toFixed(2));
movetestAssert('sneak ≈ 1.3', sneak > 0.9 && sneak < 1.8, sneak.toFixed(2));
movetestAssert('all four directions equal', Math.max(walk, back, left, right)
  - Math.min(walk, back, left, right) < 0.25,
  [walk, back, left, right].map((v) => v.toFixed(2)).join(' / '));
movetestAssert('diagonal not faster than straight', diag < walk * 1.1,
  diag.toFixed(2));

console.log('\n=== jump ===');
player.pos.x = 0.5; player.pos.y = MOVETEST_FLOOR_Y + 1; player.pos.z = 0.5;
player.vel.x = 0; player.vel.y = 0; player.vel.z = 0;
for (let i = 0; i < 5; i++) player.tick(world, MOVETEST_NO_INPUT, registry);
const jumpBase = player.pos.y;
let jumpPeak = jumpBase;
for (let i = 0; i < 40; i++) {
  player.tick(world, { ...MOVETEST_NO_INPUT, jump: true }, registry);
  if (player.pos.y > jumpPeak) jumpPeak = player.pos.y;
}
const jumpHeight = jumpPeak - jumpBase;
movetestAssert('jump ≈ 1.25 blocks', jumpHeight > 1.0 && jumpHeight < 1.7,
  jumpHeight.toFixed(2));

console.log('\n=== gravity / landing ===');
player.pos.y = MOVETEST_FLOOR_Y + 12;
player.vel.y = 0;
for (let i = 0; i < 120; i++) player.tick(world, MOVETEST_NO_INPUT, registry);
movetestAssert('falls and lands on the floor',
  Math.abs(player.pos.y - (MOVETEST_FLOOR_Y + 1)) < 0.05 && player.onGround,
  'y=' + player.pos.y.toFixed(3) + ' onGround=' + player.onGround);

console.log('\n=== the game loop must feed input to the player ===');
const mainSrc = await (await import('node:fs')).promises
  .readFile(new URL('../src/main.js', import.meta.url), 'utf8');
movetestAssert('main.js calls player.tick', /player\.tick\s*\(/.test(mainSrc),
  'World skips players on purpose, so the loop must do it');
movetestAssert('player ticked on the fixed timestep',
  /ticksRun/.test(mainSrc) && /player\.tick/.test(mainSrc),
  'per-frame ticking would make speed depend on framerate');
const ctrlSrc = await (await import('node:fs')).promises
  .readFile(new URL('../src/player/controls.js', import.meta.url), 'utf8');
movetestAssert('controls clear input in place, not by replacing the object',
  !/_onPointerLockChange[\s\S]{0,240}this\._input = CTRL_DEFAULT_INPUT\(\)/.test(ctrlSrc),
  'replacing it detaches the reference the loop holds');

console.log(movetestFails === 0
  ? '\nALL MOVEMENT CHECKS PASS'
  : `\n${movetestFails} MOVEMENT CHECKS FAILED`);
process.exit(movetestFails ? 1 : 0);
