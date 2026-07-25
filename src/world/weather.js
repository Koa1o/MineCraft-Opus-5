// ---------------------------------------------------------------------------
// Weather system — rain, thunder, lightning, snow, puddle hooks.
// All top-level names prefixed WEATHER_ for concatenation safety.
// ---------------------------------------------------------------------------

import { makeRng, hash3i } from '../core/rng.js';
import { clamp, clamp01 } from '../core/util.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const WEATHER_CLEAR    = 0;
const WEATHER_RAIN     = 1;
const WEATHER_THUNDER  = 2;

const WEATHER_RAIN_MIN  = 12000;
const WEATHER_RAIN_MAX  = 24000;
const WEATHER_CLEAR_MIN = 12000;
const WEATHER_CLEAR_MAX = 180000;
const WEATHER_THUNDER_CHANCE = 0.35; // probability that rain becomes thunder

// Biome categories that suppress precipitation
const WEATHER_DRY_BIOMES     = new Set(['desert', 'badlands', 'nether', 'end']);
const WEATHER_COLD_BIOMES     = new Set(['snowy_taiga', 'mountains']); // snow instead of rain

// How often lightning can try to strike during thunder (ticks between attempts)
const WEATHER_LIGHTNING_INTERVAL = 200;

// ---------------------------------------------------------------------------
// WeatherSystem
// ---------------------------------------------------------------------------
export class WeatherSystem {
  constructor(world, particles, audio) {
    this._world      = world;
    this._particles  = particles;
    this._audio      = audio;

    this._state      = WEATHER_CLEAR;
    this._ticksLeft  = 0;
    this._rng        = makeRng(world ? (world.seed || 0x1a2b3c4d) : 0x1a2b3c4d);
    this._lightningTimer = 0;

    /** 0..1: how much the sky is darkened by rain. */
    this.skyDarken    = 0;
    this._skyDarkenTarget = 0;

    /** 0..1: flash intensity from lightning. Fades each tick. */
    this.flashIntensity = 0;

    this._rainColumn  = { x: 0, z: 0, radius: 48 };

    // Schedule the first weather cycle from world seed + day
    this._scheduleNext();
  }

  // ---- Public API ----------------------------------------------------------

  get isRaining()    { return this._state === WEATHER_RAIN || this._state === WEATHER_THUNDER; }
  get isThundering() { return this._state === WEATHER_THUNDER; }

  setWeather(kind, ticks) {
    if (kind === 'clear')   this._state = WEATHER_CLEAR;
    else if (kind === 'rain')    this._state = WEATHER_RAIN;
    else if (kind === 'thunder') this._state = WEATHER_THUNDER;
    this._ticksLeft = ticks || 6000;
    this._applySkyDarken();
  }

  /** Returns true if a block at (x,y,z) is wet (in rain, no overhead cover). */
  isWet(x, y, z) {
    if (!this.isRaining) return false;
    const world = this._world;
    if (!world) return false;
    const biome = world.biomeAt ? world.biomeAt(x, z) : null;
    if (biome && WEATHER_DRY_BIOMES.has(biome.id)) return false;
    const top = world.heightAt ? world.heightAt(x, z) : 128;
    return y >= top;
  }

  tick() {
    const world = this._world;

    // Advance weather timer
    this._ticksLeft--;
    if (this._ticksLeft <= 0) {
      this._advanceState();
      this._scheduleNext();
    }

    // Smoothly transition skyDarken
    const diff = this._skyDarkenTarget - this.skyDarken;
    this.skyDarken = clamp01(this.skyDarken + diff * 0.05);

    // Fade flash
    this.flashIntensity = clamp01(this.flashIntensity - 0.08);

    // Rain/snow particles around the camera
    if (this.isRaining && this._particles && world) {
      const player = world.playerPos || { x: 0, y: 64, z: 0 };
      this._spawnPrecipitation(player);
    }

    // Lightning during thunder
    if (this._state === WEATHER_THUNDER) {
      this._lightningTimer--;
      if (this._lightningTimer <= 0) {
        this._lightningTimer = WEATHER_LIGHTNING_INTERVAL + this._rng.int(300);
        if (world) this._tryLightning();
      }
    }
  }

  render(camera) {
    // Nothing GPU-specific here; skyDarken and flashIntensity are read by renderer.
  }

  // ---- Private helpers -----------------------------------------------------

  _scheduleNext() {
    const r = this._rng;
    if (this._state === WEATHER_CLEAR) {
      this._ticksLeft = r.range(WEATHER_RAIN_MIN, WEATHER_RAIN_MAX);
    } else {
      this._ticksLeft = r.range(WEATHER_CLEAR_MIN, WEATHER_CLEAR_MAX);
    }
  }

