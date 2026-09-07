/**
 * ============================================================================
 * DETERMINISTIC SYMMETRIC RADIAL TOPPING LAYOUT & MULTI-RING ALLOCATION ENGINE
 * ============================================================================
 */

export const PIZZA_CENTER = 50.0;
// Crust rim starts at 34.2%. MAX_ALLOWED_RADIUS = 28.5% places outer toppings
// right near the crust edge with full 360° rotational balance while keeping
// every topping piece safely inside the cheese zone.
export const MAX_ALLOWED_RADIUS = 28.5;

/**
 * 1. Concentric Radial Ring Definitions (Pure Even Angular Division)
 */
export const RINGS_DEFINITION = [
  { id: 'center', radius: 0.0, count: 1, baseOffsetDeg: 0 },
  { id: 'ring1',  radius: 7.5, count: 6, baseOffsetDeg: 0 },
  { id: 'ring2',  radius: 15.0, count: 10, baseOffsetDeg: 18 },
  { id: 'ring3',  radius: 22.5, count: 14, baseOffsetDeg: 0 },
  { id: 'ring4',  radius: 28.5, count: 18, baseOffsetDeg: 10 },
];

/**
 * 2. Generate all deterministic symmetric radial slots
 */
export function generateRadialSlots() {
  const slots = [];
  let globalSlotId = 0;

  for (const ring of RINGS_DEFINITION) {
    const { id: ringName, radius, count, baseOffsetDeg } = ring;

    if (count === 1 && radius === 0) {
      slots.push({
        id: globalSlotId++,
        ring: ringName,
        ringIndex: 0,
        radiusPct: 0,
        angleDeg: 0,
        x: 50.0,
        y: 50.0,
      });
      continue;
    }

    const angleStep = 360.0 / count;
    for (let i = 0; i < count; i++) {
      const angleDeg = (baseOffsetDeg + i * angleStep) % 360.0;
      const angleRad = (angleDeg * Math.PI) / 180.0;

      const x = Number((50.0 + radius * Math.cos(angleRad)).toFixed(3));
      const y = Number((50.0 + radius * Math.sin(angleRad)).toFixed(3));

      slots.push({
        id: globalSlotId++,
        ring: ringName,
        ringIndex: RINGS_DEFINITION.findIndex((r) => r.id === ringName),
        radiusPct: radius,
        angleDeg: Number(angleDeg.toFixed(2)),
        x,
        y,
      });
    }
  }

  return slots;
}

export const ALL_SYMMETRIC_SLOTS = generateRadialSlots();

/**
 * Defensive Hard Clamp: Constrains any (x, y) coordinate to stay strictly
 * within MAX_ALLOWED_RADIUS from center (50%, 50%).
 */
export function clampToppingPosition(rawX, rawY, maxRadius = MAX_ALLOWED_RADIUS, center = PIZZA_CENTER) {
  const dx = rawX - center;
  const dy = rawY - center;
  const currentRadius = Math.sqrt(dx * dx + dy * dy);

  if (currentRadius <= maxRadius || currentRadius === 0) {
    return { x: rawX, y: rawY, clamped: false };
  }

  const scale = maxRadius / currentRadius;
  const clampedX = Number((center + dx * scale).toFixed(2));
  const clampedY = Number((center + dy * scale).toFixed(2));

  return {
    x: clampedX,
    y: clampedY,
    clamped: true,
  };
}

/**
 * 3. Realistic Proportionate Base Sizes (% of Pizza Container Diameter)
 */
