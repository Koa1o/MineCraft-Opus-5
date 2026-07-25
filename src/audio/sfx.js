// ---------------------------------------------------------------------------
// Audio synthesis — WebAudio only, no audio files.
// All top-level names prefixed SFX_ or AUDIO_ for concatenation safety.
// ---------------------------------------------------------------------------

import { makeRng } from '../core/rng.js';
import { clamp, clamp01 } from '../core/util.js';
import { MOB_SOUND_NAMES } from '../entities/mobs/index.js';

// ---------------------------------------------------------------------------
// LOW-LEVEL SYNTH PRIMITIVES
// ---------------------------------------------------------------------------

/** Build an OscillatorNode with exponential freq sweep + gain envelope. */
function SFX_tone(ctx, out, { freq = 440, type = 'sine', dur = 0.3, attack = 0.01, decay = 0.15,
  sustain = 0, release = 0.1, gain = 0.4, sweep = 0, vibrato = 0, vibRate = 6 } = {}) {
  const now = ctx.currentTime;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, now);
  g.gain.linearRampToValueAtTime(gain, now + attack);
  g.gain.linearRampToValueAtTime(sustain * gain, now + attack + decay);
  g.gain.setValueAtTime(sustain * gain, now + dur - release);
  g.gain.linearRampToValueAtTime(0, now + dur);
  const osc = ctx.createOscillator();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, now);
  if (sweep !== 0) osc.frequency.exponentialRampToValueAtTime(Math.max(1, freq + sweep), now + dur);
  if (vibrato > 0) {
    const lfo = ctx.createOscillator();
    lfo.frequency.setValueAtTime(vibRate, now);
    const lfoGain = ctx.createGain();
    lfoGain.gain.setValueAtTime(vibrato, now);
    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);
    lfo.start(now);
    lfo.stop(now + dur + 0.05);
  }
  osc.connect(g);
  g.connect(out);
  osc.start(now);
  osc.stop(now + dur + 0.05);
}

/** Filtered noise burst. */
function SFX_noise(ctx, out, { dur = 0.2, filterFreq = 800, filterQ = 1, sweep = 0,
  gain = 0.3, attack = 0.005, decay = 0.1, filterType = 'bandpass', gainSweep = 0 } = {}) {
  const now = ctx.currentTime;
  const rate = ctx.sampleRate || 44100;
  const len = Math.max(1, Math.floor(rate * (dur + 0.1)));
  const buf = ctx.createBuffer(1, len, rate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const filt = ctx.createBiquadFilter();
  filt.type = filterType;
  filt.frequency.setValueAtTime(filterFreq, now);
  if (sweep !== 0) filt.frequency.exponentialRampToValueAtTime(Math.max(20, filterFreq + sweep), now + dur);
  filt.Q.setValueAtTime(filterQ, now);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, now);
  g.gain.linearRampToValueAtTime(gain, now + attack);
  g.gain.exponentialRampToValueAtTime(Math.max(0.0001, gain * 0.01), now + dur);
  if (gainSweep !== 0) g.gain.linearRampToValueAtTime(Math.max(0, gain + gainSweep), now + dur * 0.5);
  src.connect(filt);
  filt.connect(g);
  g.connect(out);
  src.start(now);
  src.stop(now + dur + 0.05);
}

/** Low rumble growl using detuned oscillators. */
function SFX_growl(ctx, out, { freq = 80, dur = 0.4, gain = 0.35, sweep = -20 } = {}) {
  SFX_tone(ctx, out, { freq, type: 'sawtooth', dur, gain, sweep, attack: 0.02, decay: 0.15 });
  SFX_tone(ctx, out, { freq: freq * 1.01, type: 'sawtooth', dur, gain: gain * 0.5, sweep: sweep * 0.8, attack: 0.02, decay: 0.15 });
  SFX_noise(ctx, out, { dur: dur * 0.5, filterFreq: freq * 2, filterQ: 0.5, gain: gain * 0.3 });
}

/** High chirp — short sine sweep up. */
function SFX_chirp(ctx, out, { freq = 600, dur = 0.15, gain = 0.3, sweep = 400 } = {}) {
  SFX_tone(ctx, out, { freq, type: 'sine', dur, gain, sweep, attack: 0.005, decay: 0.08 });
}

/** Low thud / impact. */
function SFX_thud(ctx, out, { freq = 60, dur = 0.2, gain = 0.5, sweep = -40 } = {}) {
  SFX_tone(ctx, out, { freq, type: 'sine', dur, gain, sweep, attack: 0.001, decay: dur * 0.7 });
  SFX_noise(ctx, out, { dur: 0.08, filterFreq: 200, filterQ: 0.3, gain: gain * 0.4 });
}

/** White hiss — high pass filtered noise. */
function SFX_hiss(ctx, out, { dur = 0.3, filterFreq = 4000, gain = 0.15 } = {}) {
  SFX_noise(ctx, out, { dur, filterFreq, filterQ: 0.5, gain, attack: 0.02, filterType: 'highpass' });
}

/** Metallic clang. */
function SFX_clang(ctx, out, { freq = 900, dur = 0.5, gain = 0.4 } = {}) {
  SFX_tone(ctx, out, { freq, type: 'square', dur, gain, sweep: -200, attack: 0.001, decay: 0.3 });
  SFX_tone(ctx, out, { freq: freq * 1.414, type: 'sine', dur: dur * 0.7, gain: gain * 0.3, attack: 0.001, decay: 0.2 });
}

/** Wet squelch / slap. */
function SFX_squelch(ctx, out, { freq = 220, dur = 0.25, gain = 0.35 } = {}) {
  SFX_tone(ctx, out, { freq, type: 'sine', dur, gain, sweep: -80, attack: 0.008, decay: 0.15 });
  SFX_noise(ctx, out, { dur: 0.12, filterFreq: 600, filterQ: 2, gain: gain * 0.4 });
}

/** Big roar — layered. */
function SFX_roar(ctx, out, { freq = 100, dur = 0.8, gain = 0.5 } = {}) {
  SFX_growl(ctx, out, { freq, dur, gain, sweep: -30 });
  SFX_tone(ctx, out, { freq: freq * 0.5, type: 'triangle', dur, gain: gain * 0.4, sweep: 20, vibrato: freq * 0.05, vibRate: 4 });
}

/** Explosive boom. */
function SFX_boom(ctx, out, { freq = 60, dur = 0.7, gain = 0.6 } = {}) {
  SFX_tone(ctx, out, { freq, type: 'sawtooth', dur: dur * 0.5, gain, sweep: -50, attack: 0.001, decay: dur * 0.3 });
  SFX_noise(ctx, out, { dur, filterFreq: 300, filterQ: 0.3, gain: gain * 0.7, attack: 0.001, sweep: -200 });
}

