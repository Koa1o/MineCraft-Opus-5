# Voxelcraft — Opus 5

A complete Minecraft-style voxel sandbox that runs in a browser with **no build step, no bundler, no npm install and no local server**. Every texture, mob skin, item icon and sound is generated procedurally in code — the repository contains no images, no models and no audio files.

The only network request the game makes is fetching three.js from a CDN on first load.

---

## Running it

**Option A — the single-file build (recommended, always works)**

Open **`dist/game.html`** in a browser. Double-clicking it from your file manager is enough.

This is a fully self-contained build: all 58 source modules are inlined into one `<script type="module">`. Nothing is loaded from disk except the file itself.

**Option B — the modular source**

Open **`index.html`**. This uses native ES modules plus an importmap and loads `src/**` directly, which is nicer for development because you can edit a file and just reload.

> Some browsers refuse to load ES modules over the `file://` protocol for security reasons. If `index.html` shows a startup error, use `dist/game.html` instead — that is exactly why it exists.

After the world finishes generating, click **Play** to lock the mouse. (Browsers only grant pointer lock and audio from a real click, so this step cannot be skipped.)

---

## Controls

| Input | Action |
| --- | --- |
| `W` `A` `S` `D` | Move |
| `Space` | Jump — double-tap to toggle flight in creative |
| `Shift` | Sneak (will not walk off a ledge) |
| `Ctrl` / double-tap `W` | Sprint |
| Mouse | Look |
| **Left click** (hold) | Mine — break progress depends on block hardness and tool tier |
| **Right click** | Place block / use item / open chest, furnace, crafting table / mount |
| **Middle click** | Pick block (creative) |
| `1`–`9`, mouse wheel | Select hotbar slot |
| `E` | Inventory (drag and drop, 2×2 crafting) |
| `Q` | Drop held item |
| `F` | Toggle survival / creative |
| `F3` | Debug overlay |
| `F5` | Cycle view mode |
| `Esc` | Pause / release mouse |

---

## What is implemented

**World**
- Chunked voxel terrain, 16×128×16 chunks, streamed on a strict per-frame budget so the frame never stalls
- Greedy-meshed geometry (maximal rectangle merging per face direction) — never one box per block
- Layered value/simplex noise: continent mask, erosion, ridged mountains, 3D cave systems, ore veins
- 12 biomes selected from temperature/humidity, each with its own block palette, trees, plants and mob spawn table
- Biome tinting via vertex colours over greyscale textures, so one grass tile works in plains, swamp and badlands
- Flood-fill block light and skylight with a day/night cycle, smooth per-vertex lighting and ambient occlusion; light is repropagated incrementally on a block change, never rebuilt from scratch
- Flowing water and lava with source/level propagation, lava→stone/obsidian interactions, falling sand and gravel
- TNT with a real sphere-raycast explosion that carves ragged craters and knocks back entities
- Three dimensions (Overworld, Nether, End) with working portals
- 299 block types
- Weather: rain, snow in cold biomes, thunderstorms with lightning that starts fires and charges creepers
- 16 structure generators: villages, desert and jungle temples, ruined portals, dungeons, mineshafts, strongholds with an end portal, nether fortresses, ocean monuments, woodland mansions, witch huts, bastions, end cities, plus small features
- Per-structure loot tables
- Save/load to localStorage — player state, inventory, time, dimension and modified chunks stored as deltas only

**Textures** (all procedural, seeded so output is identical every reload)
- 271 hand-painted 16×16 tiles packed into a 1024×1024 atlas
- Per-cell 8px replicated gutters **and** a per-cell mipmap chain, so a mip level can never blend two different blocks together — this is what eliminates atlas bleeding
- Every material has a 3–5 shade palette plus per-pixel noise and real structure: grass blades, dirt speckle, wood grain rings on log tops with bark strips on the sides, irregular stone chunks with dark mortar seams, sand grain, deepslate streaks, ore blobs with lit edges and dark rims, glowing lava and glowstone hot spots, translucent glass with a highlight frame, alpha-cutout leaves
- Animated water, lava, fire, portals and magma, generated as frame sequences that loop seamlessly
- A procedurally drawn 10-stage block-breaking crack overlay
- 79 mob skin painters covering 162 colour variants (16 sheep wool colours, 11 cat breeds, 22 tropical fish patterns, 7 horse coats, villager professions…), each with a real face, fur/scale texturing and shaded limbs
- Painted item and tool icons for the hotbar and inventory

**Creatures** — 77 mobs, each with a box model, a textured skin, a limb-animation rig, an AI state machine, spawn rules, drops and synthesised sounds
- Passive: pig, cow, mooshroom, sheep, chicken, rabbit, horse, donkey, mule, llama, cat, ocelot, wolf, parrot, fox, bee, turtle, goat, sniffer, camel, armadillo, bat, allay, strider, villager, wandering trader
- Aquatic: cod, salmon, tropical fish, pufferfish, squid, glow squid, axolotl, frog, tadpole, dolphin
- Neutral: iron golem, snow golem, panda, polar bear, spider, cave spider, enderman, piglin, zoglin
- Hostile: zombie, husk, drowned, zombie villager, skeleton, stray, bogged, wither skeleton, creeper, charged creeper, slime, magma cube, silverfish, endermite, witch, pillager, vindicator, evoker, vex, ravager, illusioner, guardian, elder guardian, shulker, blaze, ghast, hoglin, piglin brute, phantom, warden
- Bosses: Ender Dragon (crystal healing, perch/strafe/charge/breath phases) and the Wither (shield phase, skull projectiles, block destruction)
- Shared infrastructure: A* pathfinding on the voxel grid with jump/fall/swim costs and a per-tick node budget, line-of-sight target acquisition, 41 named behaviours plus 30 mob-specific ones, knockback, fire/drown/fall/void damage, despawn rules, mob caps and light-level spawn cycling
- Breeding with correct feed items, love-mode particles and baby models that grow

