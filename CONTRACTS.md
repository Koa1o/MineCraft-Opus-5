# INTERNAL BUILD CONTRACTS

Authoritative interface spec. Every module must match this exactly — the verifier
(`node tools/verify.mjs`) asserts most of it mechanically.

## Absolute rules

1. **No build step.** Native ES modules only. `import` paths are relative with
   explicit `.js`. Only bare specifier allowed is `three`.
2. **Concatenation-safe.** `dist/game.html` is produced by stripping
   `import`/`export` keywords and concatenating all modules in dependency order.
   Therefore:
   - Every top-level `const`/`let`/`function`/`class` name must be **globally
     unique across the whole project**. Prefix generic names with the module
     topic (`MOB_SKIN_W`, not `W`).
   - No top-level side effects that depend on another module's top-level code
     having run, other than through explicit `import`.
   - Never re-export a name another module also defines.
   - No `export default`.
3. **No stubs.** No `// TODO`, no `...`, no "similarly for the rest". Every
   listed entity/recipe/tile is fully written.
4. **No external assets.** No URLs, no base64 images, no audio files.
5. Do **not** use `document`, `window` or `canvas` inside texture painters —
   only the `Px` API. Painters run under Node in the verifier.
6. Prefer `const`; no `var`. Use 2-space indent. No semicolon-less lines.

## Coordinate / face conventions

- Face order everywhere: `0=+X 1=-X 2=+Y(top) 3=-Y(bottom) 4=+Z 5=-Z`.
- Yaw 0 faces `+Z`; yaw increases toward `-X`. Facing index `0=+Z 1=-X 2=-Z 3=+X`.
- Block coords are integers; entity positions are floats with **feet at y**.
- Chunk = 16 x 128 x 16, `CHUNK_W=16 CHUNK_H=128`.

## `Px` — texture painting API (`src/textures/px.js`)

A `Tile` is `{w, h, data: Uint8ClampedArray /* RGBA */}`.

```js
import { Px } from '../px.js';        // from src/textures/blocks/*.js
const t = Px.makeTile(16, 16);
```

Colour: `color(c)` accepts `'#rrggbb'`, `'#rrggbbaa'`, `[r,g,b]`, `[r,g,b,a]`, `0xrrggbb`.
`shade(c,f)` `offset(c,d)` `mix(a,b,t)` `grey(c)` `saturate(c,f)` `hueShift(c,deg)`
`ramp(base, steps=5, lo=.62, hi=1.28) -> [dark..light]`

Draw: `setPx(t,x,y,c,alpha=1)` `getPx` `getPxWrap` `clear` `fill` `rect` `rectOutline`
`hLine` `vLine` `line` `circle` `circleOutline` `ellipse` `polygon(t,[[x,y],..],c)`

Noise: `valueNoise(x,y,freq,seed,period)` `fbm(x,y,freq,octaves,seed,period)`
`white(x,y,seed)` `worley(x,y,cell,seed,period)` — pass `period = t.w` for seamless.

Material primitives (**use these — never flat fill**):
`noiseFill(t,pal,{freq,octaves,seed,contrast,bias,period})`
`speckle(t,pal,{density,seed,size,alpha,region})`
`dither(t,c1,c2,coverageFn)` `streaks(t,pal,{vertical,density,seed,minLen,maxLen})`
`stoneChunks(t,pal,{cell,seed,seam})` `bricks(t,pal,mortar,{bw,bh,seed})`
`woodRings(t,pal,{seed,ringW,wobble})` `bark(t,pal,{seed})`
`oreBlobs(t,oreRamp,{seed,count,minR,maxR,rim,sparkle})` `grain(t,pal,{seed,density})`
`radialGlow(t,cx,cy,r,inner,outer,{power,alpha})`
`bevel(t,amt)` `edgeShade(t,amt,width)` `cutout(t,maskFn)` `blit(dst,src,ox,oy,alpha)`
`multiply(t,c)` `toGrey(t,{lift})` `scroll(t,dx,dy)` `mirrorH(t)`
`softenNoise(t,amount)` `innerFrame(t,cTop,cBottom,alpha)` `specStreak(t,c,opts)`

