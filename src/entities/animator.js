// ---------------------------------------------------------------------------
// Entity animator – computes per-part transforms for a frame.
// All module-level helpers prefixed ANIM_.
// ---------------------------------------------------------------------------

const ANIM_TAU = Math.PI * 2;
const ANIM_DEG = Math.PI / 180;
const ANIM_MODEL_SCALE = 1 / 16; // model pixels → world units

// ---------------------------------------------------------------------------
// Transform record pool (reuse to avoid GC churn)
// ---------------------------------------------------------------------------
function ANIM_makeTransform(name) {
  return { name, px: 0, py: 0, pz: 0, rx: 0, ry: 0, rz: 0, sx: 1, sy: 1, sz: 1 };
}

function ANIM_resetTransform(t, p) {
  t.name = p.name;
  // Pivot in world units (model pixel / 16)
  t.px = p.pivot[0] * ANIM_MODEL_SCALE;
  t.py = p.pivot[1] * ANIM_MODEL_SCALE;
  t.pz = p.pivot[2] * ANIM_MODEL_SCALE;
  // Baked static rotation
  if (p.rotation) {
    t.rx = p.rotation[0]; t.ry = p.rotation[1]; t.rz = p.rotation[2];
  } else {
    t.rx = 0; t.ry = 0; t.rz = 0;
  }
  t.sx = 1; t.sy = 1; t.sz = 1;
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------
export function animateEntity(entity, model, dt, ctx) {
  if (!model) return [];

  const parts = model.parts;
  const transforms = [];

  // Initialise transforms from model
  for (const p of parts) {
    const t = ANIM_makeTransform(p.name);
    ANIM_resetTransform(t, p);
    transforms.push(t);
  }

  // Pick rig
  const rig = model.rig || 'quadruped';
  const byName = {};
  for (let i = 0; i < parts.length; i++) byName[parts[i].name] = transforms[i];

  // Context helpers
  const time = (entity.animTime || 0) * (dt || 0.05);
  const swing = entity.limbSwing || 0;
  const swingAmt = entity.limbSwingAmount || 0;
  const headYaw = (entity.headYaw || 0) - (entity.bodyYaw || entity.yaw || 0);
  const pitch = entity.pitch || 0;
  const onGround = entity.onGround !== false;
  const inWater = entity.inWater || false;
  const dead = entity.dead || false;
  const hurt = (entity.hurtTime || 0) > 0;
  const deathTime = entity.deathTime || 0;
  const baby = entity.baby || false;
  const def = entity.def || {};
  const special = def.special || null;
  const attacking = (entity.attackCooldown || 0) > 0;

  // Dispatch to rig animator
  switch (rig) {
    case 'quadruped': ANIM_rigQuadruped(byName, model, swing, swingAmt, headYaw, pitch, time, dead, deathTime, hurt, baby, def); break;
    case 'biped':     ANIM_rigBiped(byName, model, swing, swingAmt, headYaw, pitch, time, dead, deathTime, hurt, baby, def, special, attacking, entity); break;
    case 'bird':      ANIM_rigBird(byName, model, swing, swingAmt, headYaw, pitch, time, onGround, dead, deathTime, hurt, baby); break;
    case 'fish':      ANIM_rigFish(byName, model, swing, swingAmt, headYaw, time, inWater, dead, deathTime); break;
    case 'spider':    ANIM_rigSpider(byName, model, swing, swingAmt, headYaw, pitch, time, dead, deathTime, hurt); break;
    case 'blob':      ANIM_rigBlob(byName, model, time, dead, deathTime); break;
    case 'custom': {
      const custName = def.id || def.type || '';
      const custFn = CUSTOM_ANIMATORS[custName];
      if (custFn) {
        custFn(entity, byName, model, time, swing, swingAmt, headYaw, pitch, onGround, inWater, dt || 0.05, ctx);
      } else if (model.animateFn) {
        model.animateFn(entity, byName, dt);
      } else {
        ANIM_idleBob(byName, model, time);
      }
      break;
    }
    default: ANIM_idleBob(byName, model, time); break;
  }

  // Baby scaling
  if (baby) {
    const headScale = model.babyHeadScale || 1.6;
    const bodyScale = def.babyScale || 0.5;
    for (const t of transforms) {
      if (/^head|_head$|^snout|^beak|^jaw|^ear|^horn|^antenna|^nose/.test(t.name)) {
        t.sx *= headScale; t.sy *= headScale; t.sz *= headScale;
      } else {
        t.sx *= bodyScale; t.sy *= bodyScale; t.sz *= bodyScale;
      }
    }
  }

  // Hurt tilt
  if (hurt) {
    const bodyT = byName['body'] || byName['torso'] || byName['chest'];
    if (bodyT) bodyT.rz += 0.15 * Math.sin(entity.hurtTime * 0.8);
  }

  // Death rotation (falls sideways over deathTime ticks)
  if (dead && deathTime >= 0) {
    const deathProgress = Math.min(1, deathTime / 20);
    for (const t of transforms) {
      t.rz += deathProgress * (Math.PI * 0.5);
    }
  }

  return transforms;
}

// ---------------------------------------------------------------------------
// QUADRUPED rig
// Legs in diagonal pairs: (fr,bl) and (fl,br)
// ---------------------------------------------------------------------------
function ANIM_rigQuadruped(byName, model, swing, swingAmt, headYaw, pitch, time, dead, deathTime, hurt, baby, def) {
  const amp = swingAmt * 0.7;
  const freq = swing;

  // Leg pairs
  const rotFR = Math.sin(freq) * amp;
  const rotFL = -rotFR;
  const rotBR = -rotFR;
  const rotBL = rotFR;

  ANIM_setRot(byName, 'leg_fr', rotFR, 0, 0);
  ANIM_setRot(byName, 'leg_fl', rotFL, 0, 0);
  ANIM_setRot(byName, 'leg_br', rotBR, 0, 0);
  ANIM_setRot(byName, 'leg_bl', rotBL, 0, 0);

  // Head tracking
  ANIM_setRot(byName, 'head', pitch, headYaw, 0);

  // Tail sway
  const tailT = byName['tail'];
  if (tailT) {
    tailT.ry += Math.sin(time * 1.5) * 0.1 * swingAmt + Math.sin(time * 0.8) * 0.05;
  }

  // Idle body bob
  const bodyT = byName['body'];
  if (bodyT) {
    bodyT.py += Math.sin(time * 1.8) * 0.01;
  }
}

// ---------------------------------------------------------------------------
// BIPED rig
// ---------------------------------------------------------------------------
function ANIM_rigBiped(byName, model, swing, swingAmt, headYaw, pitch, time, dead, deathTime, hurt, baby, def, special, attacking, entity) {
  const amp = swingAmt * 0.6;
  const freq = swing;

  const legR = Math.sin(freq) * amp;
  const legL = -legR;
  const armR = -legR;
  const armL = legR;

  // Zombie / attack pose: arms held forward
  const zombiePose = (special === 'zombie' || special === 'drowned' || special === 'husk' || special === 'zombie_villager');
  if (zombiePose || attacking) {
    ANIM_addRot(byName, 'arm_r', -Math.PI * 0.5 + armR * 0.3, 0, 0);
    ANIM_addRot(byName, 'arm_l', -Math.PI * 0.5 + armL * 0.3, 0, 0);
  } else {
    ANIM_addRot(byName, 'arm_r', armR, 0, 0);
    ANIM_addRot(byName, 'arm_l', armL, 0, 0);
  }

  ANIM_addRot(byName, 'leg_r', legR, 0, 0);
  ANIM_addRot(byName, 'leg_l', legL, 0, 0);

  // Head tracking
  ANIM_setRot(byName, 'head', pitch, headYaw, 0);

  // Sneaking tilt
  if (entity && entity.sneaking) {
    const bodyT = byName['body'];
    if (bodyT) bodyT.rx -= 0.5;
    const headT = byName['head'];
    if (headT) headT.rx += 0.3;
  }

  // Idle body bob
  const bodyT = byName['body'];
  if (bodyT) bodyT.py += Math.sin(time * 1.5) * 0.005;
}

// ---------------------------------------------------------------------------
// BIRD rig
// ---------------------------------------------------------------------------
function ANIM_rigBird(byName, model, swing, swingAmt, headYaw, pitch, time, onGround, dead, deathTime, hurt, baby) {
  const inFlight = !onGround;

  // Wing flap ~4Hz when airborne
  if (inFlight) {
    const flapAngle = Math.sin(time * 4 * ANIM_TAU / 20) * 0.8;
    ANIM_addRot(byName, 'wing_r', 0, 0, flapAngle);
    ANIM_addRot(byName, 'wing_l', 0, 0, -flapAngle);
  } else {
    // Folded
    ANIM_addRot(byName, 'wing_r', 0, 0, 0.2);
    ANIM_addRot(byName, 'wing_l', 0, 0, -0.2);
  }

  // Legs tuck in flight
  if (inFlight) {
    ANIM_addRot(byName, 'leg_r', 0.6, 0, 0);
    ANIM_addRot(byName, 'leg_l', 0.6, 0, 0);
  } else {
    const amp = (swingAmt || 0) * 0.5;
    ANIM_addRot(byName, 'leg_r', Math.sin(swing) * amp, 0, 0);
    ANIM_addRot(byName, 'leg_l', -Math.sin(swing) * amp, 0, 0);
  }

  // Head tracking
  ANIM_setRot(byName, 'head', pitch, headYaw, 0);
}

// ---------------------------------------------------------------------------
// FISH rig
// Whole-body yaw in a travelling sine, tail lags body
// ---------------------------------------------------------------------------
function ANIM_rigFish(byName, model, swing, swingAmt, headYaw, time, inWater, dead, deathTime) {
  const speed = swingAmt || 0;
  const wave = Math.sin(time * 0.5 + swing) * (0.3 + speed * 0.6);

  // Body rotates
  const bodyT = byName['body'];
  if (bodyT) bodyT.ry += wave;

  // Tail lags behind
  const tailT = byName['tail'];
  if (tailT) tailT.ry += wave * 1.4;

  // Upright correction when out of water
  if (!inWater) {
    for (const t of Object.values(byName)) {
      t.rz += Math.PI * 0.1 * Math.sin(time * 0.3);
    }
  }
}

// ---------------------------------------------------------------------------
// SPIDER rig
// 8 legs in 2 phase groups of 4
// ---------------------------------------------------------------------------
function ANIM_rigSpider(byName, model, swing, swingAmt, headYaw, pitch, time, dead, deathTime, hurt) {
  const amp = 0.3 + swingAmt * 0.4;

  // Group A (legs 0,2,l0,l2): phase 0
  // Group B (legs 1,3,l1,l3): phase PI
  const legNames = ['leg_r0','leg_r1','leg_r2','leg_r3','leg_l0','leg_l1','leg_l2','leg_l3'];
  const phases = [0, Math.PI, 0, Math.PI, 0, Math.PI, 0, Math.PI];

  for (let i = 0; i < legNames.length; i++) {
    const t = byName[legNames[i]];
    if (!t) continue;
    const phase = phases[i];
    const lift = Math.max(0, Math.sin(swing * 2 + phase)) * 0.4;
    const side = i < 4 ? 0.3 + lift : -(0.3 + lift); // outward spread
    t.rx += Math.sin(swing * 2 + phase) * amp * 0.5;
    t.ry += side;
    t.py -= lift * 0.05;
  }

  // Body dip
  const bodyT = byName['body'];
  if (bodyT) bodyT.py += Math.abs(Math.sin(swing * 2)) * -0.03;

  // Head tracking
  ANIM_setRot(byName, 'head', pitch * 0.5, headYaw, 0);
}

// ---------------------------------------------------------------------------
// BLOB rig (slime, magma cube)
// Squash/stretch on a sine (hop cycle) + slight yaw wobble
// ---------------------------------------------------------------------------
function ANIM_rigBlob(byName, model, time, dead, deathTime) {
  const hop = Math.abs(Math.sin(time * 0.15));
  const squash = 1 - hop * 0.2;
  const stretch = 1 + hop * 0.2;
  // Wobble rotation during bounce
  const wobbleRY = Math.sin(time * 0.15) * 0.08;

  const bodyT = byName['body'];
  if (bodyT) {
    bodyT.sy *= squash;
    bodyT.sx *= stretch;
    bodyT.sz *= stretch;
    bodyT.ry += wobbleRY;
  }
  // Inner body same
  const innerT = byName['body_inner'];
  if (innerT) {
    innerT.sy *= squash;
    innerT.sx *= stretch;
    innerT.sz *= stretch;
    innerT.ry += wobbleRY * 1.2;
  }
}

// ---------------------------------------------------------------------------
// Idle bob fallback
// ---------------------------------------------------------------------------
function ANIM_idleBob(byName, model, time) {
  const bodyT = byName['body'];
  if (bodyT) bodyT.py += Math.sin(time * 0.8) * 0.02;
  const headT = byName['head'];
  if (headT) headT.ry += Math.sin(time * 0.5) * 0.05;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function ANIM_setRot(byName, name, rx, ry, rz) {
  const t = byName[name];
  if (!t) return;
  t.rx += rx; t.ry += ry; t.rz += rz;
}

function ANIM_addRot(byName, name, rx, ry, rz) {
  const t = byName[name];
  if (!t) return;
  t.rx += rx; t.ry += ry; t.rz += rz;
}

// ---------------------------------------------------------------------------
// CUSTOM_ANIMATORS – named custom mob animators
// ---------------------------------------------------------------------------
export const CUSTOM_ANIMATORS = {

  // STRIDER: legs alternate with wide lateral swing, body tilts
  strider(entity, byName, model, time, swing, swingAmt, headYaw, pitch) {
    const amp = 0.5 + swingAmt * 0.5;
    const rotR = Math.sin(swing * 1.5) * amp;
    ANIM_addRot(byName, 'leg_r', rotR, 0, rotR * 0.3);
    ANIM_addRot(byName, 'leg_l', -rotR, 0, -rotR * 0.3);
    // Body tilt side to side
    const bodyT = byName['body'];
    if (bodyT) bodyT.rz += Math.sin(swing) * 0.1 * swingAmt;
    ANIM_setRot(byName, 'head', pitch, headYaw, 0);
  },

  // ALLAY: hovering wing blur + arm sway
  allay(entity, byName, model, time, swing, swingAmt, headYaw, pitch, onGround, inWater, dt) {
    // Hover bob
    const bob = Math.sin(time * 0.06) * 0.05;
    const bodyT = byName['body'];
    if (bodyT) bodyT.py += bob;

    // Wing flutter (very fast)
    const flutter = Math.sin(time * 0.4) * 0.6;
    ANIM_addRot(byName, 'wing_r', 0, flutter, 0);
    ANIM_addRot(byName, 'wing_l', 0, -flutter, 0);

    // Arm sway
    const armSway = Math.sin(time * 0.08) * 0.3;
    ANIM_addRot(byName, 'arm_r', armSway, 0, 0);
    ANIM_addRot(byName, 'arm_l', -armSway, 0, 0);

    ANIM_setRot(byName, 'head', pitch, headYaw, 0);
  },

  // SQUID: tentacles undulate + mantle pulse
  squid(entity, byName, model, time, swing, swingAmt) {
    const pulse = Math.sin(time * 0.08) * 0.4;
    const bodyT = byName['body'];
    if (bodyT) { bodyT.sy += pulse * 0.1; bodyT.sx -= pulse * 0.05; bodyT.sz -= pulse * 0.05; }

    // Tentacles undulate in a wave
    for (let i = 0; i < 8; i++) {
      const t = byName[`tentacle${i}`];
      if (!t) continue;
      const phase = (i / 8) * ANIM_TAU;
      t.rx += Math.sin(time * 0.1 + phase) * 0.4;
    }
  },

  glow_squid(entity, byName, model, time, swing, swingAmt) {
    CUSTOM_ANIMATORS.squid(entity, byName, model, time, swing, swingAmt);
  },

  // GUARDIAN: spikes extend when aggroed, eye tracks target
  guardian(entity, byName, model, time, swing, swingAmt, headYaw, pitch) {
    const aggroed = !!(entity.target);
    const spineScale = aggroed ? (1 + Math.sin(time * 0.2) * 0.2) : 1;
    const spine0 = byName['spine0'];
    if (spine0) { spine0.sx *= spineScale; spine0.sz *= spineScale; }
    const spine1 = byName['spine1'];
    if (spine1) { spine1.sx *= spineScale; spine1.sz *= spineScale; }

    // Eye track target
    const eyeT = byName['eye'];
    if (eyeT) {
      eyeT.ry += headYaw;
      eyeT.rx += pitch;
    }

    // Gentle drift rotation
    const bodyT = byName['body'];
    if (bodyT) { bodyT.ry += Math.sin(time * 0.03) * 0.05; }
  },

  elder_guardian(entity, byName, model, time, swing, swingAmt, headYaw, pitch) {
    CUSTOM_ANIMATORS.guardian(entity, byName, model, time, swing, swingAmt, headYaw, pitch);
  },

  // BLAZE: rods orbit at 3 different radii/speeds
  blaze(entity, byName, model, time) {
    for (let i = 0; i < 12; i++) {
      const rod = byName[`rod${i}`];
      if (!rod) continue;
      const ring = Math.floor(i / 4);
      const speed = 0.04 + ring * 0.02;
      const radius = 0.3 + ring * 0.1;
      const baseAngle = (i / 12) * ANIM_TAU;
      const angle = baseAngle + time * speed;
      rod.px = Math.cos(angle) * radius * 6 * ANIM_MODEL_SCALE;
      rod.pz = Math.sin(angle) * radius * 6 * ANIM_MODEL_SCALE;
      rod.ry = angle;
    }
    // Body bob
    const headT = byName['head'];
    if (headT) headT.py += Math.sin(time * 0.05) * 0.02;
  },

  // GHAST: tentacles dangle with a lazy sway
  ghast(entity, byName, model, time, swing, swingAmt) {
    for (let i = 0; i < 9; i++) {
      const t = byName[`tentacle${i}`];
      if (!t) continue;
      const phase = i * 0.7;
      t.rx += Math.sin(time * 0.04 + phase) * 0.15;
      t.rz += Math.cos(time * 0.035 + phase) * 0.08;
    }
    // Body float
    const bodyT = byName['body'];
    if (bodyT) bodyT.py += Math.sin(time * 0.025) * 0.03;
  },

  // ENDER_DRAGON: wing beat + neck/tail segment wave + mouth open during breath
  ender_dragon(entity, byName, model, time, swing, swingAmt, headYaw, pitch) {
    // Wing beat
    const wingBeat = Math.sin(time * 0.07) * 0.6;
    ANIM_addRot(byName, 'wing_r0', wingBeat, 0, 0);
    ANIM_addRot(byName, 'wing_l0', wingBeat, 0, 0);
    ANIM_addRot(byName, 'wing_r1', wingBeat * 0.7, 0, 0);
    ANIM_addRot(byName, 'wing_l1', wingBeat * 0.7, 0, 0);

    // Neck segments wave
    const neckWave = Math.sin(time * 0.06) * 0.15;
    ANIM_addRot(byName, 'neck0', pitch + neckWave, headYaw * 0.3, 0);
    ANIM_addRot(byName, 'neck1', neckWave * 0.7, headYaw * 0.2, 0);
    ANIM_addRot(byName, 'neck2', neckWave * 0.4, headYaw * 0.1, 0);
    ANIM_addRot(byName, 'head', pitch * 0.5, headYaw * 0.5, 0);

    // Jaw open during breath attack
    const jawT = byName['jaw'];
    if (jawT) jawT.rx += entity.attacking ? 0.4 : Math.sin(time * 0.03) * 0.05;

    // Tail wave
    const tail0 = byName['tail0']; if (tail0) tail0.ry += Math.sin(time * 0.05) * 0.2;
    const tail1 = byName['tail1']; if (tail1) tail1.ry += Math.sin(time * 0.05 + 0.5) * 0.3;
    const tail2 = byName['tail2']; if (tail2) tail2.ry += Math.sin(time * 0.05 + 1.0) * 0.4;

    // Legs
    const legAmp = swingAmt * 0.3;
    ANIM_addRot(byName, 'leg_fr', Math.sin(swing) * legAmp, 0, 0);
    ANIM_addRot(byName, 'leg_fl', -Math.sin(swing) * legAmp, 0, 0);
    ANIM_addRot(byName, 'leg_br', -Math.sin(swing) * legAmp, 0, 0);
    ANIM_addRot(byName, 'leg_bl', Math.sin(swing) * legAmp, 0, 0);
  },

  // WITHER: 3 heads track independently, side heads lag, ribs bob
  wither(entity, byName, model, time, swing, swingAmt, headYaw, pitch) {
    // Main head
    const headT = byName['head'];
    if (headT) { headT.rx += pitch; headT.ry += headYaw; }

    // Side heads lag behind main head
    const lag = 0.15;
    const headR = byName['head_r'];
    if (headR) { headR.rx += pitch * 0.7; headR.ry += headYaw * 0.7 + Math.sin(time * 0.05) * lag; }
    const headL = byName['head_l'];
    if (headL) { headL.rx += pitch * 0.7; headL.ry += headYaw * 0.7 - Math.sin(time * 0.05) * lag; }

    // Ribs bob
    const ribBob = Math.sin(time * 0.06) * 0.02;
    ['rib0','rib1','rib2'].forEach((n, i) => {
      const t = byName[n];
      if (t) t.py += ribBob * (i + 1) * 0.5;
    });

    // Arms swing
    ANIM_addRot(byName, 'arm_r', Math.sin(swing) * swingAmt * 0.4, 0, 0);
    ANIM_addRot(byName, 'arm_l', -Math.sin(swing) * swingAmt * 0.4, 0, 0);
  },

  // PHANTOM: wing flap + banking roll
  phantom(entity, byName, model, time, swing, swingAmt, headYaw, pitch) {
    const flapAngle = Math.sin(time * 0.2) * 0.7;
    ANIM_addRot(byName, 'wing_r', flapAngle, 0, 0);
    ANIM_addRot(byName, 'wing_l', flapAngle, 0, 0);

    // Banking roll during turns
    const roll = headYaw * 0.15;
    const bodyT = byName['body'];
    if (bodyT) { bodyT.rz += roll; bodyT.rx += pitch * 0.3; }

    const headT = byName['head'];
    if (headT) { headT.rx += pitch; headT.ry += headYaw * 0.5; }

    // Tail wave
    const tailT = byName['tail'];
    if (tailT) tailT.ry += Math.sin(time * 0.15) * 0.2;
  },

  // SHULKER: lid opens/closes, head extends when attacking
  shulker(entity, byName, model, time, swing, swingAmt, headYaw, pitch) {
    const attacking = !!(entity.target) || (entity.attackCooldown || 0) > 0;
    const openAmt = attacking ? Math.min(1, (entity.stateTimer || 0) / 10) : Math.max(0, 1 - (entity.stateTimer || 0) / 10);

    const bodyT = byName['body'];
    if (bodyT) bodyT.rx += -openAmt * 0.5; // lid tilts up

    const headT = byName['head'];
    if (headT) {
      // Head extends downward when attacking
      headT.py += -openAmt * 0.3;
      headT.rx += pitch;
      headT.ry += headYaw;
    }
  },

  snow_golem(entity, byName, model, time, swing, swingAmt, headYaw, pitch) {
    ANIM_setRot(byName, 'head', pitch, headYaw, 0);
    const armSwing = Math.sin(time * 0.07) * 0.3;
    ANIM_addRot(byName, 'arm_r', armSwing, 0, 0);
    ANIM_addRot(byName, 'arm_l', -armSwing, 0, 0);
  },
};