// ---------------------------------------------------------------------------
// MOB VOICE PARAMS TABLE — explicit per-mob base voice
// ---------------------------------------------------------------------------
const SFX_MOB_BASE = {
  pig:        { freq: 280, type: 'squelch', gain: 0.3 },
  cow:        { freq: 160, type: 'growl',   gain: 0.35 },
  mooshroom:  { freq: 155, type: 'growl',   gain: 0.35 },
  sheep:      { freq: 320, type: 'squelch', gain: 0.25 },
  chicken:    { freq: 700, type: 'chirp',   gain: 0.25 },
  rabbit:     { freq: 500, type: 'chirp',   gain: 0.2 },
  horse:      { freq: 220, type: 'growl',   gain: 0.4 },
  donkey:     { freq: 180, type: 'growl',   gain: 0.4 },
  mule:       { freq: 195, type: 'growl',   gain: 0.38 },
  llama:      { freq: 250, type: 'growl',   gain: 0.35 },
  cat:        { freq: 450, type: 'chirp',   gain: 0.25 },
  ocelot:     { freq: 430, type: 'chirp',   gain: 0.22 },
  wolf:       { freq: 280, type: 'growl',   gain: 0.35 },
  parrot:     { freq: 800, type: 'chirp',   gain: 0.2 },
  fox:        { freq: 380, type: 'chirp',   gain: 0.25 },
  bee:        { freq: 600, type: 'hiss',    gain: 0.2 },
  turtle:     { freq: 120, type: 'growl',   gain: 0.3 },
  goat:       { freq: 300, type: 'squelch', gain: 0.3 },
  sniffer:    { freq: 140, type: 'growl',   gain: 0.4 },
  camel:      { freq: 200, type: 'growl',   gain: 0.35 },
  armadillo:  { freq: 350, type: 'chirp',   gain: 0.2 },
  bat:        { freq: 1200, type: 'chirp',  gain: 0.15 },
  allay:      { freq: 900, type: 'chirp',   gain: 0.18 },
  cod:        { freq: 900, type: 'hiss',    gain: 0.15 },
  salmon:     { freq: 850, type: 'hiss',    gain: 0.15 },
  tropical_fish: { freq: 950, type: 'hiss', gain: 0.14 },
  pufferfish: { freq: 500, type: 'hiss',    gain: 0.18 },
  squid:      { freq: 200, type: 'squelch', gain: 0.2 },
  glow_squid: { freq: 220, type: 'squelch', gain: 0.2 },
  axolotl:    { freq: 400, type: 'chirp',   gain: 0.2 },
  frog:       { freq: 250, type: 'squelch', gain: 0.28 },
  tadpole:    { freq: 600, type: 'chirp',   gain: 0.15 },
  dolphin:    { freq: 1100, type: 'chirp',  gain: 0.25 },
  iron_golem: { freq: 90, type: 'clang',   gain: 0.5 },
  snow_golem: { freq: 400, type: 'hiss',   gain: 0.2 },
  panda:      { freq: 160, type: 'growl',   gain: 0.38 },
  polar_bear: { freq: 130, type: 'roar',    gain: 0.5 },
  spider:     { freq: 300, type: 'hiss',    gain: 0.3 },
  cave_spider: { freq: 380, type: 'hiss',   gain: 0.28 },
  enderman:   { freq: 80, type: 'tone',    gain: 0.4 },
  piglin:     { freq: 280, type: 'squelch', gain: 0.32 },
  zoglin:     { freq: 240, type: 'growl',   gain: 0.38 },
  strider:    { freq: 180, type: 'squelch', gain: 0.3 },
  villager:   { freq: 320, type: 'tone',    gain: 0.28 },
  wandering_trader: { freq: 300, type: 'tone', gain: 0.27 },
  zombie:     { freq: 160, type: 'growl',   gain: 0.4 },
  husk:       { freq: 150, type: 'growl',   gain: 0.4 },
  drowned:    { freq: 140, type: 'growl',   gain: 0.38 },
  zombie_villager: { freq: 165, type: 'growl', gain: 0.38 },
  skeleton:   { freq: 600, type: 'tone',    gain: 0.3 },
  stray:      { freq: 580, type: 'tone',    gain: 0.3 },
  bogged:     { freq: 570, type: 'hiss',    gain: 0.28 },
  wither_skeleton: { freq: 480, type: 'tone', gain: 0.35 },
  creeper:    { freq: 500, type: 'hiss',    gain: 0.25 },
  charged_creeper: { freq: 550, type: 'hiss', gain: 0.3 },
  slime:      { freq: 300, type: 'squelch', gain: 0.3 },
  magma_cube: { freq: 200, type: 'squelch', gain: 0.35 },
  silverfish: { freq: 800, type: 'hiss',    gain: 0.2 },
  endermite:  { freq: 900, type: 'hiss',    gain: 0.18 },
  witch:      { freq: 380, type: 'tone',    gain: 0.3 },
  pillager:   { freq: 260, type: 'growl',   gain: 0.35 },
  vindicator: { freq: 240, type: 'growl',   gain: 0.38 },
  evoker:     { freq: 300, type: 'tone',    gain: 0.35 },
  vex:        { freq: 700, type: 'tone',    gain: 0.3 },
  ravager:    { freq: 100, type: 'roar',    gain: 0.55 },
  illusioner: { freq: 290, type: 'tone',    gain: 0.33 },
  guardian:   { freq: 250, type: 'hiss',    gain: 0.35 },
  elder_guardian: { freq: 200, type: 'roar', gain: 0.5 },
  shulker:    { freq: 220, type: 'tone',    gain: 0.3 },
  blaze:      { freq: 400, type: 'hiss',    gain: 0.35 },
  ghast:      { freq: 160, type: 'tone',    gain: 0.45 },
  hoglin:     { freq: 220, type: 'growl',   gain: 0.4 },
  piglin_brute: { freq: 265, type: 'squelch', gain: 0.35 },
  phantom:    { freq: 500, type: 'tone',    gain: 0.35 },
  warden:     { freq: 60, type: 'roar',    gain: 0.6 },
  ender_dragon: { freq: 80, type: 'roar',  gain: 0.6 },
  wither:     { freq: 90, type: 'roar',    gain: 0.6 },
};