## Block tile painters

File layout, one export per file:

```
src/textures/blocks/terrain.js   -> registerTerrainTiles(A, C)
src/textures/blocks/stone.js     -> registerStoneTiles(A, C)
src/textures/blocks/ores.js      -> registerOreTiles(A, C)
src/textures/blocks/wood.js      -> registerWoodTiles(A, C)
src/textures/blocks/plants.js    -> registerPlantTiles(A, C)
src/textures/blocks/fluids.js    -> registerFluidTiles(A, C)
src/textures/blocks/nether.js    -> registerNetherTiles(A, C)
src/textures/blocks/misc.js      -> registerMiscTiles(A, C)
```

- `A` is an `AtlasBuilder`: `A.add(name, tile, {wrap})`,
  `A.addAnimated(name, framesArray, speedBucket, {wrap})`.
- `C` is `{ rng, seedFor(name) }`; call `const r = C.seedFor('stone')` to get a
  stable integer seed for that tile. Never use `Math.random()`.
- Pass `{wrap:false}` when the tile spec in `src/textures/tiles.js` has `g:true`.
- Tiles with `t:1|2|3` in the spec **must be painted greyscale** (use
  `Px.toGrey(t,{lift:1.05})` at the end, or paint in greys directly) because a
  biome colour is multiplied over them at runtime. Aim luma 110–210 so tinting
  lands mid-bright.
- Tiles with `c:true` must have real alpha-0 pixels.
- Tiles with `a:N` must be registered with `A.addAnimated` and exactly `N` frames.
- **Every** name in `TILE_SPECS` (src/textures/tiles.js) must be registered
  exactly once across these 8 files; the verifier fails otherwise.
- Quality bar per tile: 3–5 shade palette, per-pixel noise, visible structure.
  A reviewer must be able to name the material from a 16x16 crop.

## Item icons

`src/textures/items.js` -> `registerItemTiles(A, C)` registering `item:<id>` tiles
for every item in `ITEM_DEFS` that has `icon: 'painted'`. 16x16, alpha bg,
1px dark outline, top-left light source. Tools show handle + head; food is
recognisable; ingots/gems have facet highlights.

## Mob skins

`src/textures/mobSkins.js` -> `MOB_SKIN_PAINTERS = { pig(Px, r, variant) {...}, ... }`

Each painter returns a `Tile` of size `MOB_SKIN_W x MOB_SKIN_H` = **64 x 64**,
which is the unwrapped box-UV sheet. Layout helper `mobSkinRegion(part, face)`
in `src/entities/model.js` maps part+face to a rect in that sheet; painters use
`MOB_UV[partName]` (exported from model.js) to know where to paint. Include eyes,
mouth, nostrils/beak, clothing or fur/scale patterning. `variant` is an integer
selecting a colour variant (sheep 0-15, cat 0-10, horse 0-6, tropical fish 0-21,
etc.); painters must honour it.

## Entity model rig

`src/entities/model.js`

```js
// A part: box in *model pixel* units (16 px = 1 block), pivot at joint.
part(name, {size:[w,h,d], pivot:[x,y,z], offset:[x,y,z], uv:[u,v], mirror?:bool})
// A model: ordered part list + rig metadata.
defineModel(name, { parts:[...], scale:1, eyeHeight, shadowRadius, rig:'quadruped'|'biped'|'bird'|'fish'|'spider'|'blob'|'custom' })
```

Rig names drive the shared animator in `src/entities/animator.js`:
`quadruped` (4 legs alternate), `biped` (arms counterswing), `bird` (wing flap),
`fish` (tail yaw wave), `spider` (8 legs, 2 phase groups), `blob` (squash),
`custom` (mob supplies `animate(entity, parts, dt)`).

## Mob definitions

`src/entities/mobs/<group>.js` exports `MOB_DEFS_<GROUP>` — an array of objects:

