// ---------------------------------------------------------------------------
// Block collision / render shapes.
//
// Everything that is not a full cube, a cross-plant or a fluid is expressed as a
// list of axis-aligned boxes in 0..1 block space. Slabs, stairs, torches,
// fences, doors, ladders, cactus, chests, cakes and crops all reduce to this, so
// the mesher only needs one extra code path beyond the greedy cube path.
//
// Box: {x0,y0,z0,x1,y1,z1, faces?:{px,nx,py,ny,pz,nz}, inset?:bool, cullSame?:bool}
//   faces  - per-face tile-role override ('top'|'bottom'|'side'|'front'|...)
//   inset  - if true the box faces are never culled by neighbours (glass panes,
//            chest lids) because the box does not reach the block boundary
// ---------------------------------------------------------------------------

const P = 1 / 16; // one texture pixel in block units

export function box(x0, y0, z0, x1, y1, z1, faces) {
  return { x0, y0, z0, x1, y1, z1, faces: faces || null };
}

/** Full cube, used when a "boxes" block still wants a solid body. */
export const FULL_BOX = [box(0, 0, 0, 1, 1, 1)];

export function slabShape(top = false) {
  return top ? [box(0, 0.5, 0, 1, 1, 1)] : [box(0, 0, 0, 1, 0.5, 1)];
}

/**
 * Stairs facing `facing` (0=+Z south, 1=-X west, 2=-Z north, 3=+X east).
 * Bottom slab plus a half step on the back half.
 */
export function stairShape(facing = 0, top = false) {
  const base = top ? box(0, 0.5, 0, 1, 1, 1) : box(0, 0, 0, 1, 0.5, 1);
  const y0 = top ? 0 : 0.5, y1 = top ? 0.5 : 1;
  let step;
  switch (facing & 3) {
    case 0: step = box(0, y0, 0.5, 1, y1, 1); break;   // south
    case 1: step = box(0, y0, 0, 0.5, y1, 1); break;   // west
    case 2: step = box(0, y0, 0, 1, y1, 0.5); break;   // north
    default: step = box(0.5, y0, 0, 1, y1, 1); break;  // east
  }
  return [base, step];
}

export function fenceShape() {
  return [
    box(6 * P, 0, 6 * P, 10 * P, 1, 10 * P),          // post
    box(7 * P, 6 * P, 0, 9 * P, 9 * P, 1),            // z rail low
    box(7 * P, 12 * P, 0, 9 * P, 15 * P, 1),          // z rail high
    box(0, 6 * P, 7 * P, 1, 9 * P, 9 * P),            // x rail low
    box(0, 12 * P, 7 * P, 1, 15 * P, 9 * P),          // x rail high
  ];
}

export function wallShape() {
  return [
    box(4 * P, 0, 4 * P, 12 * P, 1, 12 * P),
    box(5 * P, 0, 0, 11 * P, 13 * P, 1),
    box(0, 0, 5 * P, 1, 13 * P, 11 * P),
  ];
}

/** Torch: thin stick with a slightly raised flame cell. */
export function torchShape() {
  return [box(7 * P, 0, 7 * P, 9 * P, 10 * P, 9 * P)];
}

/** Wall torch leaning out of face `facing`. */
export function wallTorchShape(facing = 0) {
  const t = 2 * P;
  switch (facing & 3) {
    case 0: return [box(0.5 - t / 2, 3 * P, 1 - 4 * P, 0.5 + t / 2, 13 * P, 1)];
    case 1: return [box(0, 3 * P, 0.5 - t / 2, 4 * P, 13 * P, 0.5 + t / 2)];
    case 2: return [box(0.5 - t / 2, 3 * P, 0, 0.5 + t / 2, 13 * P, 4 * P)];
    default: return [box(1 - 4 * P, 3 * P, 0.5 - t / 2, 1, 13 * P, 0.5 + t / 2)];
  }
}

export function ladderShape(facing = 0) {
  const d = 3 * P;
  switch (facing & 3) {
    case 0: return [box(0, 0, 1 - d, 1, 1, 1)];
    case 1: return [box(0, 0, 0, d, 1, 1)];
    case 2: return [box(0, 0, 0, 1, 1, d)];
    default: return [box(1 - d, 0, 0, 1, 1, 1)];
  }
}

export function doorShape(facing = 0, open = false) {
  const d = 3 * P;
  const f = open ? (facing + 3) & 3 : facing & 3;
  switch (f) {
    case 0: return [box(0, 0, 1 - d, 1, 1, 1)];
    case 1: return [box(0, 0, 0, d, 1, 1)];
    case 2: return [box(0, 0, 0, 1, 1, d)];
    default: return [box(1 - d, 0, 0, 1, 1, 1)];
  }
}

export function trapdoorShape(top = false) {
  return top ? [box(0, 1 - 3 * P, 0, 1, 1, 1)] : [box(0, 0, 0, 1, 3 * P, 1)];
}

/** Cactus: body inset by 1px so the spiky side texture reads. */
export function cactusShape() {
  return [box(P, 0, P, 1 - P, 1, 1 - P)];
}

export function snowLayerShape(layers = 1) {
  return [box(0, 0, 0, 1, Math.max(1, layers) * 2 * P, 1)];
}

export function chestShape() {
  return [box(P, 0, P, 1 - P, 14 * P, 1 - P)];
}

export function bedShape(head = false) {
  return [box(0, 3 * P, 0, 1, 9 * P, 1)];
}

export function cakeShape(bites = 0) {
  const x0 = 1 * P + bites * 2 * P;
  return [box(x0, 0, P, 1 - P, 8 * P, 1 - P)];
}

export function farmlandShape() { return [box(0, 0, 0, 1, 15 * P, 1)]; }

export function panePost() { return [box(7 * P, 0, 7 * P, 9 * P, 1, 9 * P)]; }

export function lilyShape() { return [box(0, 0, 0, 1, P, 1)]; }

export function endPortalFrameShape() { return [box(0, 0, 0, 1, 13 * P, 1)]; }

export function anvilShape() {
  return [
    box(2 * P, 0, 2 * P, 14 * P, 4 * P, 14 * P),
    box(4 * P, 4 * P, 5 * P, 12 * P, 5 * P, 11 * P),
    box(6 * P, 5 * P, 6 * P, 10 * P, 10 * P, 10 * P),
    box(3 * P, 10 * P, 0, 13 * P, 1, 1),
  ];
}

export function campfireShape() { return [box(0, 0, 0, 1, 7 * P, 1)]; }

export function lanternShape(hanging = false) {
  return hanging
    ? [box(5 * P, 1 - 8 * P, 5 * P, 11 * P, 1 - P, 11 * P)]
    : [box(5 * P, 0, 5 * P, 11 * P, 7 * P, 11 * P)];
}

export function flowerPotShape() { return [box(5 * P, 0, 5 * P, 11 * P, 6 * P, 11 * P)]; }

export function barsShape() {
  return [
    box(7 * P, 0, 0, 9 * P, 1, 1),
    box(0, 0, 7 * P, 1, 1, 9 * P),
  ];
}

/** Grow a shape list uniformly (used by baby/grown crop stages). */
export function scaleShape(boxes, sy) {
  return boxes.map((b) => box(b.x0, b.y0 * sy, b.z0, b.x1, b.y1 * sy, b.z1, b.faces));
}

export { P as PIXEL };