/** Derive idle/hurt/death/step sounds from a mob's base voice entry. */
function SFX_mobSound(ctx, out, mobId, variant, opts) {
  const base = SFX_MOB_BASE[mobId] || { freq: 400, type: 'tone', gain: 0.3 };
  const { freq, type, gain } = base;
  const g = opts && opts.gain != null ? opts.gain : gain;

  switch (variant) {
    case 'idle':
      if (type === 'squelch') SFX_squelch(ctx, out, { freq, dur: 0.35, gain: g });
      else if (type === 'chirp') SFX_chirp(ctx, out, { freq, dur: 0.2, gain: g });
      else if (type === 'growl') SFX_growl(ctx, out, { freq, dur: 0.4, gain: g });
      else if (type === 'hiss') SFX_hiss(ctx, out, { dur: 0.25, filterFreq: freq, gain: g });
      else if (type === 'clang') SFX_clang(ctx, out, { freq, dur: 0.3, gain: g });
      else if (type === 'roar') SFX_roar(ctx, out, { freq, dur: 0.5, gain: g * 0.7 });
      else SFX_tone(ctx, out, { freq, type: 'sine', dur: 0.3, gain: g });
      break;
    case 'hurt':
      if (type === 'squelch') SFX_squelch(ctx, out, { freq: freq * 1.4, dur: 0.2, gain: g });
      else if (type === 'chirp') SFX_chirp(ctx, out, { freq: freq * 1.3, dur: 0.15, gain: g, sweep: 200 });
      else if (type === 'growl') SFX_growl(ctx, out, { freq: freq * 1.2, dur: 0.2, gain: g });
      else if (type === 'hiss') SFX_hiss(ctx, out, { dur: 0.15, filterFreq: freq * 1.5, gain: g });
      else if (type === 'clang') SFX_clang(ctx, out, { freq: freq * 1.3, dur: 0.25, gain: g });
      else if (type === 'roar') SFX_roar(ctx, out, { freq: freq * 1.2, dur: 0.3, gain: g });
      else SFX_tone(ctx, out, { freq: freq * 1.3, type: 'sawtooth', dur: 0.2, gain: g, sweep: -100 });
      break;
    case 'death':
      if (type === 'squelch') { SFX_squelch(ctx, out, { freq, dur: 0.4, gain: g }); SFX_noise(ctx, out, { dur: 0.3, filterFreq: 400, gain: g * 0.5 }); }
      else if (type === 'chirp') SFX_chirp(ctx, out, { freq, dur: 0.3, gain: g, sweep: -300 });
      else if (type === 'growl') SFX_growl(ctx, out, { freq, dur: 0.5, gain: g, sweep: -30 });
      else if (type === 'hiss') SFX_hiss(ctx, out, { dur: 0.4, filterFreq: freq, gain: g });
      else if (type === 'clang') { SFX_clang(ctx, out, { freq, dur: 0.6, gain: g }); SFX_thud(ctx, out, { freq: 60, gain: g * 0.8 }); }
      else if (type === 'roar') SFX_roar(ctx, out, { freq: freq * 0.8, dur: 0.9, gain: g });
      else SFX_tone(ctx, out, { freq, type: 'sine', dur: 0.5, gain: g, sweep: -(freq * 0.6) });
      break;
    case 'step':
      SFX_thud(ctx, out, { freq: 50 + freq * 0.1, dur: 0.08, gain: g * 0.4 });
      break;
    default:
      SFX_tone(ctx, out, { freq, type: 'sine', dur: 0.2, gain: g * 0.5 });
  }
}

// ---------------------------------------------------------------------------
// SFX TABLE — all 222 mob sound names + block/UI sounds
// ---------------------------------------------------------------------------
export const SFX = {};

// Helper to register a mob sound function
function AUDIO_regMob(name, mobId, variant, overrides) {
  SFX[name] = (ctx, out, opts) => SFX_mobSound(ctx, out, mobId, variant, Object.assign({}, overrides, opts));
}

// --- Passive A mobs ---
AUDIO_regMob('pigIdle',   'pig', 'idle');   AUDIO_regMob('pigHurt',   'pig', 'hurt');   AUDIO_regMob('pigDeath',   'pig', 'death');
AUDIO_regMob('cowIdle',   'cow', 'idle');   AUDIO_regMob('cowHurt',   'cow', 'hurt');   AUDIO_regMob('cowDeath',   'cow', 'death');
AUDIO_regMob('sheepIdle', 'sheep','idle');  AUDIO_regMob('sheepHurt', 'sheep','hurt');  AUDIO_regMob('sheepDeath', 'sheep','death');
AUDIO_regMob('chickenIdle','chicken','idle'); AUDIO_regMob('chickenHurt','chicken','hurt'); AUDIO_regMob('chickenDeath','chicken','death');
AUDIO_regMob('rabbitIdle','rabbit','idle'); AUDIO_regMob('rabbitHurt','rabbit','hurt'); AUDIO_regMob('rabbitDeath','rabbit','death');
AUDIO_regMob('horseIdle', 'horse', 'idle'); AUDIO_regMob('horseHurt', 'horse', 'hurt'); AUDIO_regMob('horseDeath', 'horse', 'death');
AUDIO_regMob('donkeyIdle','donkey','idle'); AUDIO_regMob('donkeyHurt','donkey','hurt'); AUDIO_regMob('donkeyDeath','donkey','death');
AUDIO_regMob('llamaIdle', 'llama', 'idle'); AUDIO_regMob('llamaHurt', 'llama', 'hurt'); AUDIO_regMob('llamaDeath', 'llama', 'death');

// special horse sound
SFX.horseJump = (ctx, out, opts) => SFX_tone(ctx, out, { freq: 260, type: 'sine', dur: 0.25, gain: 0.35, sweep: 80, attack: 0.01 });

// --- Passive B mobs ---
AUDIO_regMob('catIdle',   'cat',    'idle'); AUDIO_regMob('catHurt',   'cat',    'hurt'); AUDIO_regMob('catDeath',   'cat',    'death');
AUDIO_regMob('wolfIdle',  'wolf',   'idle'); AUDIO_regMob('wolfHurt',  'wolf',   'hurt'); AUDIO_regMob('wolfDeath',  'wolf',   'death');
AUDIO_regMob('parrotIdle','parrot', 'idle'); AUDIO_regMob('parrotHurt','parrot', 'hurt'); AUDIO_regMob('parrotDeath','parrot', 'death');
AUDIO_regMob('foxIdle',   'fox',    'idle'); AUDIO_regMob('foxHurt',   'fox',    'hurt'); AUDIO_regMob('foxDeath',   'fox',    'death');
AUDIO_regMob('beeIdle',   'bee',    'idle'); AUDIO_regMob('beeHurt',   'bee',    'hurt'); AUDIO_regMob('beeDeath',   'bee',    'death');
AUDIO_regMob('turtleIdle','turtle', 'idle'); AUDIO_regMob('turtleHurt','turtle', 'hurt'); AUDIO_regMob('turtleDeath','turtle', 'death');
AUDIO_regMob('goatIdle',  'goat',   'idle'); AUDIO_regMob('goatHurt',  'goat',   'hurt'); AUDIO_regMob('goatDeath',  'goat',   'death');
AUDIO_regMob('snifferIdle','sniffer','idle'); AUDIO_regMob('snifferHurt','sniffer','hurt'); AUDIO_regMob('snifferDeath','sniffer','death');
AUDIO_regMob('camelIdle', 'camel',  'idle'); AUDIO_regMob('camelHurt', 'camel',  'hurt'); AUDIO_regMob('camelDeath', 'camel',  'death');
AUDIO_regMob('armadilloIdle','armadillo','idle'); AUDIO_regMob('armadilloHurt','armadillo','hurt'); AUDIO_regMob('armadilloDeath','armadillo','death');
AUDIO_regMob('batIdle',   'bat',    'idle'); AUDIO_regMob('batHurt',   'bat',    'hurt'); AUDIO_regMob('batDeath',   'bat',    'death');
AUDIO_regMob('allayIdle', 'allay',  'idle'); AUDIO_regMob('allayHurt', 'allay',  'hurt'); AUDIO_regMob('allayDeath', 'allay',  'death');