export const TOPPING_BASE_SIZES = {
  onion:    { widthPct: 14.0, heightPct: 14.0, spriteCount: 4 }, // Translucent red onion rings
  pepper:   { widthPct: 13.5, heightPct: 13.5, spriteCount: 4 }, // Crisp curved capsicum strips
  mushroom: { widthPct: 13.0, heightPct: 13.0, spriteCount: 4 }, // Sliced button/cremini mushrooms
  tomato:   { widthPct: 12.5, heightPct: 12.5, spriteCount: 2 }, // Sliced tomato discs
  spinach:  { widthPct: 14.0, heightPct: 11.5, spriteCount: 2 }, // Fresh basil / spinach leaves
  paneer:   { widthPct: 11.5, heightPct: 11.5, spriteCount: 2 }, // Grilled tandoori paneer cubes
  jalapeno: { widthPct: 11.0, heightPct: 11.0, spriteCount: 2 }, // Pickled jalapeño rounds
  olive:    { widthPct: 10.0, heightPct: 10.0, spriteCount: 4 }, // Sliced black Kalamata olives
  corn:     { widthPct:  9.0, heightPct:  9.0, spriteCount: 4 }, // Golden roasted sweetcorn clusters
  default:  { widthPct: 11.5, heightPct: 11.5, spriteCount: 2 },
};

/**
 * Returns canonical topping category identifier
 */
export const getToppingKey = (name = '') => {
  const lower = name.toLowerCase();
  if (lower.includes('onion')) return 'onion';
  if (lower.includes('corn')) return 'corn';
  if (lower.includes('jalape')) return 'jalapeno';
  if (lower.includes('spinach') || lower.includes('basil') || lower.includes('green') || lower.includes('herb')) return 'spinach';
  if (lower.includes('pepper') || lower.includes('capsicum') || lower.includes('bell')) return 'pepper';
  if (lower.includes('mushroom')) return 'mushroom';
  if (lower.includes('paneer') || lower.includes('tikka')) return 'paneer';
  if (lower.includes('olive')) return 'olive';
  if (lower.includes('tomato')) return 'tomato';
  return 'default';
};

/**
 * Get sprite URL for a given topping key and instance index
 */
export const getToppingSpriteUrl = (key, spriteIndex = 1) => {
  const config = TOPPING_BASE_SIZES[key] || TOPPING_BASE_SIZES.default;
  const count = config.spriteCount || 2;
  const clampedIndex = ((spriteIndex - 1) % count) + 1;
  return `/images/toppings/${key}_${clampedIndex}.png`;
};

/**
 * 4. Deterministic Multi-Ring Cross-Layer Allocator
 * Guarantees every topping type distributes its pieces evenly across ALL radial bands
 * (Inner, Mid, and Outer near-crust) with staggered angular offsets per topping type.
 */
export class PersistentToppingCache {
  constructor() {
    this.cache = new Map(); // toppingId -> AllocatedInstance[]
    this.claimedSlotKeys = new Set(); // Set of "ring-index" claimed keys
    this.toppingTypeOrder = []; // Track sequential assignment index for angular phase offsets
  }

