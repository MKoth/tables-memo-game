export type RoseTintRgb = readonly [number, number, number];

export const ROSE_TINT_PRESETS = {
  red:         [0.95, 0.18, 0.22], // classic crimson
  scarlet:     [1.00, 0.28, 0.20], // warm red-orange
  coral:       [1.00, 0.45, 0.38], // coral rose
  pink:        [1.00, 0.55, 0.72], // bright pink
  blush:       [1.00, 0.78, 0.84], // pale pink
  peach:       [1.00, 0.68, 0.48], // peach
  apricot:     [1.00, 0.62, 0.32], // warm apricot
  yellow:      [1.00, 0.88, 0.22], // golden yellow
  cream:       [1.00, 0.96, 0.84], // ivory/cream
  lavender:    [0.82, 0.62, 1.00], // soft lavender
  lilac:       [0.72, 0.50, 0.92], // lilac
  violet:      [0.60, 0.22, 0.88], // rich violet
  magenta:     [0.92, 0.20, 0.62], // deep pink
  blue:        [0.35, 0.52, 1.00], // fantasy blue rose
  white:       [0.98, 0.98, 0.98], // white
  blackRose:   [0.32, 0.08, 0.10], // very dark burgundy
} as const satisfies Record<string, RoseTintRgb>;

const ROSE_TINT_VARIANTS: ReadonlyArray<RoseTintRgb> = [
  ROSE_TINT_PRESETS.red,
  ROSE_TINT_PRESETS.scarlet,
  ROSE_TINT_PRESETS.coral,
  ROSE_TINT_PRESETS.pink,
  ROSE_TINT_PRESETS.blush,
  ROSE_TINT_PRESETS.peach,
  ROSE_TINT_PRESETS.apricot,
  ROSE_TINT_PRESETS.yellow,
  ROSE_TINT_PRESETS.cream,
  ROSE_TINT_PRESETS.lavender,
  ROSE_TINT_PRESETS.lilac,
  ROSE_TINT_PRESETS.violet,
  ROSE_TINT_PRESETS.magenta,
  ROSE_TINT_PRESETS.blue,
  ROSE_TINT_PRESETS.white,
  ROSE_TINT_PRESETS.blackRose,

];

export function pickRoseTintVariant(idx: number): RoseTintRgb {
  let h = idx | 0;
  h = ((h >>> 16) ^ h) * 0x45d9f3b | 0;
  h = ((h >>> 16) ^ h) * 0x45d9f3b | 0;
  h = (h >>> 16) ^ h;
  const variant = ROSE_TINT_VARIANTS[Math.abs(h) % ROSE_TINT_VARIANTS.length];
  return variant ?? ROSE_TINT_PRESETS.red;
}