// specials
SFX.catPurr = (ctx, out, opts) => SFX_tone(ctx, out, { freq: 300, type: 'sine', dur: 0.6, gain: 0.18, vibrato: 8, vibRate: 25, attack: 0.05 });
SFX.wolfHowl = (ctx, out, opts) => SFX_tone(ctx, out, { freq: 220, type: 'sine', dur: 1.0, gain: 0.45, sweep: 180, vibrato: 12, vibRate: 3 });
SFX.beeSting = (ctx, out, opts) => { SFX_hiss(ctx, out, { dur: 0.15, filterFreq: 3000, gain: 0.2 }); SFX_chirp(ctx, out, { freq: 900, dur: 0.1, gain: 0.2 }); };
SFX.goatBleat = (ctx, out, opts) => SFX_squelch(ctx, out, { freq: 350, dur: 0.4, gain: 0.3 });
SFX.pandaSneeze = (ctx, out, opts) => { SFX_hiss(ctx, out, { dur: 0.12, filterFreq: 5000, gain: 0.3 }); SFX_thud(ctx, out, { freq: 80, dur: 0.15, gain: 0.3 }); };
SFX.snifferSniff = (ctx, out, opts) => SFX_hiss(ctx, out, { dur: 0.4, filterFreq: 2000, gain: 0.2 });
SFX.polarBearRoar = (ctx, out, opts) => SFX_roar(ctx, out, { freq: 110, dur: 0.9, gain: 0.55 });

// --- Aquatic mobs ---
AUDIO_regMob('fishIdle',     'cod',       'idle'); AUDIO_regMob('fishHurt',  'cod',  'hurt'); AUDIO_regMob('fishDeath', 'cod', 'death');
AUDIO_regMob('squidIdle',    'squid',     'idle'); AUDIO_regMob('squidHurt', 'squid','hurt'); AUDIO_regMob('squidDeath','squid','death');
AUDIO_regMob('glowSquidIdle','glow_squid','idle'); AUDIO_regMob('glowSquidHurt','glow_squid','hurt'); AUDIO_regMob('glowSquidDeath','glow_squid','death');
AUDIO_regMob('axolotlIdle',  'axolotl',   'idle'); AUDIO_regMob('axolotlHurt','axolotl','hurt'); AUDIO_regMob('axolotlDeath','axolotl','death');
AUDIO_regMob('frogIdle',     'frog',      'idle'); AUDIO_regMob('frogHurt',  'frog', 'hurt'); AUDIO_regMob('frogDeath', 'frog','death');
AUDIO_regMob('dolphinIdle',  'dolphin',   'idle'); AUDIO_regMob('dolphinHurt','dolphin','hurt'); AUDIO_regMob('dolphinDeath','dolphin','death');

SFX.frogCroak = (ctx, out, opts) => SFX_squelch(ctx, out, { freq: 200, dur: 0.45, gain: 0.3 });
SFX.dolphinChirp = (ctx, out, opts) => SFX_chirp(ctx, out, { freq: 1200, dur: 0.18, gain: 0.28, sweep: -400 });

// --- Neutral mobs ---
AUDIO_regMob('ironGolemIdle', 'iron_golem','idle'); AUDIO_regMob('ironGolemHurt','iron_golem','hurt'); AUDIO_regMob('ironGolemDeath','iron_golem','death');
AUDIO_regMob('snowGolemIdle', 'snow_golem','idle'); AUDIO_regMob('snowGolemHurt','snow_golem','hurt'); AUDIO_regMob('snowGolemDeath','snow_golem','death');
AUDIO_regMob('pandaIdle',     'panda',     'idle'); AUDIO_regMob('pandaHurt',    'panda',    'hurt'); AUDIO_regMob('pandaDeath',    'panda',   'death');
AUDIO_regMob('polarBearIdle', 'polar_bear','idle'); AUDIO_regMob('polarBearHurt','polar_bear','hurt'); AUDIO_regMob('polarBearDeath','polar_bear','death');
AUDIO_regMob('spiderIdle',    'spider',    'idle'); AUDIO_regMob('spiderHurt',   'spider',   'hurt'); AUDIO_regMob('spiderDeath',   'spider',  'death');
AUDIO_regMob('endermanIdle',  'enderman',  'idle'); AUDIO_regMob('endermanHurt', 'enderman', 'hurt'); AUDIO_regMob('endermanDeath', 'enderman','death');
AUDIO_regMob('piglinIdle',    'piglin',    'idle'); AUDIO_regMob('piglinHurt',   'piglin',   'hurt'); AUDIO_regMob('piglinDeath',   'piglin',  'death');
AUDIO_regMob('zoglinIdle',    'zoglin',    'idle'); // reuse as hoglin variant
AUDIO_regMob('striderIdle',   'strider',   'idle'); AUDIO_regMob('striderHurt',  'strider',  'hurt'); AUDIO_regMob('striderDeath',  'strider', 'death');
AUDIO_regMob('villagerIdle',  'villager',  'idle'); AUDIO_regMob('villagerHurt', 'villager', 'hurt'); AUDIO_regMob('villagerDeath', 'villager','death');

SFX.endermanStare = (ctx, out, opts) => { SFX_hiss(ctx, out, { dur: 0.8, filterFreq: 300, gain: 0.4 }); SFX_tone(ctx, out, { freq: 120, type: 'sine', dur: 0.8, gain: 0.25, vibrato: 20, vibRate: 7 }); };
SFX.endermanTeleport = (ctx, out, opts) => { SFX_hiss(ctx, out, { dur: 0.15, filterFreq: 8000, gain: 0.3, attack: 0.001 }); SFX_tone(ctx, out, { freq: 600, type: 'sine', dur: 0.1, gain: 0.3, sweep: -400 }); };
SFX.piglinAngry = (ctx, out, opts) => SFX_growl(ctx, out, { freq: 300, dur: 0.35, gain: 0.4 });
SFX.striderHappy = (ctx, out, opts) => SFX_squelch(ctx, out, { freq: 200, dur: 0.3, gain: 0.28 });
SFX.villagerCelebrate = (ctx, out, opts) => { SFX_chirp(ctx, out, { freq: 600, dur: 0.2, gain: 0.25 }); SFX_chirp(ctx, out, { freq: 800, dur: 0.15, gain: 0.2 }); };
SFX.villagerTrade = (ctx, out, opts) => SFX_tone(ctx, out, { freq: 700, type: 'sine', dur: 0.15, gain: 0.22, sweep: 100 });