**Player**
- First-person controller with swept AABB collision against voxel shapes — no corner ghosting
- Step-up, crouch ledge protection, sprint, swim, ladder climbing, fall damage
- Survival and creative modes
- Health, hunger, saturation, exhaustion, oxygen, XP levels with the real level curve, item durability
- 9-slot hotbar, 4×9 inventory with full drag-and-drop click semantics, 2×2 and 3×3 crafting
- 250 recipes (shaped, shapeless and smelting), furnaces with fuel and smelt timing, 27-slot chests, villager trading
- Armour slots with tier-scaled damage reduction

**Other systems**
- Fixed 20 Hz physics/AI tick decoupled from rendering, with entity position interpolation between ticks
- Object-pooled particles: block break using the actual block texture, explosions, smoke, flames, splashes, portal, crit, hearts
- All sound synthesised with WebAudio — 286 effects plus a procedural ambient music generator
- F3 debug overlay: fps, position, chunk, biome, facing, light level, entity count, mesh count, triangles
- Settings menu: render distance, FOV, sensitivity, fog, AO, gamma, view bobbing, volume — applied live

---

## File map

```
index.html              modular entry point (ES modules + importmap)
dist/game.html          single-file self-contained build — open this one
CONTRACTS.md            internal interface spec every module is written against

src/
  main.js               Game class, boot sequence, main loop
  core/
    rng.js              seeded PRNGs and coordinate hashes
    util.js             math, AABB helpers, MinHeap, object pool
  textures/
    px.js               the pixel-art painting API all textures are built from
    atlas.js            atlas packer with gutters and per-cell mip chains
    tiles.js            tile manifest — the source of truth for the atlas
    buildAtlas.js       assembles the atlas, crack overlays and mob skins
    blocks/*.js         the 8 block-texture painter modules
    items.js            item and tool icon painters
    mobSkins.js         mob skin painters (+ mobSkins2.js)
  world/
    blocks.js           block registry and the flat typed-array flag tables
    blockDefs.js        all 299 block definitions
    shapes.js           collision/render shapes for non-cube blocks
    chunk.js            chunk storage, heightmap, delta serialisation
    mesher.js           greedy mesher with AO and smooth lighting
    lighting.js         incremental flood-fill sky and block light
    fluids.js           fluid simulation, gravity blocks, explosions
    noise.js            simplex/value noise and the noise router
    biomes.js           the 12 biomes and biome selection
    terrain.js          terrain generation
    decorate.js         trees, plants and small features
    structures.js       the 16 structure generators and loot tables
    weather.js          weather cycle and lightning
    world.js            the World class — binds everything together
    blockEntities.js    chests, furnaces, spawners, signs, beds
    randomTicks.js      crop growth, grass spread, leaf decay, fire spread
  entities/
    entity.js           Entity base, item drops, projectiles
    model.js            box-model rig and skin UV unwrapping
    models.js           69 mob models
    animator.js         per-rig limb animation
    pathfind.js         budgeted A* on the voxel grid
    ai.js               behaviour library, target selection, spawn manager
    mobs/*.js           the 77 mob definitions
  player/
    player.js           player physics, survival stats, mining, placing
    controls.js         input handling and block targeting
    inventory.js        stacks, inventories, crafting, furnace, trading
  render/
    shaders.js          terrain, entity, sky, particle and overlay GLSL
    chunkRenderer.js    chunk mesh management, frustum culling, sky dome
    entityRenderer.js   mob rendering with interpolation and pooling
    particles.js        pooled particle system
  ui/
    hud.js              HUD, inventory screens, debug overlay, menus
  audio/
    sfx.js              WebAudio synthesis for all 286 sounds

tools/                  offline dev tooling (never shipped to the browser)
  verify.mjs            import, naming and code-hygiene checks
  inline.mjs            generates dist/game.html
  png.mjs               dependency-free PNG encoder for texture inspection
  three-stub.mjs        three.js stub so modules can be tested under Node
```

---

## Development

`tools/` contains a small dependency-free harness used to validate the project without a browser.

```bash
node tools/verify.mjs        # import graph, duplicate top-level names, code hygiene
node tools/inline.mjs        # regenerate dist/game.html from src/
node tools/inline.mjs --check   # fail if dist/game.html is stale
```

Because `dist/game.html` is produced by concatenating modules into a single scope, **every top-level declaration in the project has a globally unique name**, and modules avoid `export default` and dynamic imports. `tools/verify.mjs` enforces this — run it after any change, and re-run `tools/inline.mjs` so the single-file build stays in sync with the source.

`tools/png.mjs` exists so textures can be rendered to a PNG and inspected directly, which is how the texture work was reviewed: the painters run under Node against the same `Px` API the browser uses.
