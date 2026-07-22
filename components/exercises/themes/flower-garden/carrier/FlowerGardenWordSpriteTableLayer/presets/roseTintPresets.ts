export type RoseTintRgb = readonly [number, number, number];
export type Rng = () => number;

export const ROSE_TINT_PRESETS = {
  red:         [0.95, 0.18, 0.22], // classic crimson
  // scarlet:     [1.00, 0.28, 0.20], // warm red-orange
  // coral:       [1.00, 0.45, 0.38], // coral rose
  // pink:        [1.00, 0.55, 0.72], // bright pink
  blush:       [1.00, 0.78, 0.84], // pale pink
  // peach:       [1.00, 0.68, 0.48], // peach
   apricot:     [1.00, 0.62, 0.32], // warm apricot
  // yellow:      [1.00, 0.88, 0.22], // golden yellow
  // cream:       [1.00, 0.96, 0.84], // ivory/cream
  //lavender:    [0.82, 0.62, 1.00], // soft lavender
  // lilac:       [0.72, 0.50, 0.92], // lilac
  violet:      [0.60, 0.22, 0.88], // rich violet
  // magenta:     [0.92, 0.20, 0.62], // deep pink
  // blue:        [0.35, 0.52, 1.00], // fantasy blue rose
  // white:       [0.98, 0.98, 0.98], // white
  blackRose:   [0.32, 0.08, 0.10], // very dark burgundy
} as const satisfies Record<string, RoseTintRgb>;

const ROSE_TINT_PRESET_LIST: ReadonlyArray<RoseTintRgb> = Object.values(
  ROSE_TINT_PRESETS,
);

export function pickBushTints(rng: Rng, nBushes: number): RoseTintRgb[] {
  const pool = ROSE_TINT_PRESET_LIST;
  const picked: RoseTintRgb[] = [];
  const used = new Set<number>();
  for (let i = 0; i < nBushes; i++) {
    let idx: number;
    if (used.size < pool.length) {
      do {
        idx = Math.floor(rng() * pool.length);
      } while (used.has(idx));
    } else {
      idx = Math.floor(rng() * pool.length);
    }
    used.add(idx);
    picked.push(pool[idx] ?? ROSE_TINT_PRESETS.red);
  }
  return picked;
}