// --- Hostile A mobs ---
AUDIO_regMob('zombieIdle',     'zombie',   'idle'); AUDIO_regMob('zombieHurt',   'zombie',  'hurt'); AUDIO_regMob('zombieDeath',   'zombie',  'death');
AUDIO_regMob('huskIdle',       'husk',     'idle'); AUDIO_regMob('huskHurt',     'husk',    'hurt'); AUDIO_regMob('huskDeath',     'husk',    'death');
AUDIO_regMob('drownedIdle',    'drowned',  'idle'); AUDIO_regMob('drownedHurt',  'drowned', 'hurt'); AUDIO_regMob('drownedDeath',  'drowned', 'death');
AUDIO_regMob('skeletonIdle',   'skeleton', 'idle'); AUDIO_regMob('skeletonHurt', 'skeleton','hurt'); AUDIO_regMob('skeletonDeath', 'skeleton','death');
AUDIO_regMob('creeperIdle',    'creeper',  'idle'); AUDIO_regMob('creeperHurt',  'creeper', 'hurt'); AUDIO_regMob('creeperDeath',  'creeper', 'death');
AUDIO_regMob('slimeIdle',      'slime',    'idle'); AUDIO_regMob('slimeHurt',    'slime',   'hurt'); AUDIO_regMob('slimeDeath',    'slime',   'death');
AUDIO_regMob('silverfishIdle', 'silverfish','idle'); AUDIO_regMob('silverfishHurt','silverfish','hurt'); AUDIO_regMob('silverfishDeath','silverfish','death');

SFX.creeperFuse = (ctx, out, opts) => SFX_hiss(ctx, out, { dur: 1.2, filterFreq: 6000, gain: 0.25, attack: 0.05 });
SFX.explode = (ctx, out, opts) => { SFX_boom(ctx, out, { freq: 55, dur: 0.8, gain: 0.7 }); };
SFX.slimeSquish = (ctx, out, opts) => SFX_squelch(ctx, out, { freq: 280, dur: 0.18, gain: 0.3 });
SFX.slimeStep = (ctx, out, opts) => SFX_squelch(ctx, out, { freq: 200, dur: 0.1, gain: 0.2 });
SFX.zombieVillagerIdle = (ctx, out, opts) => SFX_growl(ctx, out, { freq: 170, dur: 0.4, gain: 0.38 });
SFX.zombieVillagerHurt = (ctx, out, opts) => SFX_growl(ctx, out, { freq: 195, dur: 0.2, gain: 0.38 });

// --- Hostile B mobs ---
AUDIO_regMob('witchIdle',      'witch',    'idle'); AUDIO_regMob('witchHurt',    'witch',   'hurt'); AUDIO_regMob('witchDeath',    'witch',   'death');
AUDIO_regMob('pillagerIdle',   'pillager', 'idle'); AUDIO_regMob('pillagerHurt', 'pillager','hurt'); AUDIO_regMob('pillagerDeath', 'pillager','death');
AUDIO_regMob('vindicatorIdle', 'vindicator','idle'); AUDIO_regMob('vindicatorHurt','vindicator','hurt'); AUDIO_regMob('vindicatorDeath','vindicator','death');
AUDIO_regMob('evokerIdle',     'evoker',   'idle'); AUDIO_regMob('evokerHurt',   'evoker',  'hurt'); AUDIO_regMob('evokerDeath',   'evoker',  'death');
AUDIO_regMob('vexIdle',        'vex',      'idle'); AUDIO_regMob('vexHurt',      'vex',     'hurt'); AUDIO_regMob('vexDeath',      'vex',     'death');
AUDIO_regMob('ravagerIdle',    'ravager',  'idle'); AUDIO_regMob('ravagerHurt',  'ravager', 'hurt'); AUDIO_regMob('ravagerDeath',  'ravager', 'death');
AUDIO_regMob('guardianIdle',   'guardian', 'idle'); AUDIO_regMob('guardianHurt', 'guardian','hurt'); AUDIO_regMob('guardianDeath', 'guardian','death');
AUDIO_regMob('shulkerIdle',    'shulker',  'idle'); AUDIO_regMob('shulkerHurt',  'shulker', 'hurt'); AUDIO_regMob('shulkerDeath',  'shulker', 'death');
AUDIO_regMob('blazeIdle',      'blaze',    'idle'); AUDIO_regMob('blazeHurt',    'blaze',   'hurt'); AUDIO_regMob('blazeDeath',    'blaze',   'death');
AUDIO_regMob('ghastIdle',      'ghast',    'idle'); AUDIO_regMob('ghastHurt',    'ghast',   'hurt'); AUDIO_regMob('ghastDeath',    'ghast',   'death');
AUDIO_regMob('hoglinIdle',     'hoglin',   'idle'); AUDIO_regMob('hoglinHurt',   'hoglin',  'hurt'); AUDIO_regMob('hoglinDeath',   'hoglin',  'death');
AUDIO_regMob('phantomIdle',    'phantom',  'idle'); AUDIO_regMob('phantomHurt',  'phantom', 'hurt'); AUDIO_regMob('phantomDeath',  'phantom', 'death');
AUDIO_regMob('wardenIdle',     'warden',   'idle'); AUDIO_regMob('wardenHurt',   'warden',  'hurt'); AUDIO_regMob('wardenDeath',   'warden',  'death');