  _advanceState() {
    if (this._state === WEATHER_CLEAR) {
      this._state = this._rng.chance(WEATHER_THUNDER_CHANCE) ? WEATHER_THUNDER : WEATHER_RAIN;
      this._lightningTimer = WEATHER_LIGHTNING_INTERVAL;
    } else {
      this._state = WEATHER_CLEAR;
    }
    this._applySkyDarken();
  }

  _applySkyDarken() {
    this._skyDarkenTarget = this.isRaining ? 0.35 : 0;
  }

  _spawnPrecipitation(player) {
    const world = this._world;
    const biome = world.biomeAt ? world.biomeAt(player.x, player.z) : null;
    if (biome && WEATHER_DRY_BIOMES.has(biome.id)) return;

    const isSnow = biome && (biome.snow || WEATHER_COLD_BIOMES.has(biome.id));
    const kind = isSnow ? 'snow' : 'rain';
    const R = this._rainColumn.radius;

    // Spawn a handful of precipitation particles each tick
    const count = 8;
    for (let i = 0; i < count; i++) {
      const px = player.x + (Math.random() - 0.5) * R;
      const pz = player.z + (Math.random() - 0.5) * R;
      const height = world.heightAt ? world.heightAt(Math.floor(px), Math.floor(pz)) : 64;
      // Only spawn if open sky (no block directly above spawn point)
      const topBlock = world.getBlock ? world.getBlock(Math.floor(px), height, Math.floor(pz)) : 0;
      if (topBlock && topBlock !== 0 && topBlock !== 'air') continue;

      this._particles.spawn(kind, px, height + 6, pz, 1, {
        gravity: kind === 'rain' ? 0.18 : 0.03,
        life: kind === 'rain' ? 0.3 : 0.8,
        color: kind === 'rain' ? [0.5, 0.7, 1.0, 0.55] : [1, 1, 1, 0.75],
      });
    }
  }

  _tryLightning() {
    const world = this._world;
    const player = world.playerPos || { x: 0, y: 64, z: 0 };
    const r = this._rng;

    // Pick a random position near the player (within 48-128 blocks)
    const angle = r.next() * Math.PI * 2;
    const dist  = r.float(48, 128);
    const sx = Math.floor(player.x + Math.cos(angle) * dist);
    const sz = Math.floor(player.z + Math.sin(angle) * dist);

    // Must have open sky
    const surfaceY = world.heightAt ? world.heightAt(sx, sz) : 64;
    const blockAbove = world.getBlock ? world.getBlock(sx, surfaceY + 1, sz) : 'air';
    if (blockAbove && blockAbove !== 'air' && blockAbove !== 0) return;

    // Check it's not in a dry biome
    const biome = world.biomeAt ? world.biomeAt(sx, sz) : null;
    if (biome && WEATHER_DRY_BIOMES.has(biome.id)) return;

    this._strikeLightning(sx, surfaceY, sz);
  }

  _strikeLightning(x, y, z) {
    const world = this._world;

    // Visual flash
    this.flashIntensity = 1.0;

    // Place fire at strike point
    if (world.setBlock) {
      world.setBlock(x, y + 1, z, 'fire', { noUpdate: false });
    }

    // Play thunder sound with delay proportional to notional distance
    if (this._audio) {
      const player = world.playerPos || { x: 0, y: 64, z: 0 };
      const dx = x - player.x, dz = z - player.z;
      const distBlocks = Math.sqrt(dx * dx + dz * dz);
      const delayMs = (distBlocks / 343) * 1000; // speed of sound approximation
      setTimeout(() => {
        if (this._audio.play) this._audio.play('thunder', {});
      }, Math.max(0, delayMs));
    }

    // Damage entities within 3 blocks + charge creepers
    if (world.spawnEntity || world._entities) {
      const entities = world._entities || [];
      for (const entity of entities) {
        const ex = entity.x || 0, ey = entity.y || 0, ez = entity.z || 0;
        const dx = ex - x, dy = ey - y, dz = ez - z;
        const d2 = dx * dx + dy * dy + dz * dz;
        if (d2 <= 9) { // 3 blocks radius
          if (entity.damage) entity.damage(5, 'lightning');
          else if (entity.health != null) entity.health = Math.max(0, entity.health - 5);

          // Charge nearby creeper
          if (entity.id === 'creeper' || entity.id === 'charged_creeper') {
            entity.charged = true;
            entity.skin = entity.skin ? entity.skin + '_charged' : 'charged_creeper';
          }
        }
      }
    }

    // Spawn lightning particles
    if (this._particles) {
      this._particles.spawn('explosion', x + 0.5, y + 1, z + 0.5, 12, {
        color: [0.9, 0.9, 1.0, 1.0],
        speed: 0.25,
        life: 0.4,
      });
    }
  }
}
