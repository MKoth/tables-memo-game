import { darkenTint, lightenTint, tintToRgba } from '../../../../undersea/carrier/WordSpriteTableLayer/helpers/tintPalette';
import type { RoseTintRgb } from './roseTintPresets';

export const ROSE_LABEL_FLASH_FILL_COLOR = '#ffffff';
export const ROSE_LABEL_FLASH_STROKE_COLOR = '#0a2840';

export function rollRoseLabelColors(
  tint: RoseTintRgb,
): { fillColor: string; strokeColor: string } {
  return {
    fillColor: tintToRgba(lightenTint(tint, 0.38), 0.95),
    strokeColor: tintToRgba(darkenTint(tint, 0.68), 0.92),
  };
}