SFX.pillagerCelebrate = (ctx, out, opts) => { SFX_tone(ctx, out, { freq: 400, type: 'square', dur: 0.25, gain: 0.3 }); };
SFX.evokerCast = (ctx, out, opts) => { SFX_tone(ctx, out, { freq: 500, type: 'sine', dur: 0.4, gain: 0.35, sweep: 300, vibrato: 15, vibRate: 8 }); };
SFX.evokerPrepare = (ctx, out, opts) => SFX_hiss(ctx, out, { dur: 0.5, filterFreq: 2000, gain: 0.25 });
SFX.ravagerRoar = (ctx, out, opts) => SFX_roar(ctx, out, { freq: 95, dur: 0.9, gain: 0.6 });
SFX.ravagerStunned = (ctx, out, opts) => SFX_tone(ctx, out, { freq: 80, type: 'triangle', dur: 0.5, gain: 0.4, vibrato: 10, vibRate: 5 });
SFX.shulkerOpen = (ctx, out, opts) => SFX_tone(ctx, out, { freq: 350, type: 'square', dur: 0.2, gain: 0.25, sweep: 100 });
SFX.shulkerClose = (ctx, out, opts) => SFX_tone(ctx, out, { freq: 450, type: 'square', dur: 0.2, gain: 0.25, sweep: -100 });
SFX.shulkerShoot = (ctx, out, opts) => { SFX_hiss(ctx, out, { dur: 0.15, filterFreq: 5000, gain: 0.2 }); SFX_chirp(ctx, out, { freq: 800, dur: 0.1, gain: 0.25 }); };
SFX.blazeShoot = (ctx, out, opts) => { SFX_hiss(ctx, out, { dur: 0.2, filterFreq: 3000, gain: 0.3 }); SFX_tone(ctx, out, { freq: 300, type: 'sine', dur: 0.15, gain: 0.3, sweep: 200 }); };
SFX.ghastShoot = (ctx, out, opts) => SFX_boom(ctx, out, { freq: 80, dur: 0.5, gain: 0.55 });
SFX.ghastWarn = (ctx, out, opts) => SFX_roar(ctx, out, { freq: 150, dur: 0.7, gain: 0.5 });
SFX.hoglinAngry = (ctx, out, opts) => SFX_growl(ctx, out, { freq: 230, dur: 0.4, gain: 0.42 });
SFX.phantomBite = (ctx, out, opts) => { SFX_clang(ctx, out, { freq: 700, dur: 0.12, gain: 0.3 }); };
SFX.phantomFlap = (ctx, out, opts) => SFX_noise(ctx, out, { dur: 0.2, filterFreq: 1200, filterQ: 1.5, gain: 0.2 });
SFX.wardenDig = (ctx, out, opts) => { SFX_thud(ctx, out, { freq: 50, dur: 0.35, gain: 0.5 }); SFX_noise(ctx, out, { dur: 0.25, filterFreq: 300, gain: 0.3 }); };
SFX.wardenEmerge = (ctx, out, opts) => { SFX_roar(ctx, out, { freq: 65, dur: 1.2, gain: 0.55 }); SFX_noise(ctx, out, { dur: 0.6, filterFreq: 200, gain: 0.4 }); };
SFX.wardenHeartbeat = (ctx, out, opts) => { SFX_thud(ctx, out, { freq: 55, dur: 0.15, gain: 0.5 }); SFX_thud(ctx, out, { freq: 50, dur: 0.12, gain: 0.4 }); };
SFX.wardenRoar = (ctx, out, opts) => SFX_roar(ctx, out, { freq: 65, dur: 1.5, gain: 0.65 });
SFX.wardenSonicBoom = (ctx, out, opts) => { SFX_boom(ctx, out, { freq: 80, dur: 0.6, gain: 0.6 }); SFX_hiss(ctx, out, { dur: 0.4, filterFreq: 8000, gain: 0.3 }); };
SFX.wardenStep = (ctx, out, opts) => SFX_thud(ctx, out, { freq: 55, dur: 0.15, gain: 0.5 });

// --- Bosses ---
AUDIO_regMob('dragonIdle',   'ender_dragon','idle'); AUDIO_regMob('dragonHurt',  'ender_dragon','hurt'); AUDIO_regMob('dragonDeath','ender_dragon','death');
AUDIO_regMob('witherIdle',   'wither',      'idle'); AUDIO_regMob('witherHurt',  'wither',     'hurt'); AUDIO_regMob('witherDeath','wither',     'death');

SFX.dragonBreath = (ctx, out, opts) => { SFX_hiss(ctx, out, { dur: 0.6, filterFreq: 1500, gain: 0.4 }); SFX_tone(ctx, out, { freq: 120, type: 'sawtooth', dur: 0.5, gain: 0.35 }); };
SFX.dragonCharge = (ctx, out, opts) => { SFX_growl(ctx, out, { freq: 90, dur: 1.0, gain: 0.5, sweep: 50 }); };
SFX.dragonFlap = (ctx, out, opts) => SFX_noise(ctx, out, { dur: 0.3, filterFreq: 600, filterQ: 2, gain: 0.35 });
SFX.dragonGrowl = (ctx, out, opts) => SFX_roar(ctx, out, { freq: 85, dur: 1.2, gain: 0.6 });
SFX.witherBreak = (ctx, out, opts) => { SFX_boom(ctx, out, { freq: 70, dur: 0.6, gain: 0.55 }); };
SFX.witherShoot = (ctx, out, opts) => { SFX_hiss(ctx, out, { dur: 0.2, filterFreq: 5000, gain: 0.3 }); SFX_boom(ctx, out, { freq: 120, dur: 0.25, gain: 0.4 }); };
SFX.witherSpawn = (ctx, out, opts) => { SFX_roar(ctx, out, { freq: 80, dur: 2.0, gain: 0.65 }); SFX_noise(ctx, out, { dur: 1.5, filterFreq: 400, gain: 0.5 }); };

// stepHard / stepSoft (used as step sounds across many mobs)
SFX.stepHard = (ctx, out, opts) => SFX_thud(ctx, out, { freq: 90, dur: 0.07, gain: 0.35 });
SFX.stepSoft = (ctx, out, opts) => SFX_thud(ctx, out, { freq: 60, dur: 0.06, gain: 0.2 });

// zoglinDeath / zoglinHurt not in sound names but zoglinIdle is:
AUDIO_regMob('zoglinIdle',     'zoglin',   'idle');

// --- Remaining from index (pillager/vindicator specials already done) ---
// catPurr was done; wolf howl was done; all mob sounds accounted for.

// ---------------------------------------------------------------------------
// BLOCK & UI SOUNDS
// ---------------------------------------------------------------------------

// Block dig/step/place variants
function AUDIO_blockSet(name, thudFreq, noiseFreq, noiseQ, dur = 0.12) {
  SFX[`${name}Dig`]   = (ctx, out, opts) => { SFX_thud(ctx, out, { freq: thudFreq, dur, gain: 0.4 }); SFX_noise(ctx, out, { dur: dur * 0.8, filterFreq: noiseFreq, filterQ: noiseQ, gain: 0.25 }); };
  SFX[`${name}Step`]  = (ctx, out, opts) => SFX_thud(ctx, out, { freq: thudFreq * 0.8, dur: dur * 0.6, gain: 0.2 });
  SFX[`${name}Place`] = (ctx, out, opts) => { SFX_thud(ctx, out, { freq: thudFreq, dur: dur * 0.8, gain: 0.35 }); SFX_noise(ctx, out, { dur: 0.06, filterFreq: noiseFreq, filterQ: noiseQ, gain: 0.18 }); };
}