  addTopping(topping) {
    const toppingId = topping._id || topping.name;
    if (this.cache.has(toppingId)) {
      return this.cache.get(toppingId);
    }

    const key = getToppingKey(topping.name);
    const baseDimensions = TOPPING_BASE_SIZES[key] || TOPPING_BASE_SIZES.default;

    if (!this.toppingTypeOrder.includes(toppingId)) {
      this.toppingTypeOrder.push(toppingId);
    }
    const typeIndex = this.toppingTypeOrder.indexOf(toppingId);

    // Staggered angular offset per topping type (0°, 30°, 15°, 45°, etc.)
    const phaseOffsets = [0, 30, 15, 45, 20, 50, 10, 40];
    const phaseOffsetDeg = phaseOffsets[typeIndex % phaseOffsets.length] || (typeIndex * 25) % 360;

    // Cross-ring blueprint per topping (pure 60° rotational steps covering all 360°):
    // Piece 1: Inner ring (r = 7.5%) @ 0°
    // Piece 2: Mid-Inner ring (r = 15.0%) @ 60°
    // Piece 3: Mid-Outer ring (r = 22.5%) @ 120°
    // Piece 4: Outer near-crust ring (r = 28.5%) @ 180°
    // Piece 5: Outer near-crust ring (r = 28.5%) @ 240°
    // Piece 6: Mid-Outer ring (r = 22.5%) @ 300°
    const ringPlan = [
      { ringId: 'ring1', radius: 7.5,  baseAngleDeg: 0 },
      { ringId: 'ring2', radius: 15.0, baseAngleDeg: 60 },
      { ringId: 'ring3', radius: 22.5, baseAngleDeg: 120 },
      { ringId: 'ring4', radius: 28.5, baseAngleDeg: 180 },
      { ringId: 'ring4', radius: 28.5, baseAngleDeg: 240 },
      { ringId: 'ring3', radius: 22.5, baseAngleDeg: 300 },
    ];

    const instances = [];

    for (let pieceIdx = 0; pieceIdx < ringPlan.length; pieceIdx++) {
      const plan = ringPlan[pieceIdx];

      // Base target angle on 360° wheel + topping type offset
      const targetAngleDeg = (phaseOffsetDeg + plan.baseAngleDeg) % 360.0;

      // Small deterministic pseudo-random hash for handcrafted feel (±1.5% max)
      const seed = (toppingId.charCodeAt(0) || 17) * 31 + pieceIdx * 73;
      const jitterRadius = (Math.sin(seed) * 1.2); // ±1.2% radial variation
      const jitterAngle = (Math.cos(seed) * 2.5); // ±2.5° angular variation

      const effectiveRadius = Math.min(MAX_ALLOWED_RADIUS, Math.max(5.0, plan.radius + jitterRadius));
      const finalAngleDeg = (targetAngleDeg + jitterAngle + 360) % 360;
      const finalAngleRad = (finalAngleDeg * Math.PI) / 180.0;

      const rawX = 50.0 + effectiveRadius * Math.cos(finalAngleRad);
      const rawY = 50.0 + effectiveRadius * Math.sin(finalAngleRad);

      const { x: safeX, y: safeY } = clampToppingPosition(rawX, rawY, MAX_ALLOWED_RADIUS, PIZZA_CENTER);

      // Deterministic rotation & natural slight scale variance
      const boundedRotation = Math.round(Math.sin(seed * 1.7) * 32); // [-32°, +32°]
      const scaleVar = 0.95 + Math.abs(Math.cos(seed * 2.3)) * 0.10; // 0.95x - 1.05x natural scale

      // Sprite variation (1..N)
      const spriteIdx = (pieceIdx % (baseDimensions.spriteCount || 2)) + 1;
      const spriteUrl = getToppingSpriteUrl(key, spriteIdx);

      // Fall physics offset
      const initialDropY = -120 - (pieceIdx % 5) * 20;
      const initialRotate = boundedRotation + (pieceIdx % 2 === 0 ? -20 : 20);

      instances.push({
        instanceId: `${toppingId}-piece-${pieceIdx}`,
        slotId: pieceIdx,
        ring: plan.ringId,
        radiusPct: effectiveRadius,
        angleDeg: finalAngleDeg,
        x: Number(safeX.toFixed(2)),
        y: Number(safeY.toFixed(2)),
        widthPct: Number((baseDimensions.widthPct * scaleVar).toFixed(2)),
        heightPct: Number((baseDimensions.heightPct * scaleVar).toFixed(2)),
        rotation: boundedRotation,
        initialRotate,
        initialDropY,
        spriteUrl,
        topping,
        key,
      });
    }

    this.cache.set(toppingId, instances);
    return instances;
  }

  removeTopping(toppingId) {
    if (!this.cache.has(toppingId)) return;
    this.cache.delete(toppingId);
    this.toppingTypeOrder = this.toppingTypeOrder.filter((id) => id !== toppingId);
  }

  syncWithSelected(selectedVeggies = []) {
    const activeIds = new Set(selectedVeggies.map((v) => v._id || v.name));

    // 1. Release removed toppings
    for (const cachedId of Array.from(this.cache.keys())) {
      if (!activeIds.has(cachedId)) {
        this.removeTopping(cachedId);
      }
    }

    // 2. Add newly selected toppings into available slots
    for (const veggie of selectedVeggies) {
      const vid = veggie._id || veggie.name;
      if (!this.cache.has(vid)) {
        this.addTopping(veggie);
      }
    }

    // 3. Assemble flat list of active instances
    const allInstances = [];
    for (const instances of this.cache.values()) {
      allInstances.push(...instances);
    }
    return allInstances;
  }
}
