import React from 'react';
import type { SkImage } from '@shopify/react-native-skia';
import type { SharedValue } from 'react-native-reanimated';
import { useDerivedValue } from 'react-native-reanimated';
import { JellyfishInstance, type JellyfishDynamicOverrides } from './JellyfishInstance/JellyfishInstance';
import {
  JELLYFISH_DEFAULT_WOBBLE,
  JELLYFISH_FLASH_TINT_WAVE_SPEED,
  JELLYFISH_FLASH_WOBBLE,
  JELLYFISH_TINT_PRESETS,
  JELLYFISH_TINT_PRESETS_BY_INDEX,
} from '../presets/jellyfishTintPresets';
import type { CellConfig } from '../helpers/cellConfigBuilders';

export type CellJellyfishProps = {
  config: CellConfig;
  layoutX: SharedValue<number[]>;
  layoutY: SharedValue<number[]>;
  layoutScale: SharedValue<number[]>;
  motionAngle: SharedValue<number>;
  motionAmp: SharedValue<number>;
  tintFlashPreset: SharedValue<number[]>;
  tintFlashUntil: SharedValue<number[]>;
  bellImage: SkImage;
  tentacleImage: SkImage;
  clock: SharedValue<number>;
  isPersistentlyHighlighted?: boolean;
};

export function CellJellyfish({
  config,
  layoutX,
  layoutY,
  layoutScale,
  motionAngle,
  motionAmp,
  tintFlashPreset,
  tintFlashUntil,
  bellImage,
  tentacleImage,
  clock,
  isPersistentlyHighlighted = false,
}: CellJellyfishProps) {
  const idx = config.index;

  const dynamicOverrides = useDerivedValue((): JellyfishDynamicOverrides => {
    const until = tintFlashUntil.value[idx] ?? 0;
    const presetIdx = tintFlashPreset.value[idx] ?? -1;
    const isFlashing = clock.value < until && presetIdx >= 0;
    const wobble = isFlashing || isPersistentlyHighlighted
      ? JELLYFISH_FLASH_WOBBLE
      : JELLYFISH_DEFAULT_WOBBLE;
    const tentacleWobbleAmp = wobble.wobbleAmp * 1.25;

    if (isPersistentlyHighlighted) {
      const preset = JELLYFISH_TINT_PRESETS.primary;
      return {
        tintMode: preset.tintMode,
        tintStrength: preset.tintStrength,
        tintA: [preset.tintA[0], preset.tintA[1], preset.tintA[2]],
        tintB: [preset.tintB[0], preset.tintB[1], preset.tintB[2]],
        tintC: [preset.tintC[0], preset.tintC[1], preset.tintC[2]],
        animatedTint: preset.animatedTint,
        tintWaveSpeed: JELLYFISH_FLASH_TINT_WAVE_SPEED,
        bellWobbleAmp: wobble.wobbleAmp,
        tentacleWobbleAmp,
        wobbleSpeed: wobble.wobbleSpeed,
        wobbleLobes: wobble.wobbleLobes,
      };
    }

    if (isFlashing) {
      const preset = JELLYFISH_TINT_PRESETS_BY_INDEX[presetIdx];
      if (preset) {
        return {
          tintMode: preset.tintMode,
          tintStrength: preset.tintStrength,
          tintA: [preset.tintA[0], preset.tintA[1], preset.tintA[2]],
          tintB: [preset.tintB[0], preset.tintB[1], preset.tintB[2]],
          tintC: [preset.tintC[0], preset.tintC[1], preset.tintC[2]],
          animatedTint: preset.animatedTint,
          tintWaveSpeed: JELLYFISH_FLASH_TINT_WAVE_SPEED,
          bellWobbleAmp: wobble.wobbleAmp,
          tentacleWobbleAmp,
          wobbleSpeed: wobble.wobbleSpeed,
          wobbleLobes: wobble.wobbleLobes,
        };
      }
    }

    return {
      tintMode: config.tintMode,
      tintStrength: config.tintStrength,
      tintA: [config.tintA[0], config.tintA[1], config.tintA[2]],
      tintB: [config.tintB[0], config.tintB[1], config.tintB[2]],
      tintC: [config.tintC[0], config.tintC[1], config.tintC[2]],
      animatedTint: config.animatedTint,
      tintWaveSpeed: config.tintWaveSpeed,
      bellWobbleAmp: wobble.wobbleAmp,
      tentacleWobbleAmp,
      wobbleSpeed: wobble.wobbleSpeed,
      wobbleLobes: wobble.wobbleLobes,
    };
  });

  return (
    <JellyfishInstance
      bellImage={bellImage}
      tentacleImage={tentacleImage}
      layoutX={layoutX}
      layoutY={layoutY}
      layoutScale={layoutScale}
      layoutIndex={config.index}
      bellSize={config.bellSize}
      phase={config.phase}
      pulseSpeed={config.pulseSpeed}
      tintMode={config.tintMode}
      tintStrength={config.tintStrength}
      tintA={config.tintA}
      tintB={config.tintB}
      tintC={config.tintC}
      animatedTint={config.animatedTint}
      tintWaveSpeed={config.tintWaveSpeed}
      dynamicOverrides={dynamicOverrides}
      tiltAngle={motionAngle}
      tiltAmp={motionAmp}
      clock={clock}
    />
  );
}