AUDIO_blockSet('stone',  80,  400,  1.5, 0.14);
AUDIO_blockSet('wood',   70,  800,  2,   0.12);
AUDIO_blockSet('gravel', 65,  600,  1.2, 0.13);
AUDIO_blockSet('sand',   55,  500,  0.8, 0.11);
AUDIO_blockSet('grass',  60,  700,  1.5, 0.10);
AUDIO_blockSet('wool',   50,  900,  2.5, 0.10);
AUDIO_blockSet('snow',   45,  500,  1.0, 0.09);
SFX.glassDig   = (ctx, out, opts) => { SFX_clang(ctx, out, { freq: 1200, dur: 0.15, gain: 0.3 }); SFX_noise(ctx, out, { dur: 0.12, filterFreq: 6000, filterQ: 0.5, gain: 0.2 }); };
SFX.glassStep  = (ctx, out, opts) => SFX_tone(ctx, out, { freq: 900, type: 'sine', dur: 0.06, gain: 0.15 });
SFX.glassPlace = (ctx, out, opts) => SFX_clang(ctx, out, { freq: 1000, dur: 0.2, gain: 0.3 });
SFX.metalDig   = (ctx, out, opts) => SFX_clang(ctx, out, { freq: 700,  dur: 0.2,  gain: 0.4 });
SFX.metalStep  = (ctx, out, opts) => SFX_clang(ctx, out, { freq: 500,  dur: 0.08, gain: 0.2 });
SFX.metalPlace = (ctx, out, opts) => SFX_clang(ctx, out, { freq: 650,  dur: 0.25, gain: 0.38 });

// UI & environment sounds
SFX.itemPickup   = (ctx, out, opts) => SFX_chirp(ctx, out, { freq: 1200, dur: 0.08, gain: 0.28 });
SFX.itemDrop     = (ctx, out, opts) => SFX_thud(ctx, out, { freq: 80, dur: 0.06, gain: 0.22 });
SFX.click        = (ctx, out, opts) => SFX_tone(ctx, out, { freq: 1800, type: 'square', dur: 0.04, gain: 0.2, attack: 0.001, decay: 0.03 });
SFX.craft        = (ctx, out, opts) => { SFX_chirp(ctx, out, { freq: 900, dur: 0.1, gain: 0.22 }); SFX_chirp(ctx, out, { freq: 1100, dur: 0.08, gain: 0.18 }); };
SFX.smelt        = (ctx, out, opts) => SFX_noise(ctx, out, { dur: 0.3, filterFreq: 1500, filterQ: 1, gain: 0.2 });
SFX.eat          = (ctx, out, opts) => SFX_squelch(ctx, out, { freq: 350, dur: 0.15, gain: 0.28 });
SFX.drink        = (ctx, out, opts) => SFX_noise(ctx, out, { dur: 0.2, filterFreq: 800, filterQ: 2, gain: 0.22 });
SFX.burp         = (ctx, out, opts) => SFX_squelch(ctx, out, { freq: 150, dur: 0.3, gain: 0.35 });
SFX.explode      = SFX.explode || ((ctx, out, opts) => SFX_boom(ctx, out, { freq: 55, dur: 0.8, gain: 0.7 }));
SFX.tntFuse      = (ctx, out, opts) => SFX_hiss(ctx, out, { dur: 0.4, filterFreq: 5000, gain: 0.22 });
SFX.fizz         = (ctx, out, opts) => SFX_hiss(ctx, out, { dur: 0.3, filterFreq: 8000, gain: 0.18 });
SFX.splash       = (ctx, out, opts) => { SFX_noise(ctx, out, { dur: 0.25, filterFreq: 2000, filterQ: 0.8, gain: 0.35 }); SFX_thud(ctx, out, { freq: 70, dur: 0.15, gain: 0.3 }); };
SFX.swim         = (ctx, out, opts) => SFX_noise(ctx, out, { dur: 0.12, filterFreq: 1000, filterQ: 1, gain: 0.18 });
SFX.bubble       = (ctx, out, opts) => SFX_tone(ctx, out, { freq: 400, type: 'sine', dur: 0.1, gain: 0.15, sweep: 200 });
SFX.portalAmbient= (ctx, out, opts) => { SFX_hiss(ctx, out, { dur: 1.5, filterFreq: 600, gain: 0.15 }); SFX_tone(ctx, out, { freq: 180, type: 'sine', dur: 1.5, gain: 0.12, vibrato: 20, vibRate: 3 }); };
SFX.portalTravel = (ctx, out, opts) => { SFX_boom(ctx, out, { freq: 120, dur: 0.5, gain: 0.45 }); SFX_hiss(ctx, out, { dur: 0.4, filterFreq: 8000, gain: 0.3 }); };
SFX.levelUp      = (ctx, out, opts) => { SFX_chirp(ctx, out, { freq: 600, dur: 0.15, gain: 0.3 }); SFX_chirp(ctx, out, { freq: 800, dur: 0.12, gain: 0.3 }); SFX_chirp(ctx, out, { freq: 1000, dur: 0.1, gain: 0.3 }); };
SFX.xpOrb       = (ctx, out, opts) => SFX_chirp(ctx, out, { freq: 1400, dur: 0.07, gain: 0.2 });
SFX.anvilUse     = (ctx, out, opts) => SFX_clang(ctx, out, { freq: 500, dur: 0.4, gain: 0.45 });
SFX.doorOpen     = (ctx, out, opts) => { SFX_tone(ctx, out, { freq: 350, type: 'square', dur: 0.2, gain: 0.25, sweep: 50 }); SFX_noise(ctx, out, { dur: 0.15, filterFreq: 1000, filterQ: 1, gain: 0.15 }); };
SFX.doorClose    = (ctx, out, opts) => { SFX_tone(ctx, out, { freq: 300, type: 'square', dur: 0.18, gain: 0.25, sweep: -50 }); SFX_noise(ctx, out, { dur: 0.12, filterFreq: 800, filterQ: 1, gain: 0.12 }); };
SFX.chestOpen    = (ctx, out, opts) => SFX_tone(ctx, out, { freq: 250, type: 'sawtooth', dur: 0.3, gain: 0.3, sweep: 80, attack: 0.02 });
SFX.chestClose   = (ctx, out, opts) => SFX_tone(ctx, out, { freq: 320, type: 'sawtooth', dur: 0.3, gain: 0.28, sweep: -80, attack: 0.01 });
SFX.bowShoot     = (ctx, out, opts) => { SFX_noise(ctx, out, { dur: 0.1, filterFreq: 3000, filterQ: 1, gain: 0.3 }); SFX_tone(ctx, out, { freq: 200, type: 'sine', dur: 0.15, gain: 0.2, sweep: -100 }); };
SFX.arrowHit     = (ctx, out, opts) => { SFX_thud(ctx, out, { freq: 80, dur: 0.08, gain: 0.3 }); SFX_noise(ctx, out, { dur: 0.06, filterFreq: 2000, gain: 0.15 }); };
SFX.critHit      = (ctx, out, opts) => { SFX_clang(ctx, out, { freq: 1100, dur: 0.15, gain: 0.35 }); SFX_chirp(ctx, out, { freq: 1500, dur: 0.08, gain: 0.2 }); };
SFX.shieldBlock  = (ctx, out, opts) => { SFX_clang(ctx, out, { freq: 450, dur: 0.2, gain: 0.4 }); SFX_thud(ctx, out, { freq: 70, dur: 0.1, gain: 0.3 }); };
SFX.fallDamage   = (ctx, out, opts) => { SFX_thud(ctx, out, { freq: 65, dur: 0.2, gain: 0.5 }); SFX_noise(ctx, out, { dur: 0.1, filterFreq: 300, gain: 0.3 }); };
SFX.drown        = (ctx, out, opts) => SFX_noise(ctx, out, { dur: 0.4, filterFreq: 500, filterQ: 3, gain: 0.3 });
SFX.fireCrackle  = (ctx, out, opts) => SFX_noise(ctx, out, { dur: 0.4, filterFreq: 2000, filterQ: 0.5, gain: 0.2, sweep: 500 });
SFX.lavaPop      = (ctx, out, opts) => { SFX_tone(ctx, out, { freq: 180, type: 'sine', dur: 0.12, gain: 0.3, sweep: 80 }); SFX_noise(ctx, out, { dur: 0.08, filterFreq: 1200, gain: 0.2 }); };
SFX.rain         = (ctx, out, opts) => SFX_noise(ctx, out, { dur: 1.0, filterFreq: 5000, filterQ: 0.3, gain: 0.12, filterType: 'highpass' });
SFX.thunder      = (ctx, out, opts) => { SFX_boom(ctx, out, { freq: 50, dur: 1.5, gain: 0.7 }); SFX_noise(ctx, out, { dur: 1.2, filterFreq: 200, gain: 0.5 }); };
SFX.windAmbient  = (ctx, out, opts) => SFX_noise(ctx, out, { dur: 2.0, filterFreq: 3000, filterQ: 0.2, gain: 0.08, filterType: 'bandpass' });
SFX.bell         = (ctx, out, opts) => { SFX_tone(ctx, out, { freq: 880, type: 'sine', dur: 0.8, gain: 0.4, attack: 0.001 }); SFX_tone(ctx, out, { freq: 1320, type: 'sine', dur: 0.5, gain: 0.2, attack: 0.001 }); };
SFX.note         = (ctx, out, opts) => { const f = opts && opts.freq ? opts.freq : 440; SFX_tone(ctx, out, { freq: f, type: 'sine', dur: 0.5, gain: 0.3, attack: 0.001 }); };
SFX.breakBlock   = (ctx, out, opts) => { SFX_thud(ctx, out, { freq: 75, dur: 0.1, gain: 0.4 }); SFX_noise(ctx, out, { dur: 0.08, filterFreq: 600, gain: 0.25 }); };

