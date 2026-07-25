// ---------------------------------------------------------------------------
// Mob model definitions. All top-level names prefixed MOBMODEL_.
// UV layout: part occupies w=2*(pw+pd), h=pd+ph from its uv=[u,v] origin.
// Every model below has been verified to have no overlapping UV extents
// within 64x64 (shared-UV mirror pairs are explicitly noted).
// ---------------------------------------------------------------------------

import { part, defineModel, quadrupedParts, bipedParts } from './model.js';

// ---------------------------------------------------------------------------
export function registerMobModels() {

  // ---- PIG ----------------------------------------------------------------
  // head 8x8x8 @(0,0)=32x16; snout 4x3x2 @(32,0)=12x5
  // body 8x8x16 @(0,16)=48x24; leg 4x12x4 @(0,40)=16x16
  defineModel('pig', {
    parts: [
      part('body',  { size:[8,8,16],  pivot:[0,12,0],  offset:[-4,-4,-8],  uv:[0,16] }),
      part('head',  { size:[8,8,8],   pivot:[0,16,8],  offset:[-4,-8,0],   uv:[0,0] }),
      part('snout', { size:[4,3,2],   pivot:[0,15,13], offset:[-2,-3,0],   uv:[32,0] }),
      part('leg_fr',{ size:[4,12,4],  pivot:[3,12,5],  offset:[-2,-12,-2], uv:[0,40] }),
      part('leg_fl',{ size:[4,12,4],  pivot:[-3,12,5], offset:[-2,-12,-2], uv:[0,40], mirror:true }),
      part('leg_br',{ size:[4,12,4],  pivot:[3,12,-5], offset:[-2,-12,-2], uv:[0,40] }),
      part('leg_bl',{ size:[4,12,4],  pivot:[-3,12,-5],offset:[-2,-12,-2], uv:[0,40], mirror:true }),
    ],
    eyeHeight:0.95, shadowRadius:0.5, rig:'quadruped',
  });

  // ---- COW ----------------------------------------------------------------
  // head @(0,0)=32x16; horn_r @(32,0)=4x5; horn_l @(36,0)=4x5
  // udder @(40,0)=24x10; body @(0,16)=48x26; leg @(48,16)=16x16
  defineModel('cow', {
    parts: [
      part('body',  { size:[8,10,16], pivot:[0,13,0],  offset:[-4,-5,-8],  uv:[0,16] }),
      part('head',  { size:[8,8,8],   pivot:[0,17,8],  offset:[-4,-8,0],   uv:[0,0] }),
      part('horn_r',{ size:[1,4,1],   pivot:[3,22,6],  offset:[0,0,-1],    uv:[32,0] }),
      part('horn_l',{ size:[1,4,1],   pivot:[-3,22,6], offset:[-1,0,-1],   uv:[36,0] }),
      part('udder', { size:[6,4,6],   pivot:[0,6,0],   offset:[-3,-4,-3],  uv:[40,0] }),
      part('leg_fr',{ size:[4,12,4],  pivot:[3,12,6],  offset:[-2,-12,-2], uv:[48,16] }),
      part('leg_fl',{ size:[4,12,4],  pivot:[-3,12,6], offset:[-2,-12,-2], uv:[48,16], mirror:true }),
      part('leg_br',{ size:[4,12,4],  pivot:[3,12,-5], offset:[-2,-12,-2], uv:[48,16] }),
      part('leg_bl',{ size:[4,12,4],  pivot:[-3,12,-5],offset:[-2,-12,-2], uv:[48,16], mirror:true }),
    ],
    eyeHeight:1.3, shadowRadius:0.7, rig:'quadruped',
  });

  // ---- MOOSHROOM (same geometry as cow) -----------------------------------
  defineModel('mooshroom', {
    parts: [
      part('body',  { size:[8,10,16], pivot:[0,13,0],  offset:[-4,-5,-8],  uv:[0,16] }),
      part('head',  { size:[8,8,8],   pivot:[0,17,8],  offset:[-4,-8,0],   uv:[0,0] }),
      part('horn_r',{ size:[1,4,1],   pivot:[3,22,6],  offset:[0,0,-1],    uv:[32,0] }),
      part('horn_l',{ size:[1,4,1],   pivot:[-3,22,6], offset:[-1,0,-1],   uv:[36,0] }),
      part('udder', { size:[6,4,6],   pivot:[0,6,0],   offset:[-3,-4,-3],  uv:[40,0] }),
      part('leg_fr',{ size:[4,12,4],  pivot:[3,12,6],  offset:[-2,-12,-2], uv:[48,16] }),
      part('leg_fl',{ size:[4,12,4],  pivot:[-3,12,6], offset:[-2,-12,-2], uv:[48,16], mirror:true }),
      part('leg_br',{ size:[4,12,4],  pivot:[3,12,-5], offset:[-2,-12,-2], uv:[48,16] }),
      part('leg_bl',{ size:[4,12,4],  pivot:[-3,12,-5],offset:[-2,-12,-2], uv:[48,16], mirror:true }),
    ],
    eyeHeight:1.3, shadowRadius:0.7, rig:'quadruped',
  });

  // ---- SHEEP --------------------------------------------------------------
  // head 6x8x6 @(0,0)=24x14; body 10x8x16 @(0,14)=52x24; leg 4x12x4 @(0,38)=16x16
  defineModel('sheep', {
    parts: [
      part('body',  { size:[10,8,16], pivot:[0,13,0],  offset:[-5,-4,-8],  uv:[0,14] }),
      part('head',  { size:[6,8,6],   pivot:[0,17,7],  offset:[-3,-8,0],   uv:[0,0] }),
      part('leg_fr',{ size:[4,12,4],  pivot:[3,12,6],  offset:[-2,-12,-2], uv:[0,38] }),
      part('leg_fl',{ size:[4,12,4],  pivot:[-3,12,6], offset:[-2,-12,-2], uv:[0,38], mirror:true }),
      part('leg_br',{ size:[4,12,4],  pivot:[3,12,-5], offset:[-2,-12,-2], uv:[0,38] }),
      part('leg_bl',{ size:[4,12,4],  pivot:[-3,12,-5],offset:[-2,-12,-2], uv:[0,38], mirror:true }),
    ],
    eyeHeight:1.25, shadowRadius:0.7, rig:'quadruped',
  });

  // ---- SHEEP_SHEARED (smaller body) ----------------------------------------
  defineModel('sheep_sheared', {
    parts: [
      part('body',  { size:[8,8,14],  pivot:[0,12,0],  offset:[-4,-4,-7],  uv:[0,14] }),
      part('head',  { size:[6,8,6],   pivot:[0,16,7],  offset:[-3,-8,0],   uv:[0,0] }),
      part('leg_fr',{ size:[4,12,4],  pivot:[3,12,5],  offset:[-2,-12,-2], uv:[0,38] }),
      part('leg_fl',{ size:[4,12,4],  pivot:[-3,12,5], offset:[-2,-12,-2], uv:[0,38], mirror:true }),
      part('leg_br',{ size:[4,12,4],  pivot:[3,12,-4], offset:[-2,-12,-2], uv:[0,38] }),
      part('leg_bl',{ size:[4,12,4],  pivot:[-3,12,-4],offset:[-2,-12,-2], uv:[0,38], mirror:true }),
    ],
    eyeHeight:1.2, shadowRadius:0.65, rig:'quadruped',
  });

  // ---- CHICKEN ------------------------------------------------------------
  // body 6x8x8 @(0,0)=28x16; head 6x6x6 @(28,0)=24x12
  // beak 2x2x4 @(0,16)=12x6; wattle 2x3x1 @(12,16)=6x4
  // wing 6x6x2 @(18,16)=16x8; leg 1x5x1 @(34,16)=4x6
  defineModel('chicken', {
    parts: [
      part('body',  { size:[6,8,8],  pivot:[0,10,0],  offset:[-3,-4,-4], uv:[0,0] }),
      part('head',  { size:[6,6,6],  pivot:[0,16,4],  offset:[-3,-6,0],  uv:[28,0] }),
      part('beak',  { size:[2,2,4],  pivot:[0,15,7],  offset:[-1,-2,0],  uv:[0,16] }),
      part('wattle',{ size:[2,3,1],  pivot:[0,13,7],  offset:[-1,-3,0],  uv:[12,16] }),
      part('wing_r',{ size:[6,6,2],  pivot:[3,13,0],  offset:[0,-3,-1],  uv:[18,16] }),
      part('wing_l',{ size:[6,6,2],  pivot:[-3,13,0], offset:[-6,-3,-1], uv:[18,16], mirror:true }),
      part('leg_r', { size:[1,5,1],  pivot:[2,5,1],   offset:[0,-5,0],   uv:[34,16] }),
      part('leg_l', { size:[1,5,1],  pivot:[-2,5,1],  offset:[-1,-5,0],  uv:[38,16] }),
    ],
    eyeHeight:0.9, shadowRadius:0.3, rig:'bird',
  });

  // ---- RABBIT -------------------------------------------------------------
  // body 6x8x5 @(0,0)=22x13; head 5x5x5 @(22,0)=20x10
  // ear_r 2x7x1 @(42,0)=6x8; ear_l @(48,0)=6x8
  // leg_fr 3x6x3 @(0,13)=12x9; leg_br 4x8x4 @(12,13)=16x12
  // tail 3x3x2 @(28,13)=10x5
  defineModel('rabbit', {
    parts: [
      part('body',  { size:[6,8,5],  pivot:[0,10,0],  offset:[-3,-8,-3], uv:[0,0] }),
      part('head',  { size:[5,5,5],  pivot:[0,14,3],  offset:[-2,-5,0],  uv:[22,0] }),
      part('ear_r', { size:[2,7,1],  pivot:[1,18,3],  offset:[0,0,-1],   uv:[42,0] }),
      part('ear_l', { size:[2,7,1],  pivot:[-1,18,3], offset:[-2,0,-1],  uv:[48,0] }),
      part('tail',  { size:[3,3,2],  pivot:[0,10,-3], offset:[-1,-3,-2], uv:[28,13] }),
      part('leg_fr',{ size:[3,6,3],  pivot:[2,6,2],   offset:[-1,-6,-1], uv:[0,13] }),
      part('leg_fl',{ size:[3,6,3],  pivot:[-2,6,2],  offset:[-2,-6,-1], uv:[0,13], mirror:true }),
      part('leg_br',{ size:[4,8,4],  pivot:[2,8,-2],  offset:[-2,-8,-2], uv:[12,13] }),
      part('leg_bl',{ size:[4,8,4],  pivot:[-2,8,-2], offset:[-2,-8,-2], uv:[12,13], mirror:true }),
    ],
    scale:0.6, eyeHeight:0.8, shadowRadius:0.3, rig:'quadruped',
  });

  // ---- HORSE --------------------------------------------------------------
  // head 6x8x6 @(0,0)=24x14; snout 4x4x4 @(24,0)=16x8
  // ear_r 2x4x2 @(40,0)=8x6; ear_l @(48,0)=8x6
  // leg 4x12x4 @(0,14)=16x16 (all legs share UV)
  // neck 4x10x4 @(16,14)=16x14; mane 2x8x4 @(32,14)=12x12; tail 4x12x4 @(44,14)=16x16
  // body 10x12x14 @(0,30)=48x26
  defineModel('horse', {
    parts: [
      part('body',  { size:[10,12,14], pivot:[0,16,0],  offset:[-5,-6,-7],  uv:[0,30] }),
      part('neck',  { size:[4,10,4],   pivot:[0,24,9],  offset:[-2,-10,0],  uv:[16,14], rotation:[-0.4,0,0] }),
      part('head',  { size:[6,8,6],    pivot:[0,30,11], offset:[-3,-8,0],   uv:[0,0] }),
      part('snout', { size:[4,4,4],    pivot:[0,26,15], offset:[-2,-4,0],   uv:[24,0] }),
      part('ear_r', { size:[2,4,2],    pivot:[2,34,11], offset:[0,0,-1],    uv:[40,0] }),
      part('ear_l', { size:[2,4,2],    pivot:[-2,34,11],offset:[-2,0,-1],   uv:[48,0] }),
      part('mane',  { size:[2,8,4],    pivot:[0,32,10], offset:[-1,-8,-2],  uv:[32,14] }),
      part('tail',  { size:[4,12,4],   pivot:[0,22,-7], offset:[-2,-12,-4], uv:[44,14] }),
      part('leg_fr',{ size:[4,12,4],   pivot:[3,12,8],  offset:[-2,-12,-2], uv:[0,14] }),
      part('leg_fl',{ size:[4,12,4],   pivot:[-3,12,8], offset:[-2,-12,-2], uv:[0,14], mirror:true }),
      part('leg_br',{ size:[4,12,4],   pivot:[3,12,-8], offset:[-2,-12,-2], uv:[0,14] }),
      part('leg_bl',{ size:[4,12,4],   pivot:[-3,12,-8],offset:[-2,-12,-2], uv:[0,14], mirror:true }),
    ],
    eyeHeight:1.6, shadowRadius:0.9, rig:'quadruped',
  });

  // ---- DONKEY (shorter, bigger ears) -------------------------------------
  defineModel('donkey', {
    parts: [
      part('body',  { size:[10,12,14], pivot:[0,14,0],  offset:[-5,-6,-7],  uv:[0,30] }),
      part('neck',  { size:[4,10,4],   pivot:[0,22,9],  offset:[-2,-10,0],  uv:[16,14], rotation:[-0.4,0,0] }),
      part('head',  { size:[6,8,6],    pivot:[0,28,11], offset:[-3,-8,0],   uv:[0,0] }),
      part('snout', { size:[4,4,4],    pivot:[0,24,15], offset:[-2,-4,0],   uv:[24,0] }),
      part('ear_r', { size:[2,7,1],    pivot:[2,32,11], offset:[0,0,-1],    uv:[40,0] }),
      part('ear_l', { size:[2,7,1],    pivot:[-2,32,11],offset:[-2,0,-1],   uv:[48,0] }),
      part('mane',  { size:[2,8,4],    pivot:[0,30,10], offset:[-1,-8,-2],  uv:[32,14] }),
      part('tail',  { size:[3,10,3],   pivot:[0,18,-7], offset:[-1,-10,-3], uv:[44,14] }),
      part('leg_fr',{ size:[4,12,4],   pivot:[3,12,8],  offset:[-2,-12,-2], uv:[0,14] }),
      part('leg_fl',{ size:[4,12,4],   pivot:[-3,12,8], offset:[-2,-12,-2], uv:[0,14], mirror:true }),
      part('leg_br',{ size:[4,12,4],   pivot:[3,12,-8], offset:[-2,-12,-2], uv:[0,14] }),
      part('leg_bl',{ size:[4,12,4],   pivot:[-3,12,-8],offset:[-2,-12,-2], uv:[0,14], mirror:true }),
    ],
    scale:0.9, eyeHeight:1.4, shadowRadius:0.8, rig:'quadruped',
  });

  // ---- MULE ---------------------------------------------------------------
  defineModel('mule', {
    parts: [
      part('body',  { size:[10,12,14], pivot:[0,14,0],  offset:[-5,-6,-7],  uv:[0,30] }),
      part('neck',  { size:[4,10,4],   pivot:[0,22,9],  offset:[-2,-10,0],  uv:[16,14], rotation:[-0.4,0,0] }),
      part('head',  { size:[6,8,6],    pivot:[0,28,11], offset:[-3,-8,0],   uv:[0,0] }),
      part('snout', { size:[4,4,4],    pivot:[0,24,15], offset:[-2,-4,0],   uv:[24,0] }),
      part('ear_r', { size:[2,6,1],    pivot:[2,33,11], offset:[0,0,-1],    uv:[40,0] }),
      part('ear_l', { size:[2,6,1],    pivot:[-2,33,11],offset:[-2,0,-1],   uv:[48,0] }),
      part('mane',  { size:[2,8,4],    pivot:[0,30,10], offset:[-1,-8,-2],  uv:[32,14] }),
      part('tail',  { size:[3,10,3],   pivot:[0,18,-7], offset:[-1,-10,-3], uv:[44,14] }),
      part('leg_fr',{ size:[4,12,4],   pivot:[3,12,8],  offset:[-2,-12,-2], uv:[0,14] }),
      part('leg_fl',{ size:[4,12,4],   pivot:[-3,12,8], offset:[-2,-12,-2], uv:[0,14], mirror:true }),
      part('leg_br',{ size:[4,12,4],   pivot:[3,12,-8], offset:[-2,-12,-2], uv:[0,14] }),
      part('leg_bl',{ size:[4,12,4],   pivot:[-3,12,-8],offset:[-2,-12,-2], uv:[0,14], mirror:true }),
    ],
    scale:0.95, eyeHeight:1.4, shadowRadius:0.8, rig:'quadruped',
  });

  // ---- LLAMA --------------------------------------------------------------
  // head 6x8x6 @(0,0)=24x14; neck 4x14x4 @(24,0)=16x18
  // chest_r 4x6x8 @(40,0)=24x14; body 8x10x16 @(0,18)=48x26
  // leg 4x14x4 @(48,18)=16x18; chest_l @(0,44)=24x14
  defineModel('llama', {
    parts: [
      part('body',  { size:[8,10,16], pivot:[0,18,0],  offset:[-4,-5,-8],  uv:[0,18] }),
      part('neck',  { size:[4,14,4],  pivot:[0,26,8],  offset:[-2,-14,0],  uv:[24,0], rotation:[-0.5,0,0] }),
      part('head',  { size:[6,8,6],   pivot:[0,36,10], offset:[-3,-8,0],   uv:[0,0] }),
      part('chest_r',{ size:[4,6,8], pivot:[6,20,0],  offset:[0,-6,-4],   uv:[40,0] }),
      part('chest_l',{ size:[4,6,8], pivot:[-6,20,0], offset:[-4,-6,-4],  uv:[0,44] }),
      part('leg_fr',{ size:[4,14,4],  pivot:[3,14,7],  offset:[-2,-14,-2], uv:[48,18] }),
      part('leg_fl',{ size:[4,14,4],  pivot:[-3,14,7], offset:[-2,-14,-2], uv:[48,18], mirror:true }),
      part('leg_br',{ size:[4,14,4],  pivot:[3,14,-7], offset:[-2,-14,-2], uv:[48,18] }),
      part('leg_bl',{ size:[4,14,4],  pivot:[-3,14,-7],offset:[-2,-14,-2], uv:[48,18], mirror:true }),
    ],
    eyeHeight:1.87, shadowRadius:0.7, rig:'quadruped',
  });

  // ---- CAT ----------------------------------------------------------------
  // body 6x8x10 @(0,0)=32x18; head 6x6x6 @(0,18)=24x12
  // ear_r 2x2x1 @(24,18)=6x3; ear_l @(30,18)=6x3
  // tail 2x12x2 @(36,18)=8x14; leg 2x8x2 @(0,30)=8x10 (all legs share)
  defineModel('cat', {
    parts: [
      part('body',  { size:[6,8,10], pivot:[0,10,0],  offset:[-3,-4,-5], uv:[0,0] }),
      part('head',  { size:[6,6,6],  pivot:[0,14,5],  offset:[-3,-6,0],  uv:[0,18] }),
      part('ear_r', { size:[2,2,1],  pivot:[2,19,3],  offset:[0,0,-1],   uv:[24,18] }),
      part('ear_l', { size:[2,2,1],  pivot:[-2,19,3], offset:[-2,0,-1],  uv:[30,18] }),
      part('tail',  { size:[2,12,2], pivot:[0,8,-5],  offset:[-1,-12,-2],uv:[36,18], rotation:[0.8,0,0] }),
      part('leg_fr',{ size:[2,8,2],  pivot:[2,8,4],   offset:[-1,-8,-1], uv:[0,30] }),
      part('leg_fl',{ size:[2,8,2],  pivot:[-2,8,4],  offset:[-1,-8,-1], uv:[0,30], mirror:true }),
      part('leg_br',{ size:[2,8,2],  pivot:[2,8,-3],  offset:[-1,-8,-1], uv:[0,30] }),
      part('leg_bl',{ size:[2,8,2],  pivot:[-2,8,-3], offset:[-1,-8,-1], uv:[0,30], mirror:true }),
    ],
    scale:0.8, eyeHeight:0.85, shadowRadius:0.35, rig:'quadruped',
  });

  // ---- OCELOT (same geometry as cat) --------------------------------------
  defineModel('ocelot', {
    parts: [
      part('body',  { size:[6,8,10], pivot:[0,10,0],  offset:[-3,-4,-5], uv:[0,0] }),
      part('head',  { size:[6,6,6],  pivot:[0,14,5],  offset:[-3,-6,0],  uv:[0,18] }),
      part('ear_r', { size:[2,2,1],  pivot:[2,19,3],  offset:[0,0,-1],   uv:[24,18] }),
      part('ear_l', { size:[2,2,1],  pivot:[-2,19,3], offset:[-2,0,-1],  uv:[30,18] }),
      part('tail',  { size:[2,12,2], pivot:[0,8,-5],  offset:[-1,-12,-2],uv:[36,18], rotation:[0.8,0,0] }),
      part('leg_fr',{ size:[2,8,2],  pivot:[2,8,4],   offset:[-1,-8,-1], uv:[0,30] }),
      part('leg_fl',{ size:[2,8,2],  pivot:[-2,8,4],  offset:[-1,-8,-1], uv:[0,30], mirror:true }),
      part('leg_br',{ size:[2,8,2],  pivot:[2,8,-3],  offset:[-1,-8,-1], uv:[0,30] }),
      part('leg_bl',{ size:[2,8,2],  pivot:[-2,8,-3], offset:[-1,-8,-1], uv:[0,30], mirror:true }),
    ],
    scale:0.85, eyeHeight:0.85, shadowRadius:0.35, rig:'quadruped',
  });

  // ---- WOLF ---------------------------------------------------------------
  // body 6x8x10 @(0,0)=32x18; head 6x6x6 @(0,18)=24x12
  // snout 4x3x4 @(24,18)=16x7; ear_r 2x3x1 @(40,18)=6x4; ear_l @(46,18)=6x4
  // tail 2x8x2 @(52,18)=8x10; leg 2x10x2 @(0,30)=8x12
  defineModel('wolf', {
    parts: [
      part('body',  { size:[6,8,10], pivot:[0,12,0],  offset:[-3,-4,-5], uv:[0,0] }),
      part('head',  { size:[6,6,6],  pivot:[0,16,5],  offset:[-3,-6,0],  uv:[0,18] }),
      part('snout', { size:[4,3,4],  pivot:[0,14,8],  offset:[-2,-3,0],  uv:[24,18] }),
      part('ear_r', { size:[2,3,1],  pivot:[2,21,3],  offset:[0,0,-1],   uv:[40,18] }),
      part('ear_l', { size:[2,3,1],  pivot:[-2,21,3], offset:[-2,0,-1],  uv:[46,18] }),
      part('tail',  { size:[2,8,2],  pivot:[0,11,-5], offset:[-1,-8,-2], uv:[52,18], rotation:[0.9,0,0] }),
      part('leg_fr',{ size:[2,10,2], pivot:[2,10,4],  offset:[-1,-10,-1],uv:[0,30] }),
      part('leg_fl',{ size:[2,10,2], pivot:[-2,10,4], offset:[-1,-10,-1],uv:[0,30], mirror:true }),
      part('leg_br',{ size:[2,10,2], pivot:[2,10,-3], offset:[-1,-10,-1],uv:[0,30] }),
      part('leg_bl',{ size:[2,10,2], pivot:[-2,10,-3],offset:[-1,-10,-1],uv:[0,30], mirror:true }),
    ],
    scale:0.9, eyeHeight:1.0, shadowRadius:0.45, rig:'quadruped',
  });

  // ---- PARROT -------------------------------------------------------------
  // body 6x8x6 @(0,0)=24x14; head 6x6x6 @(24,0)=24x12
  // beak 2x3x2 @(48,0)=8x5; tail 4x8x3 @(0,14)=14x11
  // wing 5x8x2 @(14,14)=14x10; leg 1x5x1 @(28,14)=4x6
  defineModel('parrot', {
    parts: [
      part('body',  { size:[6,8,6],  pivot:[0,12,0],  offset:[-3,-4,-3], uv:[0,0] }),
      part('head',  { size:[6,6,6],  pivot:[0,18,2],  offset:[-3,-6,0],  uv:[24,0] }),
      part('beak',  { size:[2,3,2],  pivot:[0,16,7],  offset:[-1,-3,0],  uv:[48,0] }),
      part('tail',  { size:[4,8,3],  pivot:[0,8,-3],  offset:[-2,-8,-3], uv:[0,14], rotation:[0.5,0,0] }),
      part('wing_r',{ size:[5,8,2],  pivot:[3,16,0],  offset:[0,-4,-1],  uv:[14,14] }),
      part('wing_l',{ size:[5,8,2],  pivot:[-3,16,0], offset:[-5,-4,-1], uv:[14,14], mirror:true }),
      part('leg_r', { size:[1,5,1],  pivot:[2,6,1],   offset:[0,-5,0],   uv:[28,14] }),
      part('leg_l', { size:[1,5,1],  pivot:[-2,6,1],  offset:[-1,-5,0],  uv:[32,14] }),
    ],
    scale:0.6, eyeHeight:1.1, shadowRadius:0.25, rig:'bird',
  });

  // ---- FOX ----------------------------------------------------------------
  // body 8x6x12 @(0,0)=40x18; head 8x8x8 @(0,18)=32x16
  // ear_r 2x4x1 @(32,18)=6x5; ear_l @(38,18)=6x5
  // tail 4x9x4 @(44,18)=16x13; leg 2x8x2 @(0,34)=8x10
  defineModel('fox', {
    parts: [
      part('body',  { size:[8,6,12], pivot:[0,10,0],  offset:[-4,-3,-6], uv:[0,0] }),
      part('head',  { size:[8,8,8],  pivot:[0,14,6],  offset:[-4,-8,0],  uv:[0,18] }),
      part('ear_r', { size:[2,4,1],  pivot:[3,21,4],  offset:[0,0,-1],   uv:[32,18] }),
      part('ear_l', { size:[2,4,1],  pivot:[-3,21,4], offset:[-2,0,-1],  uv:[38,18] }),
      part('tail',  { size:[4,9,4],  pivot:[0,8,-6],  offset:[-2,-9,-4], uv:[44,18], rotation:[0.8,0,0] }),
      part('leg_fr',{ size:[2,8,2],  pivot:[3,8,5],   offset:[-1,-8,-1], uv:[0,34] }),
      part('leg_fl',{ size:[2,8,2],  pivot:[-3,8,5],  offset:[-1,-8,-1], uv:[0,34], mirror:true }),
      part('leg_br',{ size:[2,8,2],  pivot:[3,8,-4],  offset:[-1,-8,-1], uv:[0,34] }),
      part('leg_bl',{ size:[2,8,2],  pivot:[-3,8,-4], offset:[-1,-8,-1], uv:[0,34], mirror:true }),
    ],
    scale:0.8, eyeHeight:0.95, shadowRadius:0.4, rig:'quadruped',
  });

  // ---- BEE ----------------------------------------------------------------
  // body 6x8x8 @(0,0)=28x16; head 6x6x6 @(28,0)=24x12
  // wing 8x4x1 @(0,16)=18x5; stinger 2x2x3 @(18,16)=10x5
  // legs: tiny 5x1x1 each @(28,16)=12x2 shared
  defineModel('bee', {
    parts: [
      part('body',  { size:[6,8,8],  pivot:[0,10,0],  offset:[-3,-4,-4], uv:[0,0] }),
      part('head',  { size:[6,6,6],  pivot:[0,14,4],  offset:[-3,-6,0],  uv:[28,0] }),
      part('wing_r',{ size:[8,4,1],  pivot:[3,16,1],  offset:[0,0,-1],   uv:[0,16] }),
      part('wing_l',{ size:[8,4,1],  pivot:[-3,16,1], offset:[-8,0,-1],  uv:[0,16], mirror:true }),
      part('stinger',{size:[2,2,3],  pivot:[0,8,-4],  offset:[-1,-1,-3], uv:[18,16] }),
      part('leg_fr',{ size:[5,1,1],  pivot:[3,9,2],   offset:[0,0,0],    uv:[28,16] }),
      part('leg_fl',{ size:[5,1,1],  pivot:[-3,9,2],  offset:[-5,0,0],   uv:[28,18] }),
      part('leg_mr',{ size:[5,1,1],  pivot:[3,9,0],   offset:[0,0,0],    uv:[28,20] }),
      part('leg_ml',{ size:[5,1,1],  pivot:[-3,9,0],  offset:[-5,0,0],   uv:[28,22] }),
      part('leg_br',{ size:[5,1,1],  pivot:[3,9,-2],  offset:[0,0,0],    uv:[28,24] }),
      part('leg_bl',{ size:[5,1,1],  pivot:[-3,9,-2], offset:[-5,0,0],   uv:[28,26] }),
    ],
    scale:0.6, eyeHeight:0.8, shadowRadius:0.35, rig:'bird',
  });

  // ---- TURTLE -------------------------------------------------------------
  // body 14x6x18 @(0,0)=64x24; head 5x5x5 @(0,24)=20x10
  // leg_fr 4x3x8 @(20,24)=24x11; leg_br 5x3x6 @(0,35)=22x9
  defineModel('turtle', {
    parts: [
      part('body',  { size:[14,6,18], pivot:[0,6,0],   offset:[-7,-3,-9], uv:[0,0] }),
      part('head',  { size:[5,5,5],   pivot:[0,8,9],   offset:[-2,-5,0],  uv:[0,24] }),
      part('leg_fr',{ size:[4,3,8],   pivot:[7,4,6],   offset:[0,-3,-4],  uv:[20,24] }),
      part('leg_fl',{ size:[4,3,8],   pivot:[-7,4,6],  offset:[-4,-3,-4], uv:[20,24], mirror:true }),
      part('leg_br',{ size:[5,3,6],   pivot:[6,4,-6],  offset:[0,-3,-3],  uv:[0,35] }),
      part('leg_bl',{ size:[5,3,6],   pivot:[-6,4,-6], offset:[-5,-3,-3], uv:[0,35], mirror:true }),
    ],
    eyeHeight:0.4, shadowRadius:0.7, rig:'quadruped',
  });

  // ---- GOAT ---------------------------------------------------------------
  // head 8x8x8 @(0,0)=32x16; horn_r 1x6x1 @(32,0)=4x7; horn_l @(36,0)
  // beard 2x4x1 @(40,0)=6x5; body 8x10x16 @(0,16)=48x26; leg 3x12x3 @(48,16)=12x15
  defineModel('goat', {
    parts: [
      part('body',  { size:[8,10,16], pivot:[0,14,0],  offset:[-4,-5,-8], uv:[0,16] }),
      part('head',  { size:[8,8,8],   pivot:[0,18,8],  offset:[-4,-8,0],  uv:[0,0] }),
      part('horn_r',{ size:[1,6,1],   pivot:[2,24,6],  offset:[0,0,-1],   uv:[32,0] }),
      part('horn_l',{ size:[1,6,1],   pivot:[-2,24,6], offset:[-1,0,-1],  uv:[36,0] }),
      part('beard', { size:[2,4,1],   pivot:[0,13,10], offset:[-1,-4,0],  uv:[40,0] }),
      part('leg_fr',{ size:[3,12,3],  pivot:[3,12,6],  offset:[-1,-12,-1],uv:[48,16] }),
      part('leg_fl',{ size:[3,12,3],  pivot:[-3,12,6], offset:[-2,-12,-1],uv:[48,16], mirror:true }),
      part('leg_br',{ size:[3,12,3],  pivot:[3,12,-5], offset:[-1,-12,-1],uv:[48,16] }),
      part('leg_bl',{ size:[3,12,3],  pivot:[-3,12,-5],offset:[-2,-12,-1],uv:[48,16], mirror:true }),
    ],
    eyeHeight:1.3, shadowRadius:0.55, rig:'quadruped',
  });

  // ---- SNIFFER ------------------------------------------------------------
  // head 10x10x10 @(0,0)=40x20; leg 5x14x5 @(40,0)=20x19
  // body 12x14x18 @(0,20)=60x32; snout 8x6x6 @(0,52)=28x12
  defineModel('sniffer', {
    parts: [
      part('body',  { size:[12,14,18], pivot:[0,18,0],  offset:[-6,-7,-9],  uv:[0,20] }),
      part('head',  { size:[10,10,10], pivot:[0,22,9],  offset:[-5,-10,0],  uv:[0,0] }),
      part('snout', { size:[8,6,6],    pivot:[0,18,17], offset:[-4,-6,0],   uv:[0,52] }),
      part('leg_fr',{ size:[5,14,5],   pivot:[5,14,8],  offset:[-2,-14,-2], uv:[40,0] }),
      part('leg_fl',{ size:[5,14,5],   pivot:[-5,14,8], offset:[-3,-14,-2], uv:[40,0], mirror:true }),
      part('leg_br',{ size:[5,14,5],   pivot:[5,14,-8], offset:[-2,-14,-2], uv:[40,0] }),
      part('leg_bl',{ size:[5,14,5],   pivot:[-5,14,-8],offset:[-3,-14,-2], uv:[40,0], mirror:true }),
    ],
    scale:1.1, eyeHeight:1.7, shadowRadius:1.0, rig:'quadruped',
  });

  // ---- CAMEL --------------------------------------------------------------
  // head 6x8x6 @(0,0)=24x14; snout 4x3x4 @(24,0)=16x7
  // ear_r 2x4x2 @(40,0)=8x6; ear_l @(48,0)=8x6
  // neck 4x10x4 @(0,14)=16x14; hump 8x6x6 @(16,14)=28x12
  // leg 4x14x4 @(44,0)=16x18; body 10x10x14 @(0,28)=48x24
  defineModel('camel', {
    parts: [
      part('body',  { size:[10,10,14], pivot:[0,22,0],  offset:[-5,-5,-7],  uv:[0,28] }),
      part('hump',  { size:[8,6,6],    pivot:[0,30,2],  offset:[-4,-6,-3],  uv:[16,14] }),
      part('neck',  { size:[4,10,4],   pivot:[0,28,9],  offset:[-2,-10,0],  uv:[0,14], rotation:[-0.3,0,0] }),
      part('head',  { size:[6,8,6],    pivot:[0,34,12], offset:[-3,-8,0],   uv:[0,0] }),
      part('snout', { size:[4,3,4],    pivot:[0,30,16], offset:[-2,-3,0],   uv:[24,0] }),
      part('ear_r', { size:[2,4,2],    pivot:[2,37,12], offset:[0,0,-1],    uv:[24,7] }),
      part('ear_l', { size:[2,4,2],    pivot:[-2,37,12],offset:[-2,0,-1],   uv:[32,7] }),
      part('leg_fr',{ size:[4,14,4],   pivot:[4,18,8],  offset:[-2,-14,-2], uv:[44,0] }),
      part('leg_fl',{ size:[4,14,4],   pivot:[-4,18,8], offset:[-2,-14,-2], uv:[44,0], mirror:true }),
      part('leg_br',{ size:[4,14,4],   pivot:[4,18,-8], offset:[-2,-14,-2], uv:[44,0] }),
      part('leg_bl',{ size:[4,14,4],   pivot:[-4,18,-8],offset:[-2,-14,-2], uv:[44,0], mirror:true }),
    ],
    eyeHeight:2.3, shadowRadius:0.9, rig:'quadruped',
  });

  // ---- ARMADILLO ----------------------------------------------------------
  // body 10x8x12 @(0,0)=44x20; head 7x6x7 @(0,20)=28x13
  // leg 3x6x3 @(28,20)=12x9
  defineModel('armadillo', {
    parts: [
      part('body',  { size:[10,8,12], pivot:[0,10,0],  offset:[-5,-4,-6], uv:[0,0] }),
      part('head',  { size:[7,6,7],   pivot:[0,12,6],  offset:[-3,-6,0],  uv:[0,20] }),
      part('leg_fr',{ size:[3,6,3],   pivot:[3,6,4],   offset:[-1,-6,-1], uv:[28,20] }),
      part('leg_fl',{ size:[3,6,3],   pivot:[-3,6,4],  offset:[-2,-6,-1], uv:[28,20], mirror:true }),
      part('leg_br',{ size:[3,6,3],   pivot:[3,6,-4],  offset:[-1,-6,-1], uv:[28,20] }),
      part('leg_bl',{ size:[3,6,3],   pivot:[-3,6,-4], offset:[-2,-6,-1], uv:[28,20], mirror:true }),
    ],
    scale:0.7, eyeHeight:0.6, shadowRadius:0.4, rig:'quadruped',
  });

  // ---- BAT ----------------------------------------------------------------
  // body 4x6x4 @(0,0)=16x10; head 5x5x5 @(16,0)=20x10
  // ear_r 3x5x1 @(36,0)=8x6; ear_l @(44,0)=8x6
  // wing 12x6x1 @(0,10)=26x7; leg 1x4x1 @(0,18)=4x5
  defineModel('bat', {
    parts: [
      part('body',  { size:[4,6,4],  pivot:[0,10,0],  offset:[-2,-3,-2], uv:[0,0] }),
      part('head',  { size:[5,5,5],  pivot:[0,14,0],  offset:[-2,-5,-2], uv:[16,0] }),
      part('ear_r', { size:[3,5,1],  pivot:[2,18,-1], offset:[0,0,-1],   uv:[36,0] }),
      part('ear_l', { size:[3,5,1],  pivot:[-2,18,-1],offset:[-3,0,-1],  uv:[44,0] }),
      part('wing_r',{ size:[12,6,1], pivot:[2,12,0],  offset:[0,0,-1],   uv:[0,10], rotation:[0,0,-0.5] }),
      part('wing_l',{ size:[12,6,1], pivot:[-2,12,0], offset:[-12,0,-1], uv:[0,10], mirror:true, rotation:[0,0,0.5] }),
      part('leg_r', { size:[1,4,1],  pivot:[2,6,1],   offset:[0,-4,0],   uv:[0,18] }),
      part('leg_l', { size:[1,4,1],  pivot:[-2,6,1],  offset:[-1,-4,0],  uv:[4,18] }),
    ],
    scale:0.5, eyeHeight:0.85, shadowRadius:0.25, rig:'bird',
  });

  // ---- ALLAY --------------------------------------------------------------
  // body 5x7x3 @(0,0)=16x10; head 6x6x6 @(16,0)=24x12
  // arm 2x7x2 @(40,0)=8x9; wing 8x10x1 @(0,12)=18x11
  defineModel('allay', {
    parts: [
      part('body',  { size:[5,7,3],  pivot:[0,10,0],  offset:[-2,-7,-1], uv:[0,0] }),
      part('head',  { size:[6,6,6],  pivot:[0,10,0],  offset:[-3,0,-3],  uv:[16,0] }),
      part('arm_r', { size:[2,7,2],  pivot:[3,9,0],   offset:[0,-7,-1],  uv:[40,0] }),
      part('arm_l', { size:[2,7,2],  pivot:[-3,9,0],  offset:[-2,-7,-1], uv:[40,0], mirror:true }),
      part('wing_r',{ size:[8,10,1], pivot:[1,10,-1], offset:[0,-10,-1], uv:[0,12], rotation:[0,0.3,0] }),
      part('wing_l',{ size:[8,10,1], pivot:[-1,10,-1],offset:[-8,-10,-1],uv:[0,12], mirror:true, rotation:[0,-0.3,0] }),
    ],
    scale:0.35, eyeHeight:1.0, shadowRadius:0.2, rig:'custom',
  });

  // ---- STRIDER ------------------------------------------------------------
  // body 12x10x12 @(0,0)=48x22; head 10x8x10 @(0,22)=40x18
  // leg 4x16x4 @(40,22)=16x20
  defineModel('strider', {
    parts: [
      part('body',  { size:[12,10,12], pivot:[0,18,0],  offset:[-6,-5,-6],  uv:[0,0] }),
      part('head',  { size:[10,8,10],  pivot:[0,26,0],  offset:[-5,-8,-5],  uv:[0,22] }),
      part('leg_r', { size:[4,16,4],   pivot:[5,16,0],  offset:[-2,-16,-2], uv:[40,22] }),
      part('leg_l', { size:[4,16,4],   pivot:[-5,16,0], offset:[-2,-16,-2], uv:[40,22], mirror:true }),
    ],
    eyeHeight:1.7, shadowRadius:0.7, rig:'custom',
  });

  // ---- VILLAGER -----------------------------------------------------------
  // Using bipedParts gives: head@(0,0)=32x16; body@(16,16)=20x16; arm@(40,16)=16x16; leg@(0,16)=16x16
  // nose 2x4x2 @(24,0)=8x6 -- collides with head@(0,0)=32x16 -> move nose to (32,0)=8x6
  // robe 8x16x4 @(0,32)=24x20
  defineModel('villager', {
    parts: [
      ...bipedParts({ headUV:[0,0], bodyUV:[16,16], armUV:[40,16], legUV:[0,16] }),
      part('nose',{ size:[2,4,2], pivot:[0,28,4], offset:[-1,-4,0], uv:[32,0] }),
      part('robe',{ size:[8,16,4],pivot:[0,24,0], offset:[-4,-16,-2],uv:[0,32], inflate:0.5 }),
    ],
    eyeHeight:1.62, shadowRadius:0.5, rig:'biped',
  });

  // ---- WANDERING_TRADER ---------------------------------------------------
  defineModel('wandering_trader', {
    parts: [
      ...bipedParts({ headUV:[0,0], bodyUV:[16,16], armUV:[40,16], legUV:[0,16] }),
      part('nose',{ size:[2,4,2], pivot:[0,28,4], offset:[-1,-4,0], uv:[32,0] }),
      part('robe',{ size:[8,16,4],pivot:[0,24,0], offset:[-4,-16,-2],uv:[0,32], inflate:0.5 }),
    ],
    eyeHeight:1.62, shadowRadius:0.5, rig:'biped',
  });

  // ---- FISH (cod) ---------------------------------------------------------
  // body 8x6x8 @(0,0)=32x14; tail 6x6x1 @(0,14)=14x7
  // fin_r 3x4x1 @(14,14)=8x5; fin_top 6x4x1 @(22,14)=14x5
  defineModel('cod', {
    parts: [
      part('body',   { size:[8,6,8], pivot:[0,6,0], offset:[-4,-3,-4], uv:[0,0] }),
      part('tail',   { size:[6,6,1], pivot:[0,6,-4],offset:[-3,-3,-1], uv:[0,14] }),
      part('fin_r',  { size:[3,4,1], pivot:[4,7,0], offset:[0,-2,0],   uv:[14,14] }),
      part('fin_l',  { size:[3,4,1], pivot:[-4,7,0],offset:[-3,-2,0],  uv:[14,14], mirror:true }),
      part('fin_top',{ size:[6,4,1], pivot:[0,10,0],offset:[-3,0,0],   uv:[22,14] }),
    ],
    scale:0.7, eyeHeight:0.35, shadowRadius:0.3, rig:'fish',
  });

  // ---- SALMON -------------------------------------------------------------
  defineModel('salmon', {
    parts: [
      part('body',   { size:[8,6,8], pivot:[0,6,0], offset:[-4,-3,-4], uv:[0,0] }),
      part('tail',   { size:[6,6,1], pivot:[0,6,-4],offset:[-3,-3,-1], uv:[0,14] }),
      part('fin_r',  { size:[3,4,1], pivot:[4,7,0], offset:[0,-2,0],   uv:[14,14] }),
      part('fin_l',  { size:[3,4,1], pivot:[-4,7,0],offset:[-3,-2,0],  uv:[14,14], mirror:true }),
      part('fin_top',{ size:[6,4,1], pivot:[0,10,0],offset:[-3,0,0],   uv:[22,14] }),
    ],
    scale:0.9, eyeHeight:0.35, shadowRadius:0.3, rig:'fish',
  });

  // ---- TROPICAL_FISH ------------------------------------------------------
  defineModel('tropical_fish', {
    parts: [
      part('body',   { size:[6,6,8], pivot:[0,6,0], offset:[-3,-3,-4], uv:[0,0] }),
      part('tail',   { size:[5,6,1], pivot:[0,6,-4],offset:[-2,-3,-1], uv:[0,14] }),
      part('fin_r',  { size:[2,4,1], pivot:[3,7,0], offset:[0,-2,0],   uv:[12,14] }),
      part('fin_l',  { size:[2,4,1], pivot:[-3,7,0],offset:[-2,-2,0],  uv:[12,14], mirror:true }),
      part('fin_top',{ size:[5,4,1], pivot:[0,9,0], offset:[-2,0,0],   uv:[20,14] }),
    ],
    scale:0.5, eyeHeight:0.35, shadowRadius:0.2, rig:'fish',
  });

  // ---- PUFFERFISH ---------------------------------------------------------
  // body 10x10x10 @(0,0)=40x20; tail 5x6x1 @(0,20)=12x7
  // fin_r 3x4x1 @(12,20)=8x5; fin_top 4x4x1 @(20,20)=10x5
  defineModel('pufferfish', {
    parts: [
      part('body',   { size:[10,10,10],pivot:[0,8,0], offset:[-5,-5,-5], uv:[0,0] }),
      part('tail',   { size:[5,6,1],   pivot:[0,7,-5],offset:[-2,-3,-1], uv:[0,20] }),
      part('fin_r',  { size:[3,4,1],   pivot:[5,8,0], offset:[0,-2,0],   uv:[12,20] }),
      part('fin_l',  { size:[3,4,1],   pivot:[-5,8,0],offset:[-3,-2,0],  uv:[12,20], mirror:true }),
      part('fin_top',{ size:[4,4,1],   pivot:[0,12,0],offset:[-2,0,0],   uv:[20,20] }),
    ],
    scale:0.7, eyeHeight:0.5, shadowRadius:0.3, rig:'fish',
  });

  // ---- SQUID --------------------------------------------------------------
  // body 8x8x8 @(0,0)=32x16; 8 tentacles 2x8x2 @(0,16),(8,16),...(56,16),(0,26)
  const MOBMODEL_squidParts = [
    part('body', { size:[8,8,8], pivot:[0,10,0], offset:[-4,-4,-4], uv:[0,0] }),
  ];
  const MOBMODEL_tentUV = [[0,16],[8,16],[16,16],[24,16],[32,16],[40,16],[48,16],[56,16]];
  for (let ti = 0; ti < 8; ti++) {
    const ang = (ti / 8) * Math.PI * 2;
    const tx = Math.sin(ang) * 3, tz = Math.cos(ang) * 3;
    MOBMODEL_squidParts.push(part(`tentacle${ti}`, {
      size:[2,8,2], pivot:[tx,6,tz], offset:[-1,-8,-1], uv:MOBMODEL_tentUV[ti],
      rotation:[ang * 0.3, ang, 0],
    }));
  }
  defineModel('squid', { parts:MOBMODEL_squidParts, eyeHeight:0.7, shadowRadius:0.5, rig:'custom' });

  // ---- GLOW_SQUID (same shape) --------------------------------------------
  const MOBMODEL_glowParts = [
    part('body', { size:[8,8,8], pivot:[0,10,0], offset:[-4,-4,-4], uv:[0,0] }),
  ];
  for (let ti = 0; ti < 8; ti++) {
    const ang = (ti / 8) * Math.PI * 2;
    const tx = Math.sin(ang) * 3, tz = Math.cos(ang) * 3;
    MOBMODEL_glowParts.push(part(`tentacle${ti}`, {
      size:[2,8,2], pivot:[tx,6,tz], offset:[-1,-8,-1], uv:MOBMODEL_tentUV[ti],
      rotation:[ang * 0.3, ang, 0], emissive:true,
    }));
  }
  defineModel('glow_squid', { parts:MOBMODEL_glowParts, eyeHeight:0.7, shadowRadius:0.5, rig:'custom' });

  // ---- AXOLOTL ------------------------------------------------------------
  // body 9x5x10 @(0,0)=38x15; head 7x6x7 @(0,15)=28x13
  // tail 3x6x10 @(28,15)=26x16; leg 3x4x3 @(0,28)=12x7 (all shared)
  // gill 1x4x2 @(0,35),(6,35),(0,40),(6,40),(0,45),(6,45)
  defineModel('axolotl', {
    parts: [
      part('body',   { size:[9,5,10],  pivot:[0,6,0],  offset:[-4,-2,-5],  uv:[0,0] }),
      part('head',   { size:[7,6,7],   pivot:[0,9,5],  offset:[-3,-6,0],   uv:[0,15] }),
      part('tail',   { size:[3,6,10],  pivot:[0,6,-5], offset:[-1,-3,-10], uv:[28,15], rotation:[0.3,0,0] }),
      part('leg_fr', { size:[3,4,3],   pivot:[4,4,4],  offset:[-1,-4,-1],  uv:[0,28] }),
      part('leg_fl', { size:[3,4,3],   pivot:[-4,4,4], offset:[-2,-4,-1],  uv:[0,28], mirror:true }),
      part('leg_br', { size:[3,4,3],   pivot:[4,4,-4], offset:[-1,-4,-1],  uv:[0,28] }),
      part('leg_bl', { size:[3,4,3],   pivot:[-4,4,-4],offset:[-2,-4,-1],  uv:[0,28], mirror:true }),
      part('gill_r0',{ size:[1,4,2],   pivot:[4,8,2],  offset:[0,0,-1],    uv:[0,35] }),
      part('gill_r1',{ size:[1,4,2],   pivot:[4,8,0],  offset:[0,0,-1],    uv:[12,35] }),
      part('gill_r2',{ size:[1,4,2],   pivot:[4,8,-2], offset:[0,0,-1],    uv:[24,35] }),
      part('gill_l0',{ size:[1,4,2],   pivot:[-4,8,2], offset:[-1,0,-1],   uv:[36,35] }),
      part('gill_l1',{ size:[1,4,2],   pivot:[-4,8,0], offset:[-1,0,-1],   uv:[0,41] }),
      part('gill_l2',{ size:[1,4,2],   pivot:[-4,8,-2],offset:[-1,0,-1],   uv:[12,41] }),
    ],
    scale:0.75, eyeHeight:0.55, shadowRadius:0.4, rig:'quadruped',
  });

  // ---- FROG ---------------------------------------------------------------
  // body 8x6x8 @(0,0)=32x14; head 8x8x8 @(0,14)=32x16
  // tongue 4x1x4 @(32,0)=16x5; leg_front 2x4x2 @(48,0)=8x6
  // leg_back 3x10x5 @(0,30)=16x15
  defineModel('frog', {
    parts: [
      part('body',   { size:[8,6,8],  pivot:[0,8,0],  offset:[-4,-3,-4], uv:[0,0] }),
      part('head',   { size:[8,8,8],  pivot:[0,12,3], offset:[-4,-8,0],  uv:[0,14] }),
      part('tongue', { size:[4,1,4],  pivot:[0,9,7],  offset:[-2,0,0],   uv:[32,0] }),
      part('leg_fr', { size:[2,4,2],  pivot:[3,5,3],  offset:[-1,-4,-1], uv:[48,0] }),
      part('leg_fl', { size:[2,4,2],  pivot:[-3,5,3], offset:[-1,-4,-1], uv:[48,0], mirror:true }),
      part('leg_br', { size:[3,10,5], pivot:[4,8,-3], offset:[-1,-10,-2],uv:[0,30] }),
      part('leg_bl', { size:[3,10,5], pivot:[-4,8,-3],offset:[-2,-10,-2],uv:[0,30], mirror:true }),
    ],
    scale:0.6, eyeHeight:0.65, shadowRadius:0.3, rig:'quadruped',
  });

  // ---- TADPOLE ------------------------------------------------------------
  // body 4x3x5 @(0,0)=18x8; tail 1x2x6 @(18,0)=14x8
  defineModel('tadpole', {
    parts: [
      part('body',{ size:[4,3,5], pivot:[0,4,0], offset:[-2,-1,-2], uv:[0,0] }),
      part('tail',{ size:[1,2,6], pivot:[0,4,-2],offset:[0,-1,-6],  uv:[18,0] }),
    ],
    scale:0.4, eyeHeight:0.3, shadowRadius:0.15, rig:'fish',
  });

  // ---- DOLPHIN ------------------------------------------------------------
  // body 10x8x20 @(0,0)=60x28; head 8x8x10 @(0,28)=36x18
  // snout 4x3x4 @(36,28)=16x7; tail 8x4x6 @(0,46)=28x10
  // fin_top 3x6x1 @(28,46)=8x7; fin_side 6x3x1 @(36,46)=14x4
  defineModel('dolphin', {
    parts: [
      part('body',   { size:[10,8,20],pivot:[0,8,0],  offset:[-5,-4,-10], uv:[0,0] }),
      part('head',   { size:[8,8,10], pivot:[0,10,10],offset:[-4,-8,0],   uv:[0,28] }),
      part('snout',  { size:[4,3,4],  pivot:[0,8,18], offset:[-2,-3,0],   uv:[36,28] }),
      part('tail',   { size:[8,4,6],  pivot:[0,7,-10],offset:[-4,-2,-6],  uv:[0,46] }),
      part('fin_top',{ size:[3,6,1],  pivot:[0,14,0], offset:[-1,0,0],    uv:[28,46] }),
      part('fin_r',  { size:[6,3,1],  pivot:[5,8,4],  offset:[0,-1,0],    uv:[36,46] }),
      part('fin_l',  { size:[6,3,1],  pivot:[-5,8,4], offset:[-6,-1,0],   uv:[36,46], mirror:true }),
    ],
    eyeHeight:0.65, shadowRadius:0.7, rig:'fish',
  });

  // ---- IRON_GOLEM ---------------------------------------------------------
  // head 12x12x10 @(0,0)=44x22; nose 4x6x4 @(44,0)=16x10
  // body 20x12x12 @(0,22)=64x24; leg 8x20x8 @(0,46)=32x28 (only 18 rows remain, use leg 8x16x8=32x24)
  // arm 6x28x6 @(32,46)=24x34 OVERFLOW
  // Shrink: head 10x10x8 @(0,0)=36x18; body 16x10x10 @(0,18)=52x20; leg 6x16x6=24x22
  // arm 5x20x5 @(0,38)=20x25; big arm needs to fit in (0,38)-(19,62) = 20x25 OK
  defineModel('iron_golem', {
    parts: [
      part('head', { size:[10,10,8],  pivot:[0,32,0],  offset:[-5,0,-4],   uv:[0,0] }),
      part('nose', { size:[3,5,3],    pivot:[0,30,4],  offset:[-1,-5,0],   uv:[36,0] }),
      part('body', { size:[16,10,10], pivot:[0,26,0],  offset:[-8,-10,-5], uv:[0,18] }),
      part('arm_r',{ size:[5,20,5],   pivot:[12,32,0], offset:[0,-10,-2],  uv:[0,38] }),
      part('arm_l',{ size:[5,20,5],   pivot:[-12,32,0],offset:[-5,-10,-2], uv:[0,38], mirror:true }),
      part('leg_r',{ size:[6,16,6],   pivot:[4,16,0],  offset:[-3,-16,-3], uv:[20,38] }),
      part('leg_l',{ size:[6,16,6],   pivot:[-4,16,0], offset:[-3,-16,-3], uv:[20,38], mirror:true }),
    ],
    scale:1.4, eyeHeight:2.7, shadowRadius:1.0, rig:'biped',
  });

  // ---- SNOW_GOLEM ---------------------------------------------------------
  // body 12x12x12 @(0,24)=48x24; head 8x8x8 @(0,0)=32x16
  // arm 2x14x2 @(32,0)=8x16
  defineModel('snow_golem', {
    parts: [
      part('head', { size:[8,8,8],  pivot:[0,26,0], offset:[-4,0,-4],  uv:[0,0] }),
      part('body', { size:[12,12,12],pivot:[0,14,0],offset:[-6,-6,-6], uv:[0,16] }),
      part('arm_r',{ size:[2,14,2], pivot:[7,24,0], offset:[0,-7,-1],  uv:[32,0] }),
      part('arm_l',{ size:[2,14,2], pivot:[-7,24,0],offset:[-2,-7,-1], uv:[32,0], mirror:true }),
    ],
    eyeHeight:1.8, shadowRadius:0.5, rig:'custom',
  });

  // ---- PANDA --------------------------------------------------------------
  // head 10x10x10 @(0,0)=40x20; body 12x12x16 @(0,20)=56x28; leg 5x12x5 @(40,0)=20x17
  defineModel('panda', {
    parts: [
      part('body',  { size:[12,12,16],pivot:[0,16,0],  offset:[-6,-6,-8], uv:[0,20] }),
      part('head',  { size:[10,10,10],pivot:[0,22,8],  offset:[-5,-10,0], uv:[0,0] }),
      part('leg_fr',{ size:[5,12,5],  pivot:[4,12,7],  offset:[-2,-12,-2],uv:[40,0] }),
      part('leg_fl',{ size:[5,12,5],  pivot:[-4,12,7], offset:[-3,-12,-2],uv:[40,0], mirror:true }),
      part('leg_br',{ size:[5,12,5],  pivot:[4,12,-5], offset:[-2,-12,-2],uv:[40,0] }),
      part('leg_bl',{ size:[5,12,5],  pivot:[-4,12,-5],offset:[-3,-12,-2],uv:[40,0], mirror:true }),
    ],
    scale:1.2, eyeHeight:1.3, shadowRadius:0.8, rig:'quadruped',
  });

  // ---- POLAR_BEAR ---------------------------------------------------------
  // head 10x10x10 @(0,0)=40x20; body 10x10x14 @(0,20)=48x24; leg 4x12x4 @(48,20)=16x16
  defineModel('polar_bear', {
    parts: [
      part('body',  { size:[10,10,14],pivot:[0,16,0],  offset:[-5,-5,-7], uv:[0,20] }),
      part('head',  { size:[10,10,10],pivot:[0,20,7],  offset:[-5,-10,0], uv:[0,0] }),
      part('leg_fr',{ size:[4,12,4],  pivot:[4,12,6],  offset:[-2,-12,-2],uv:[48,20] }),
      part('leg_fl',{ size:[4,12,4],  pivot:[-4,12,6], offset:[-2,-12,-2],uv:[48,20], mirror:true }),
      part('leg_br',{ size:[4,12,4],  pivot:[4,12,-5], offset:[-2,-12,-2],uv:[48,20] }),
      part('leg_bl',{ size:[4,12,4],  pivot:[-4,12,-5],offset:[-2,-12,-2],uv:[48,20], mirror:true }),
    ],
    scale:1.3, eyeHeight:1.4, shadowRadius:0.9, rig:'quadruped',
  });

  // ---- SPIDER -------------------------------------------------------------
  // body 8x8x10 @(0,0)=36x18; head @(0,18)=32x16
  // 4 leg pairs: each 2x2x8=20x10, use 4 unique UVs for left/right pairs
  // leg_r01 @(0,34)=20x10; leg_r23 @(20,34)=20x10; leg_l01 @(40,34)=20x10; leg_l23 @(0,44)=20x10
  defineModel('spider', {
    parts: [
      part('body',  { size:[8,8,10], pivot:[0,8,-4],   offset:[-4,-4,-5], uv:[0,0] }),
      part('head',  { size:[8,8,8],  pivot:[0,10,4],   offset:[-4,-4,0],  uv:[0,18] }),
      part('leg_r0',{ size:[2,2,8],  pivot:[4,10,2],   offset:[0,-1,-4],  uv:[0,34], rotation:[0,0.5,0] }),
      part('leg_r1',{ size:[2,2,8],  pivot:[4,10,0],   offset:[0,-1,-4],  uv:[20,34], rotation:[0,0.2,0] }),
      part('leg_r2',{ size:[2,2,8],  pivot:[4,10,-2],  offset:[0,-1,-4],  uv:[40,34], rotation:[0,-0.2,0] }),
      part('leg_r3',{ size:[2,2,8],  pivot:[4,10,-4],  offset:[0,-1,-4],  uv:[0,44], rotation:[0,-0.5,0] }),
      part('leg_l0',{ size:[2,2,8],  pivot:[-4,10,2],  offset:[-2,-1,-4], uv:[0,34], mirror:true, rotation:[0,-0.5,0] }),
      part('leg_l1',{ size:[2,2,8],  pivot:[-4,10,0],  offset:[-2,-1,-4], uv:[20,34], mirror:true, rotation:[0,-0.2,0] }),
      part('leg_l2',{ size:[2,2,8],  pivot:[-4,10,-2], offset:[-2,-1,-4], uv:[40,34], mirror:true, rotation:[0,0.2,0] }),
      part('leg_l3',{ size:[2,2,8],  pivot:[-4,10,-4], offset:[-2,-1,-4], uv:[0,44], mirror:true, rotation:[0,0.5,0] }),
    ],
    eyeHeight:0.65, shadowRadius:0.8, rig:'spider',
  });

  // ---- CAVE_SPIDER (smaller) ----------------------------------------------
  defineModel('cave_spider', {
    parts: [
      part('body',  { size:[6,6,8],  pivot:[0,6,-3],  offset:[-3,-3,-4], uv:[0,0] }),
      part('head',  { size:[6,6,6],  pivot:[0,8,3],   offset:[-3,-3,0],  uv:[0,18] }),
      part('leg_r0',{ size:[2,2,6],  pivot:[3,8,2],   offset:[0,-1,-3],  uv:[0,34], rotation:[0,0.5,0] }),
      part('leg_r1',{ size:[2,2,6],  pivot:[3,8,0],   offset:[0,-1,-3],  uv:[20,34], rotation:[0,0.2,0] }),
      part('leg_r2',{ size:[2,2,6],  pivot:[3,8,-2],  offset:[0,-1,-3],  uv:[40,34], rotation:[0,-0.2,0] }),
      part('leg_r3',{ size:[2,2,6],  pivot:[3,8,-4],  offset:[0,-1,-3],  uv:[0,44], rotation:[0,-0.5,0] }),
      part('leg_l0',{ size:[2,2,6],  pivot:[-3,8,2],  offset:[-2,-1,-3], uv:[0,34], mirror:true, rotation:[0,-0.5,0] }),
      part('leg_l1',{ size:[2,2,6],  pivot:[-3,8,0],  offset:[-2,-1,-3], uv:[20,34], mirror:true, rotation:[0,-0.2,0] }),
      part('leg_l2',{ size:[2,2,6],  pivot:[-3,8,-2], offset:[-2,-1,-3], uv:[40,34], mirror:true, rotation:[0,0.2,0] }),
      part('leg_l3',{ size:[2,2,6],  pivot:[-3,8,-4], offset:[-2,-1,-3], uv:[0,44], mirror:true, rotation:[0,0.5,0] }),
    ],
    scale:0.7, eyeHeight:0.45, shadowRadius:0.6, rig:'spider',
  });

  // ---- ENDERMAN -----------------------------------------------------------
  // head 8x8x8 @(0,0)=32x16; body 8x12x4 @(16,16)=24x16; arm 2x28x2 @(40,16)=8x30
  // leg 2x28x2 @(56,0)=8x30 -- 56+8=64 OK, 30 rows -> row 0-29 OK!
  defineModel('enderman', {
    parts: [
      part('body',  { size:[8,12,4],  pivot:[0,28,0],  offset:[-4,-12,-2], uv:[16,16] }),
      part('head',  { size:[8,8,8],   pivot:[0,40,0],  offset:[-4,0,-4],   uv:[0,0] }),
      part('arm_r', { size:[2,28,2],  pivot:[5,38,0],  offset:[0,-28,-1],  uv:[40,16] }),
      part('arm_l', { size:[2,28,2],  pivot:[-5,38,0], offset:[-2,-28,-1], uv:[40,16], mirror:true }),
      part('leg_r', { size:[2,28,2],  pivot:[2,28,0],  offset:[-1,-28,-1], uv:[56,0] }),
      part('leg_l', { size:[2,28,2],  pivot:[-2,28,0], offset:[-1,-28,-1], uv:[56,0], mirror:true }),
    ],
    eyeHeight:2.55, shadowRadius:0.5, rig:'biped',
  });

  // ---- PIGLIN -------------------------------------------------------------
  // Using standard biped UVs; snout 4x3x2 @(24,0)=12x5 (fits within head extent 32x16)
  // No: head @(0,0)=32x16, snout at (32,0)=12x5 OK; ear_r @(44,0)=4x4; ear_l @(48,0)=4x4
  defineModel('piglin', {
    parts: [
      ...bipedParts({ headUV:[0,0], bodyUV:[16,16], armUV:[40,16], legUV:[0,16] }),
      part('snout',{ size:[4,3,2], pivot:[0,26,4], offset:[-2,-3,0], uv:[32,0] }),
      part('ear_r',{ size:[1,3,1], pivot:[4,30,0], offset:[0,0,-1],  uv:[44,0] }),
      part('ear_l',{ size:[1,3,1], pivot:[-4,30,0],offset:[-1,0,-1], uv:[48,0] }),
    ],
    eyeHeight:1.62, shadowRadius:0.5, rig:'biped',
  });

  // ---- PIGLIN_BRUTE -------------------------------------------------------
  defineModel('piglin_brute', {
    parts: [
      ...bipedParts({ headUV:[0,0], bodyUV:[16,16], armUV:[40,16], legUV:[0,16] }),
      part('snout',{ size:[4,3,2], pivot:[0,26,4], offset:[-2,-3,0], uv:[32,0] }),
      part('ear_r',{ size:[1,3,1], pivot:[4,30,0], offset:[0,0,-1],  uv:[44,0] }),
      part('ear_l',{ size:[1,3,1], pivot:[-4,30,0],offset:[-1,0,-1], uv:[48,0] }),
    ],
    scale:1.1, eyeHeight:1.7, shadowRadius:0.55, rig:'biped',
  });

  // ---- HOGLIN -------------------------------------------------------------
  // head 10x10x10 @(0,0)=40x20; tusk_r @(40,0)=12x6; tusk_l @(52,0)=12x6
  // body 10x10x14 @(0,20)=48x24; leg 4x12x4 @(48,20)=16x16
  defineModel('hoglin', {
    parts: [
      part('body',  { size:[10,10,14],pivot:[0,18,0],  offset:[-5,-5,-7], uv:[0,20] }),
      part('head',  { size:[10,10,10],pivot:[0,22,7],  offset:[-5,-10,0], uv:[0,0] }),
      part('tusk_r',{ size:[2,2,4],   pivot:[4,17,10], offset:[0,0,0],    uv:[40,0] }),
      part('tusk_l',{ size:[2,2,4],   pivot:[-4,17,10],offset:[-2,0,0],   uv:[52,0] }),
      part('leg_fr',{ size:[4,12,4],  pivot:[4,12,7],  offset:[-2,-12,-2],uv:[48,20] }),
      part('leg_fl',{ size:[4,12,4],  pivot:[-4,12,7], offset:[-2,-12,-2],uv:[48,20], mirror:true }),
      part('leg_br',{ size:[4,12,4],  pivot:[4,12,-5], offset:[-2,-12,-2],uv:[48,20] }),
      part('leg_bl',{ size:[4,12,4],  pivot:[-4,12,-5],offset:[-2,-12,-2],uv:[48,20], mirror:true }),
    ],
    scale:1.1, eyeHeight:1.4, shadowRadius:0.85, rig:'quadruped',
  });

  // ---- ZOGLIN (same as hoglin) --------------------------------------------
  defineModel('zoglin', {
    parts: [
      part('body',  { size:[10,10,14],pivot:[0,18,0],  offset:[-5,-5,-7], uv:[0,20] }),
      part('head',  { size:[10,10,10],pivot:[0,22,7],  offset:[-5,-10,0], uv:[0,0] }),
      part('tusk_r',{ size:[2,2,4],   pivot:[4,17,10], offset:[0,0,0],    uv:[40,0] }),
      part('tusk_l',{ size:[2,2,4],   pivot:[-4,17,10],offset:[-2,0,0],   uv:[52,0] }),
      part('leg_fr',{ size:[4,12,4],  pivot:[4,12,7],  offset:[-2,-12,-2],uv:[48,20] }),
      part('leg_fl',{ size:[4,12,4],  pivot:[-4,12,7], offset:[-2,-12,-2],uv:[48,20], mirror:true }),
      part('leg_br',{ size:[4,12,4],  pivot:[4,12,-5], offset:[-2,-12,-2],uv:[48,20] }),
      part('leg_bl',{ size:[4,12,4],  pivot:[-4,12,-5],offset:[-2,-12,-2],uv:[48,20], mirror:true }),
    ],
    scale:1.1, eyeHeight:1.4, shadowRadius:0.85, rig:'quadruped',
  });

  // ---- ZOMBIE -------------------------------------------------------------
  defineModel('zombie', {
    parts: bipedParts({ headUV:[0,0], bodyUV:[16,16], armUV:[40,16], legUV:[0,16] }),
    eyeHeight:1.62, shadowRadius:0.5, rig:'biped',
  });

  // ---- SKELETON -----------------------------------------------------------
  // thin biped: head 8x8x8 @(0,0); body 8x12x4 @(16,16); arm 2x12x2 @(40,16); leg 2x12x2 @(0,16)
  defineModel('skeleton', {
    parts: [
      part('body',  { size:[8,12,4],  pivot:[0,24,0],  offset:[-4,-12,-2],uv:[16,16] }),
      part('head',  { size:[8,8,8],   pivot:[0,24,0],  offset:[-4,0,-4],  uv:[0,0] }),
      part('arm_r', { size:[2,12,2],  pivot:[5,22,0],  offset:[-1,-12,-1],uv:[40,16] }),
      part('arm_l', { size:[2,12,2],  pivot:[-5,22,0], offset:[-1,-12,-1],uv:[40,16], mirror:true }),
      part('leg_r', { size:[2,12,2],  pivot:[2,12,0],  offset:[-1,-12,-1],uv:[0,16] }),
      part('leg_l', { size:[2,12,2],  pivot:[-2,12,0], offset:[-1,-12,-1],uv:[0,16], mirror:true }),
    ],
    eyeHeight:1.62, shadowRadius:0.5, rig:'biped',
  });

  // ---- CREEPER ------------------------------------------------------------
  // head 8x8x8 @(0,0)=32x16; body 8x12x4 @(16,16)=24x16; leg 4x6x4 @(0,16)=16x10
  defineModel('creeper', {
    parts: [
      part('body',  { size:[8,12,4],  pivot:[0,18,0],  offset:[-4,-6,-2], uv:[16,16] }),
      part('head',  { size:[8,8,8],   pivot:[0,26,0],  offset:[-4,0,-4],  uv:[0,0] }),
      part('leg_fr',{ size:[4,6,4],   pivot:[2,6,4],   offset:[-2,-6,-2], uv:[0,16] }),
      part('leg_fl',{ size:[4,6,4],   pivot:[-2,6,4],  offset:[-2,-6,-2], uv:[0,16], mirror:true }),
      part('leg_br',{ size:[4,6,4],   pivot:[2,6,-4],  offset:[-2,-6,-2], uv:[0,16] }),
      part('leg_bl',{ size:[4,6,4],   pivot:[-2,6,-4], offset:[-2,-6,-2], uv:[0,16], mirror:true }),
    ],
    eyeHeight:1.62, shadowRadius:0.5, rig:'quadruped',
  });

  // ---- SLIME --------------------------------------------------------------
  // body 16x16x16 @(0,0)=64x32; inner 12x12x12 @(0,32)=48x24
  defineModel('slime', {
    parts: [
      part('body',      { size:[16,16,16],pivot:[0,8,0], offset:[-8,0,-8],  uv:[0,0] }),
      part('body_inner',{ size:[12,12,12],pivot:[0,8,0], offset:[-6,2,-6],  uv:[0,32] }),
    ],
    eyeHeight:0.51, shadowRadius:0.5, rig:'blob',
  });

  // ---- MAGMA_CUBE ---------------------------------------------------------
  defineModel('magma_cube', {
    parts: [
      part('body',      { size:[16,16,16],pivot:[0,8,0], offset:[-8,0,-8], uv:[0,0] }),
      part('body_inner',{ size:[12,12,12],pivot:[0,8,0], offset:[-6,2,-6], uv:[0,32] }),
    ],
    eyeHeight:0.51, shadowRadius:0.5, rig:'blob',
  });

  // ---- SILVERFISH ---------------------------------------------------------
  // body 8x3x12 @(0,0)=40x15; head 4x3x4 @(40,0)=16x7; tail 3x2x4 @(40,7)=14x6
  // all legs share @(0,15)=6x2 (tiny)
  defineModel('silverfish', {
    parts: [
      part('body',  { size:[8,3,12],  pivot:[0,5,0],   offset:[-4,-2,-6], uv:[0,0] }),
      part('head',  { size:[4,3,4],   pivot:[0,5,6],   offset:[-2,-3,0],  uv:[40,0] }),
      part('tail',  { size:[3,2,4],   pivot:[0,5,-6],  offset:[-1,-2,-4], uv:[40,7] }),
      part('leg_r0',{ size:[2,1,1],   pivot:[4,4,4],   offset:[0,0,0],    uv:[0,15] }),
      part('leg_r1',{ size:[2,1,1],   pivot:[4,4,0],   offset:[0,0,0],    uv:[0,17] }),
      part('leg_r2',{ size:[2,1,1],   pivot:[4,4,-4],  offset:[0,0,0],    uv:[0,19] }),
      part('leg_l0',{ size:[2,1,1],   pivot:[-4,4,4],  offset:[-2,0,0],   uv:[0,21] }),
      part('leg_l1',{ size:[2,1,1],   pivot:[-4,4,0],  offset:[-2,0,0],   uv:[0,23] }),
      part('leg_l2',{ size:[2,1,1],   pivot:[-4,4,-4], offset:[-2,0,0],   uv:[0,25] }),
    ],
    scale:0.4, eyeHeight:0.3, shadowRadius:0.2, rig:'spider',
  });

  // ---- ENDERMITE ----------------------------------------------------------
  // body 6x3x10 @(0,0)=32x13; head 3x2x3 @(32,0)=12x5
  // all legs share @(0,13)=4x2
  defineModel('endermite', {
    parts: [
      part('body',  { size:[6,3,10],  pivot:[0,4,0],  offset:[-3,-1,-5], uv:[0,0] }),
      part('head',  { size:[3,2,3],   pivot:[0,4,5],  offset:[-1,-2,0],  uv:[32,0] }),
      part('leg_r0',{ size:[1,1,1],   pivot:[3,3,3],  offset:[0,0,0],    uv:[0,13] }),
      part('leg_r1',{ size:[1,1,1],   pivot:[3,3,0],  offset:[0,0,0],    uv:[0,15] }),
      part('leg_r2',{ size:[1,1,1],   pivot:[3,3,-3], offset:[0,0,0],    uv:[0,17] }),
      part('leg_l0',{ size:[1,1,1],   pivot:[-3,3,3], offset:[-1,0,0],   uv:[0,19] }),
      part('leg_l1',{ size:[1,1,1],   pivot:[-3,3,0], offset:[-1,0,0],   uv:[0,21] }),
      part('leg_l2',{ size:[1,1,1],   pivot:[-3,3,-3],offset:[-1,0,0],   uv:[0,23] }),
    ],
    scale:0.25, eyeHeight:0.25, shadowRadius:0.15, rig:'spider',
  });

  // ---- WITCH --------------------------------------------------------------
  // uses biped; nose 1x3x1 @(32,0)=4x4; hat 10x2x10 @(0,32)=40x12; hat_top 6x8x6 @(40,32)=24x14
  defineModel('witch', {
    parts: [
      ...bipedParts({ headUV:[0,0], bodyUV:[16,16], armUV:[40,16], legUV:[0,16] }),
      part('nose',   { size:[1,3,1],   pivot:[0,25,4],  offset:[0,-3,0],  uv:[32,0] }),
      part('hat',    { size:[10,2,10], pivot:[0,32,0],  offset:[-5,0,-5], uv:[0,32] }),
      part('hat_top',{ size:[6,8,6],   pivot:[0,34,0],  offset:[-3,0,-3], uv:[40,32] }),
    ],
    eyeHeight:1.62, shadowRadius:0.5, rig:'biped',
  });

  // ---- ILLAGER (pillager/vindicator/evoker/illusioner) --------------------
  defineModel('illager', {
    parts: bipedParts({ headUV:[0,0], bodyUV:[16,16], armUV:[40,16], legUV:[0,16] }),
    eyeHeight:1.62, shadowRadius:0.5, rig:'biped',
  });

  // ---- VEX ----------------------------------------------------------------
  // body 6x8x4 @(16,0)=20x12; head 6x6x6 @(36,0)=24x12
  // arm 3x8x3 @(0,12)=12x11; wing 9x8x1 @(12,12)=20x9; leg 3x6x3 @(32,12)=12x9
  defineModel('vex', {
    parts: [
      part('body',  { size:[6,8,4],  pivot:[0,12,0],  offset:[-3,-8,-2], uv:[16,0] }),
      part('head',  { size:[6,6,6],  pivot:[0,12,0],  offset:[-3,0,-3],  uv:[36,0] }),
      part('arm_r', { size:[3,8,3],  pivot:[4,11,0],  offset:[0,-8,-1],  uv:[0,12] }),
      part('arm_l', { size:[3,8,3],  pivot:[-4,11,0], offset:[-3,-8,-1], uv:[0,12], mirror:true }),
      part('wing_r',{ size:[9,8,1],  pivot:[2,14,-1], offset:[0,0,-1],   uv:[12,12] }),
      part('wing_l',{ size:[9,8,1],  pivot:[-2,14,-1],offset:[-9,0,-1],  uv:[12,12], mirror:true }),
      part('leg_r', { size:[3,6,3],  pivot:[2,8,0],   offset:[-1,-6,-1], uv:[32,12] }),
      part('leg_l', { size:[3,6,3],  pivot:[-2,8,0],  offset:[-2,-6,-1], uv:[32,12], mirror:true }),
    ],
    scale:0.4, eyeHeight:0.9, shadowRadius:0.3, rig:'biped',
  });

  // ---- RAVAGER ------------------------------------------------------------
  // head 10x8x10 @(0,0)=40x18; horn_r @(40,0)=8x10; horn_l @(48,0)=8x10
  // body 10x10x14 @(0,18)=48x24; leg 4x12x4 @(48,18)=16x16
  defineModel('ravager', {
    parts: [
      part('body',  { size:[10,10,14],pivot:[0,22,0],  offset:[-5,-5,-7], uv:[0,18] }),
      part('head',  { size:[10,8,10], pivot:[0,26,7],  offset:[-5,-8,0],  uv:[0,0] }),
      part('horn_r',{ size:[2,8,2],   pivot:[3,30,5],  offset:[0,0,-1],   uv:[40,0] }),
      part('horn_l',{ size:[2,8,2],   pivot:[-3,30,5], offset:[-2,0,-1],  uv:[48,0] }),
      part('leg_fr',{ size:[4,12,4],  pivot:[4,12,6],  offset:[-2,-12,-2],uv:[48,18] }),
      part('leg_fl',{ size:[4,12,4],  pivot:[-4,12,6], offset:[-2,-12,-2],uv:[48,18], mirror:true }),
      part('leg_br',{ size:[4,12,4],  pivot:[4,12,-6], offset:[-2,-12,-2],uv:[48,18] }),
      part('leg_bl',{ size:[4,12,4],  pivot:[-4,12,-6],offset:[-2,-12,-2],uv:[48,18], mirror:true }),
    ],
    scale:1.3, eyeHeight:2.2, shadowRadius:1.2, rig:'quadruped',
  });

  // ---- GUARDIAN -----------------------------------------------------------
  // body 12x10x12 @(0,0)=48x22; tail @(48,0)=12x8; eye @(48,8)=12x6
  // spine0 2x2x14 @(0,22)=32x4; spine1 14x2x2 @(32,22)=32x4
  defineModel('guardian', {
    parts: [
      part('body',  { size:[12,10,12], pivot:[0,10,0],  offset:[-6,-5,-6], uv:[0,0] }),
      part('tail',  { size:[3,5,3],    pivot:[0,8,-6],  offset:[-1,-2,-3], uv:[48,0] }),
      part('eye',   { size:[5,5,1],    pivot:[0,12,6],  offset:[-2,-2,0],  uv:[48,8] }),
      part('spine0',{ size:[2,2,14],   pivot:[0,18,0],  offset:[-1,0,-7],  uv:[0,22] }),
      part('spine1',{ size:[14,2,2],   pivot:[0,18,0],  offset:[-7,0,-1],  uv:[32,22] }),
    ],
    scale:0.9, eyeHeight:0.65, shadowRadius:0.5, rig:'custom',
  });

  // ---- ELDER_GUARDIAN -----------------------------------------------------
  // body 12x10x12 @(0,0)=48x22; tail @(48,0)=16x11; eye @(48,12)=14x7
  // spine0 2x2x14 @(0,22)=32x4; spine1 14x2x2 @(32,22)=32x4
  defineModel('elder_guardian', {
    parts: [
      part('body',  { size:[12,10,12], pivot:[0,12,0],  offset:[-6,-5,-6], uv:[0,0] }),
      part('tail',  { size:[4,7,4],    pivot:[0,10,-6], offset:[-2,-3,-4], uv:[48,0] }),
      part('eye',   { size:[6,6,1],    pivot:[0,14,6],  offset:[-3,-3,0],  uv:[48,12] }),
      part('spine0',{ size:[2,2,14],   pivot:[0,20,0],  offset:[-1,0,-7],  uv:[0,22] }),
      part('spine1',{ size:[14,2,2],   pivot:[0,20,0],  offset:[-7,0,-1],  uv:[32,22] }),
    ],
    scale:1.4, eyeHeight:0.85, shadowRadius:0.7, rig:'custom',
  });

  // ---- SHULKER ------------------------------------------------------------
  // shell 16x16x16 @(0,16)=64x32; head 12x12x12 @(0,0)=48x24
  // Note: head goes at row 0, shell at row 24 to avoid overlap
  defineModel('shulker', {
    parts: [
      part('body',{ size:[16,16,16], pivot:[0,8,0], offset:[-8,0,-8],  uv:[0,24] }),
      part('head',{ size:[12,12,12], pivot:[0,8,0], offset:[-6,0,-6],  uv:[0,0] }),
    ],
    eyeHeight:1.0, shadowRadius:0.5, rig:'custom',
  });

  // ---- BLAZE --------------------------------------------------------------
  // head 8x8x8 @(0,0)=32x16; rods 2x8x2 stacked by 8 across (8 per row)
  // row 16: rod0-7 @(0,16),(8,16),(16,16),(24,16),(32,16),(40,16),(48,16),(56,16)
  // row 26: rod8-11 @(0,26),(8,26),(16,26),(24,26)
  defineModel('blaze', {
    parts: [
      part('head', { size:[8,8,8], pivot:[0,18,0], offset:[-4,0,-4], uv:[0,0] }),
      ...Array.from({length:12}, (_, i) => {
        const angle = (i / 12) * Math.PI * 2;
        return part(`rod${i}`, {
          size:[2,8,2], pivot:[Math.cos(angle)*6, 12, Math.sin(angle)*6],
          offset:[-1,-4,-1], uv:[(i % 8) * 8, 16 + Math.floor(i / 8) * 10],
          rotation:[angle * 0.5, angle, 0],
        });
      }),
    ],
    eyeHeight:1.2, shadowRadius:0.5, rig:'custom',
  });

  // ---- GHAST --------------------------------------------------------------
  // body 16x16x16 @(0,0)=64x32; 9 tentacles 2x10x2 each
  // row 32: tent0-7 @(0,32),(8,32),...(56,32)
  // tent8 at (0,44) - extent 8x12
  defineModel('ghast', {
    parts: [
      part('body', { size:[16,16,16], pivot:[0,16,0], offset:[-8,0,-8], uv:[0,0] }),
      ...Array.from({length:9}, (_, i) => {
        const col = i % 3, row2 = Math.floor(i / 3);
        return part(`tentacle${i}`, {
          size:[2,10,2], pivot:[(col-1)*5, 0, (row2-1)*5],
          offset:[-1,-10,-1], uv:[(i % 8) * 8, 32 + Math.floor(i / 8) * 12],
        });
      }),
    ],
    eyeHeight:1.3, shadowRadius:2.0, rig:'custom',
  });

  // ---- PHANTOM ------------------------------------------------------------
  // head 8x6x8 @(0,0)=32x14; tail 3x2x8 @(32,0)=22x10
  // body 8x4x14 @(0,14)=44x18; wing 10x2x5 @(0,32)=30x7 (shared)
  defineModel('phantom', {
    parts: [
      part('body',  { size:[8,4,14],  pivot:[0,8,0],  offset:[-4,-2,-7], uv:[0,14] }),
      part('head',  { size:[8,6,8],   pivot:[0,10,7], offset:[-4,-6,0],  uv:[0,0] }),
      part('tail',  { size:[3,2,8],   pivot:[0,8,-7], offset:[-1,-1,-8], uv:[32,0] }),
      part('wing_r',{ size:[10,2,5],  pivot:[4,10,0], offset:[0,-1,-2],  uv:[0,32] }),
      part('wing_l',{ size:[10,2,5],  pivot:[-4,10,0],offset:[-10,-1,-2],uv:[0,32], mirror:true }),
    ],
    scale:0.9, eyeHeight:0.65, shadowRadius:0.9, rig:'bird',
  });

  // ---- WARDEN -------------------------------------------------------------
  // head 8x8x8 @(0,0)=32x16; body 8x14x4 @(0,16)=24x18
  // arm_r 5x16x4 @(24,16)=18x20; arm_l @(42,16)=18x20
  // leg_r 4x14x4 @(0,34)=16x18; leg_l @(16,36)=16x18 -- COLLISION!
  // Move leg_l to (16,34): still collision with arm? arm_r is (24,16) ext 18x20 -> rows 16-35 cols 24-41
  // leg_l at (16,34) ext 16x18 -> rows 34-51 cols 16-31. arm_r cols 24-41. Overlap cols 24-31 rows 34-35!
  // Move leg_l to (32,34): cols 32-47, rows 34-51. arm_r cols 24-41 rows 16-35. Overlap cols 32-41 row 34-35!
  // Move leg_l to (48,34): cols 48-63. arm_l(42,16) ext 18x20 cols 42-59 rows 16-35. OK at rows 34+.
  // Actually arm_l rows 16-35, leg_l rows 34-51: overlap row 34-35 if cols overlap. arm_l cols 42-59, leg_l@(48,34) cols 48-63. Overlap cols 48-59 rows 34-35 -> COLLISION!
  // Use leg_l at (0,52): cols 0-15 rows 52-63 (only 12 rows, need 18) OVERFLOW
  // Reduce leg height: 4x12x4=16x16. leg_l @(16,34)=16x16 rows 34-49 cols 16-31.
  // arm_r(24,16) ext 18x20 rows 16-35 cols 24-41. Overlap cols 24-31 rows 34-35 -> 2 rows.
  // Not a UV overlap in painting context if we use separate uvs. But UV extents DO overlap.
  // Solution: shrink arm to not overlap. arm: 4x14x4=16x18 at (24,16) -> 16x18 rows 16-33.
  // Then leg_l@(16,34)=16x16 rows 34-49. No overlap!
  defineModel('warden', {
    parts: [
      part('head',  { size:[8,8,8],   pivot:[0,40,0],  offset:[-4,0,-4],  uv:[0,0] }),
      part('body',  { size:[8,14,4],  pivot:[0,34,0],  offset:[-4,-14,-2],uv:[0,16] }),
      part('arm_r', { size:[4,14,4],  pivot:[7,38,0],  offset:[0,-7,-2],  uv:[24,16] }),
      part('arm_l', { size:[4,14,4],  pivot:[-7,38,0], offset:[-4,-7,-2], uv:[40,16] }),
      part('leg_r', { size:[4,12,4],  pivot:[2,12,0],  offset:[-2,-12,-2],uv:[0,34] }),
      part('leg_l', { size:[4,12,4],  pivot:[-2,12,0], offset:[-2,-12,-2],uv:[16,34] }),
      part('rib_r', { size:[3,10,2],  pivot:[5,36,1],  offset:[0,-5,-1],  uv:[0,50], emissive:true }),
      part('rib_l', { size:[3,10,2],  pivot:[-5,36,1], offset:[-3,-5,-1], uv:[10,50], emissive:true }),
      part('rib_r2',{ size:[3,8,2],   pivot:[5,32,1],  offset:[0,-4,-1],  uv:[20,50], emissive:true }),
      part('rib_l2',{ size:[3,8,2],   pivot:[-5,32,1], offset:[-3,-4,-1], uv:[30,50], emissive:true }),
    ],
    scale:1.4, eyeHeight:2.9, shadowRadius:1.2, rig:'biped',
  });

  // ---- ENDER_DRAGON -------------------------------------------------------
  // head 6x5x6 @(0,0)=24x11; jaw 6x2x6 @(24,0)=24x8
  // neck0 3x3x3 @(48,0)=12x6; neck1 2x2x2 @(48,6)=8x4; neck2 1x1x1 @(56,6)=4x2
  // body 8x10x10 @(0,11)=36x20; tail0 4x4x4 @(36,11)=16x8; tail1 3x3x3 @(52,11)=12x6; tail2 2x2x2 @(36,19)=8x4
  // wing0 10x2x5 @(0,31)=30x7; wing1 8x2x5 @(30,31)=26x7 (shared for both sides)
  // leg 3x12x3 @(0,38)=12x15 (shared for all 4)
  defineModel('ender_dragon', {
    parts: [
      part('body',  { size:[8,10,10],  pivot:[0,20,0],  offset:[-4,-5,-5],  uv:[0,11] }),
      part('head',  { size:[6,5,6],    pivot:[0,22,10], offset:[-3,-5,0],   uv:[0,0] }),
      part('jaw',   { size:[6,2,6],    pivot:[0,20,10], offset:[-3,-2,0],   uv:[24,0], rotation:[0.3,0,0] }),
      part('neck0', { size:[3,3,3],    pivot:[0,22,7],  offset:[-1,-3,-1],  uv:[48,0] }),
      part('neck1', { size:[2,2,2],    pivot:[0,22,9],  offset:[-1,-2,-1],  uv:[48,6] }),
      part('neck2', { size:[1,1,1],    pivot:[0,22,11], offset:[0,-1,0],    uv:[56,6] }),
      part('tail0', { size:[4,4,4],    pivot:[0,20,-5], offset:[-2,-2,-4],  uv:[36,11] }),
      part('tail1', { size:[3,3,3],    pivot:[0,20,-9], offset:[-1,-1,-3],  uv:[52,11] }),
      part('tail2', { size:[2,2,2],    pivot:[0,20,-12],offset:[-1,-1,-2],  uv:[36,19] }),
      part('wing_r0',{ size:[10,2,5],  pivot:[4,24,0],  offset:[0,-1,-2],   uv:[0,31] }),
      part('wing_r1',{ size:[8,2,5],   pivot:[14,24,0], offset:[0,-1,-2],   uv:[30,31] }),
      part('wing_l0',{ size:[10,2,5],  pivot:[-4,24,0], offset:[-10,-1,-2], uv:[0,31], mirror:true }),
      part('wing_l1',{ size:[8,2,5],   pivot:[-14,24,0],offset:[-8,-1,-2],  uv:[30,31], mirror:true }),
      part('leg_fr', { size:[3,12,3],  pivot:[4,18,4],  offset:[-1,-12,-1], uv:[0,38] }),
      part('leg_fl', { size:[3,12,3],  pivot:[-4,18,4], offset:[-2,-12,-1], uv:[0,38], mirror:true }),
      part('leg_br', { size:[3,12,3],  pivot:[4,18,-4], offset:[-1,-12,-1], uv:[12,38] }),
      part('leg_bl', { size:[3,12,3],  pivot:[-4,18,-4],offset:[-2,-12,-1], uv:[12,38], mirror:true }),
    ],
    scale:2.0, eyeHeight:2.6, shadowRadius:5.0, rig:'custom',
  });

  // ---- WITHER -------------------------------------------------------------
  // head 8x8x8 @(0,0)=32x16; head_r 6x6x6 @(32,0)=24x12; body 10x16x4 @(0,16)=28x20
  // rib 10x2x2 @(28,16)=24x4 (3 ribs); arm 4x20x4 @(0,36)=16x24
  defineModel('wither', {
    parts: [
      part('body',  { size:[10,16,4],  pivot:[0,24,0],  offset:[-5,-8,-2],  uv:[0,16] }),
      part('head',  { size:[8,8,8],    pivot:[0,34,0],  offset:[-4,0,-4],   uv:[0,0] }),
      part('head_r',{ size:[6,6,6],    pivot:[8,34,0],  offset:[-3,0,-3],   uv:[32,0] }),
      part('head_l',{ size:[6,6,6],    pivot:[-8,34,0], offset:[-3,0,-3],   uv:[32,0], mirror:true }),
      part('rib0',  { size:[10,2,2],   pivot:[0,28,0],  offset:[-5,0,-1],   uv:[28,16] }),
      part('rib1',  { size:[10,2,2],   pivot:[0,24,0],  offset:[-5,0,-1],   uv:[28,20] }),
      part('rib2',  { size:[10,2,2],   pivot:[0,20,0],  offset:[-5,0,-1],   uv:[28,24] }),
      part('arm_r', { size:[4,20,4],   pivot:[7,30,0],  offset:[0,-10,-2],  uv:[0,36] }),
      part('arm_l', { size:[4,20,4],   pivot:[-7,30,0], offset:[-4,-10,-2], uv:[0,36], mirror:true }),
    ],
    eyeHeight:3.0, shadowRadius:1.5, rig:'custom',
  });

  // ---- PLAYER -------------------------------------------------------------
  defineModel('player', {
    parts: bipedParts({ headUV:[0,0], bodyUV:[16,16], armUV:[40,16], legUV:[0,16] }),
    eyeHeight:1.62, shadowRadius:0.5, rig:'biped',
  });
}

// ---------------------------------------------------------------------------
export const MODEL_LIST = [
  'pig','cow','mooshroom','sheep','sheep_sheared',
  'chicken','rabbit','horse','donkey','mule','llama',
  'cat','ocelot','wolf','parrot','fox','bee',
  'turtle','goat','sniffer','camel','armadillo','bat',
  'allay','strider',
  'villager','wandering_trader',
  'cod','salmon','tropical_fish','pufferfish',
  'squid','glow_squid','axolotl','frog','tadpole','dolphin',
  'iron_golem','snow_golem','panda','polar_bear',
  'spider','cave_spider','enderman',
  'piglin','piglin_brute','hoglin','zoglin',
  'zombie','skeleton','creeper','slime','magma_cube',
  'silverfish','endermite','witch','illager',
  'vex','ravager','guardian','elder_guardian',
  'shulker','blaze','ghast','phantom',
  'warden','ender_dragon','wither','player',
];
