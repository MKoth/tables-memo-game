import { jellyfishDeformUniformDefaults } from '../../../shaders/jellyfishDeform.sksl';
import { darkenTint, lightenTint, tintToRgba } from '../helpers/tintPalette';

export type JellyfishTintRgb = readonly [number, number, number];

export type JellyfishTintPreset = {
  tintMode: 2;
  tintStrength: number;
  tintA: JellyfishTintRgb;
  tintB: JellyfishTintRgb;
  tintC: JellyfishTintRgb;
  animatedTint: true;
  tintWaveSpeed: number;
};

export type JellyfishLabelColors = {
  labelFillColor: string;
  labelStrokeColor: string;
};

/** Label fill/stroke matched to a tint preset (light fill, dark stroke). */
export function labelColorsFromTints(
  tintA: JellyfishTintRgb,
  tintC: JellyfishTintRgb,
): JellyfishLabelColors {
  return {
    labelFillColor: tintToRgba(lightenTint(tintA, 0.38), 0.95),
    labelStrokeColor: tintToRgba(darkenTint(tintC, 0.68), 0.92),
  };
}

/** Semantic tint presets — three-stop radial with animated color cycling. */
export const JELLYFISH_TINT_PRESETS = {
  primary: {
    tintMode: 2,
    tintStrength: 0.9,
    tintA: [0.6, 1.3, 1.8],
    tintB: [0.5, 1.15, 1.6],
    tintC: [0.4, 0.95, 1.35],
    animatedTint: true,
    tintWaveSpeed: 0.35,
  },
  error: {
    tintMode: 2,
    tintStrength: 0.92,
    tintA: [1.15, 0.45, 0.4],
    tintB: [1.0, 0.3, 0.35],
    tintC: [0.85, 0.2, 0.3],
    animatedTint: true,
    tintWaveSpeed: 0.4,
  },
  success: {
    tintMode: 2,
    tintStrength: 0.9,
    tintA: [0.45, 1.05, 0.55],
    tintB: [0.35, 0.9, 0.45],
    tintC: [0.25, 0.75, 0.35],
    animatedTint: true,
    tintWaveSpeed: 0.35,
  },
  /** Brighter green cycling — row header cue for the active target cell. */
  highlightRow: {
    tintMode: 2,
    tintStrength: 0.94,
    tintA: [0.95, 1.3, 0.62],
    tintB: [0.82, 1.18, 0.52],
    tintC: [0.68, 1.05, 0.42],
    animatedTint: true,
    tintWaveSpeed: 0.42,
  },
  /** Lighter blue cycling — column header cue for the active target cell. */
  highlightCol: {
    tintMode: 2,
    tintStrength: 0.94,
    tintA: [0.78, 1.08, 1.38],
    tintB: [0.62, 0.92, 1.28],
    tintC: [0.48, 0.78, 1.18],
    animatedTint: true,
    tintWaveSpeed: 0.42,
  },
} as const satisfies Record<string, JellyfishTintPreset>;

export const JELLYFISH_TINT_PRESET_INDEX = {
  primary: 0,
  error: 1,
  success: 2,
} as const;

export type JellyfishTintPresetIndex =
  (typeof JELLYFISH_TINT_PRESET_INDEX)[keyof typeof JELLYFISH_TINT_PRESET_INDEX];

/** Persistent table highlight roles for the active guess cell and its headers. */
export type PersistentHighlightKind = 'target' | 'rowHeader' | 'colHeader';

export const JELLYFISH_PERSISTENT_HIGHLIGHT_PRESETS = {
  target: JELLYFISH_TINT_PRESETS.primary,
  rowHeader: JELLYFISH_TINT_PRESETS.highlightRow,
  colHeader: JELLYFISH_TINT_PRESETS.highlightCol,
} as const satisfies Record<PersistentHighlightKind, JellyfishTintPreset>;

export const JELLYFISH_PERSISTENT_HIGHLIGHT_LABEL_COLORS: Record<
  PersistentHighlightKind,
  JellyfishLabelColors
> = {
  target: labelColorsFromTints(
    JELLYFISH_TINT_PRESETS.primary.tintA,
    JELLYFISH_TINT_PRESETS.primary.tintC,
  ),
  rowHeader: labelColorsFromTints(
    JELLYFISH_TINT_PRESETS.highlightRow.tintA,
    JELLYFISH_TINT_PRESETS.highlightRow.tintC,
  ),
  colHeader: labelColorsFromTints(
    JELLYFISH_TINT_PRESETS.highlightCol.tintA,
    JELLYFISH_TINT_PRESETS.highlightCol.tintC,
  ),
};

/** Indexed lookup for worklets (primary → 0, error → 1, success → 2). */
export const JELLYFISH_TINT_PRESETS_BY_INDEX: ReadonlyArray<JellyfishTintPreset> = [
  JELLYFISH_TINT_PRESETS.primary,
  JELLYFISH_TINT_PRESETS.error,
  JELLYFISH_TINT_PRESETS.success,
];

/** Label colors per preset index — for click-flash text styling. */
export const JELLYFISH_LABEL_COLORS_BY_INDEX: ReadonlyArray<JellyfishLabelColors> =
  JELLYFISH_TINT_PRESETS_BY_INDEX.map(preset =>
    labelColorsFromTints(preset.tintA, preset.tintC),
  );

/** Boosted rim wobble applied for the click-flash duration (all presets). */
export const JELLYFISH_FLASH_WOBBLE = {
  wobbleAmp: jellyfishDeformUniformDefaults.wobbleAmp * 1.3,
  wobbleSpeed: jellyfishDeformUniformDefaults.wobbleSpeed * 6.0,
  wobbleLobes: 1,
} as const;

/** Faster multicolor tint cycling during click flash (all presets). */
export const JELLYFISH_FLASH_TINT_WAVE_SPEED =
  jellyfishDeformUniformDefaults.tintWaveSpeed * 4;

export const JELLYFISH_DEFAULT_WOBBLE = {
  wobbleAmp: jellyfishDeformUniformDefaults.wobbleAmp,
  wobbleSpeed: jellyfishDeformUniformDefaults.wobbleSpeed,
  wobbleLobes: jellyfishDeformUniformDefaults.wobbleLobes,
} as const;
