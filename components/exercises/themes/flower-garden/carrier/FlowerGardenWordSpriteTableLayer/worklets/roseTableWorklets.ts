import type { SharedValue } from 'react-native-reanimated';
import { TINT_FLASH_MS } from '../config/flowerTableLayerConfig';

export function triggerRoseTintFlash(
  idx: number,
  preset: number,
  tintFlashPreset: SharedValue<number[]>,
  tintFlashUntil: SharedValue<number[]>,
  clock: SharedValue<number>,
): void {
  'worklet';
  const presets = [...tintFlashPreset.value];
  const until = [...tintFlashUntil.value];
  presets[idx] = preset;
  until[idx] = clock.value + TINT_FLASH_MS;
  tintFlashPreset.value = presets;
  tintFlashUntil.value = until;
}