```js
{
  id: 'pig',
  category: 'passive'|'neutral'|'hostile'|'boss',
  model: 'pig',                 // key in MODELS
  skin: 'pig',                  // key in MOB_SKIN_PAINTERS
  variants: 1,                  // number of skin variants
  health: 10, armor: 0,
  width: 0.9, height: 0.9,      // AABB
  speed: 0.25,                  // blocks/tick target
  attack: { damage: 0, range: 0, cooldown: 20 } | null,
  followRange: 16, xp: [1,3],
  drops: [{ item:'porkchop', min:1, max:3, cookedItem:'cooked_porkchop' }],
  spawn: {
    dimension:'overworld'|'nether'|'end',
    biomes:['plains',...] | 'any',
    light:'day'|'night'|'dark'|'any',
    where:'surface'|'cave'|'water'|'lava'|'air',
    weight: 10, group:[2,4], maxPerChunk: 4, cap: 'passive'|'hostile'|'water'|'ambient',
  } | null,                     // null = never naturally spawns
  ai: ['wander','panic','followPlayerHolding:wheat','breed:wheat', ...],
  sounds: { idle:'pigIdle', hurt:'pigHurt', death:'pigDeath', step:'stepSoft' },
  tameable: {item:'bone', chance:0.33} | null,
  rideable: bool, breedItem: 'wheat'|null, babyScale: 0.5,
  fireImmune: bool, waterMob: bool, flying: bool, avoidsSun: bool,
  special: 'creeper'|'enderman'|... | null,   // hooks a behaviour in mobBehaviors.js
}
```

Groups & files:
- `passiveA.js` → pig cow mooshroom sheep chicken rabbit horse donkey mule llama
- `passiveB.js` → cat ocelot wolf parrot fox bee turtle goat sniffer camel armadillo bat allay
- `aquatic.js` → cod salmon tropical_fish pufferfish squid glow_squid axolotl frog tadpole dolphin
- `neutral.js` → iron_golem snow_golem panda polar_bear spider cave_spider enderman piglin zoglin strider villager wandering_trader
- `hostileA.js` → zombie husk drowned zombie_villager skeleton stray bogged wither_skeleton creeper charged_creeper slime magma_cube silverfish endermite
- `hostileB.js` → witch pillager vindicator evoker vex ravager illusioner guardian elder_guardian shulker blaze ghast hoglin piglin_brute phantom warden
- `bosses.js` → ender_dragon wither

## Sound synthesis

`src/audio/sfx.js` exports `SFX = { name(ctx, out, opts) {...} }`. Each builds
oscillators/noise through a gain envelope and connects to `out`. Names referenced
by mob defs and block sounds must exist.

## Items

`src/data/items.js` -> `ITEM_DEFS` array:
```js
{ id:'diamond_pickaxe', name:'Diamond Pickaxe', icon:'painted', stack:1,
  tool:{ kind:'pick', tier:5, speed:8, damage:5, durability:1561 } | null,
  food:{ hunger:6, saturation:7.2, eatTicks:32 } | null,
  armor:{ slot:'chest', defense:8, durability:528, tier:5 } | null,
  block:'diamond_block' | null,   // placeable
  fuelTicks:0, group:'tools', maxDamage:0, rarity:'common',
  action:'bucket_fill'|'spawn_egg'|'boat'|'flint_steel'|'shears'|'ender_eye'|null }
```
Every block that drops itself needs a matching item id (auto-generated for
blocks by `itemsFromBlocks()` — only add explicit entries for non-block items).

## World API used by entities / UI

```js
world.getBlock(x,y,z) -> id            world.setBlock(x,y,z,id, {noUpdate})
world.getLight(x,y,z) -> 0..15         world.getSkyLight / getBlockLight
world.isSolid(x,y,z) -> bool           world.biomeAt(x,z) -> BiomeDef
world.heightAt(x,z) -> int             world.raycast(origin, dir, maxDist)
world.spawnEntity(id, x,y,z, opts)     world.dropItem(x,y,z, itemId, count)
world.explode(x,y,z, power, {fire})    world.playSound(name, x,y,z, opts)
world.spawnParticles(kind, x,y,z, count, opts)
world.timeOfDay  world.dimension  world.tickCount  world.rand
```

## Never do these (they break the inlined build)

- `import ... from` inside a function
- dynamic `import()`
- `new Worker('file.js')` — only blob-URL workers
- top-level `await`