// ---------------------------------------------------------------------------
// MUSIC GENERATOR
// ---------------------------------------------------------------------------
const AUDIO_PENTATONIC = [261.63, 293.66, 329.63, 392.00, 440.00, 523.25, 587.33];
let AUDIO_musicTimeout = null;
let AUDIO_musicCtx = null;
let AUDIO_musicOut = null;
let AUDIO_musicRng = makeRng(0xdeadbeef);
let AUDIO_musicRunning = false;

function SFX_musicNote(ctx, out, rng) {
  const freq = AUDIO_PENTATONIC[rng.int(AUDIO_PENTATONIC.length)] * (rng.chance(0.5) ? 1 : 0.5);
  const dur = rng.float(0.6, 2.0);
  const g = ctx.createGain();
  const now = ctx.currentTime;
  g.gain.setValueAtTime(0, now);
  g.gain.linearRampToValueAtTime(rng.float(0.04, 0.1), now + 0.02);
  g.gain.linearRampToValueAtTime(0, now + dur);
  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(freq, now);
  osc.connect(g);
  g.connect(out);
  osc.start(now);
  osc.stop(now + dur + 0.05);
}

function SFX_musicLoop() {
  if (!AUDIO_musicRunning || !AUDIO_musicCtx) return;
  SFX_musicNote(AUDIO_musicCtx, AUDIO_musicOut, AUDIO_musicRng);
  const delay = AUDIO_musicRng.float(1.5, 6.0) * 1000;
  AUDIO_musicTimeout = setTimeout(SFX_musicLoop, delay);
}

// ---------------------------------------------------------------------------
// AudioEngine class
// ---------------------------------------------------------------------------
export class AudioEngine {
  constructor() {
    this._ctx = null;
    this._master = null;
    this._masterGain = 1;
    this._inited = false;
  }

  init() {
    if (this._inited) return;
    if (typeof window === 'undefined') return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this._ctx = new AC();
    this._master = this._ctx.createGain();
    this._master.gain.setValueAtTime(this._masterGain, this._ctx.currentTime);
    this._master.connect(this._ctx.destination);
    this._inited = true;
  }

  _ensureInit() {
    if (!this._inited) this.init();
  }

  play(name, opts) {
    this._ensureInit();
    if (!this._ctx) return;
    const fn = SFX[name];
    if (!fn) return;
    try { fn(this._ctx, this._master, opts || {}); } catch (e) { /* ignore */ }
  }

  playAt(name, x, y, z, listenerPos, opts) {
    this._ensureInit();
    if (!this._ctx) return;
    const lx = listenerPos[0], ly = listenerPos[1], lz = listenerPos[2];
    const dx = x - lx, dy = y - ly, dz = z - lz;
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
    if (dist > 32) return;
    const vol = clamp01(1 - dist / 32);
    const pan = clamp(dx / 16, -1, 1);
    const panner = this._ctx.createStereoPanner ? this._ctx.createStereoPanner() : null;
    const gainNode = this._ctx.createGain();
    gainNode.gain.setValueAtTime(vol, this._ctx.currentTime);
    if (panner) {
      panner.pan.setValueAtTime(pan, this._ctx.currentTime);
      gainNode.connect(panner);
      panner.connect(this._master);
    } else {
      gainNode.connect(this._master);
    }
    const fn = SFX[name];
    if (fn) try { fn(this._ctx, gainNode, opts || {}); } catch (e) { /* ignore */ }
  }

  setMasterVolume(v) {
    this._masterGain = clamp01(v);
    if (this._master) this._master.gain.setValueAtTime(this._masterGain, this._ctx.currentTime);
  }

  startMusic() {
    this._ensureInit();
    if (AUDIO_musicRunning) return;
    AUDIO_musicRunning = true;
    AUDIO_musicCtx = this._ctx;
    AUDIO_musicOut = this._master;
    SFX_musicLoop();
  }

  stopMusic() {
    AUDIO_musicRunning = false;
    if (AUDIO_musicTimeout) { clearTimeout(AUDIO_musicTimeout); AUDIO_musicTimeout = null; }
  }

  tick(dt) {
    // resume suspended context (needed after user gesture)
    if (this._ctx && this._ctx.state === 'suspended') {
      this._ctx.resume().catch(() => {});
    }
  }
}

// ---------------------------------------------------------------------------
// Verify at module load that all MOB_SOUND_NAMES are covered
// ---------------------------------------------------------------------------
(function AUDIO_verify() {
  const missing = [];
  for (const name of MOB_SOUND_NAMES) {
    if (!SFX[name]) missing.push(name);
  }
  if (missing.length > 0) {
    console.warn('[SFX] Missing sound implementations:', missing);
  }
}());
