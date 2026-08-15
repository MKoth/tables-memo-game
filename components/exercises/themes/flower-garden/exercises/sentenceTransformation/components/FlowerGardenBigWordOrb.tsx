import React, { useMemo } from 'react';
import { StyleSheet } from 'react-native';
import { Canvas, Glyphs, Group } from '@shopify/react-native-skia';
import { useDerivedValue, type SharedValue } from 'react-native-reanimated';
import { useFlowerGardenAssetsContext } from '../../../core/providers/FlowerGardenAssetsProvider';
import { OrbFlowerShader } from '../../../orb/OrbFlowerShader';
import {
  ORB_FLOWER_PRESET,
  type OrbFlowerPreset,
} from '../../../orb/orbAnimPresets';
import {
  LABEL_FILL_COLOR,
  LABEL_REF_DIAMETER,
  LABEL_STROKE_COLOR,
  LABEL_STROKE_WIDTH,
  labelFontFor,
  labelGlyphsFor,
} from '../../../orb/orbLabel';
import { OrbPhase, type OrbAnimState } from '../../../orb/orbAnimTypes';
import { useExerciseClock } from '../../../../../core';

export type FlowerGardenBigWordOrbProps = {
  centerX: SharedValue<number>;
  centerY: SharedValue<number>;
  targetDiameter: SharedValue<number>;
  overallOpacity: SharedValue<number>;
  word: string;
  seed: number;
  /** Orb look preset (defaults to the big-word look; pass the option-orb preset to mirror an option). */
  preset?: OrbFlowerPreset;
};

export function FlowerGardenBigWordOrb({
  centerX,
  centerY,
  targetDiameter,
  overallOpacity,
  word,
  seed,
  preset = ORB_FLOWER_PRESET,
}: FlowerGardenBigWordOrbProps) {
  const { images } = useFlowerGardenAssetsContext();
  const clock = useExerciseClock();
  const ringVariants = images.orbRingImages;
  const bedVariants = images.orbBedImages;

  const orbAnim = useDerivedValue<OrbAnimState>(() => {
    const diameter = targetDiameter.value;
    return {
      centerX: centerX.value,
      centerY: centerY.value,
      diameter,
      targetDiameter: diameter,
      overallOpacity: overallOpacity.value,
      captureVisualT: 1,
      phase: OrbPhase.Idle,
      enterT: 1,
      burstT: 0,
      idleElapsedMs: clock.value,
      tintR: 0,
      tintG: 0,
      tintB: 0,
      tintStrength: 0,
    };
  });

  const font = useMemo(() => labelFontFor(word.length), [word.length]);
  const glyphs = useMemo(() => labelGlyphsFor(word, font), [font, word]);

  const labelTransform = useDerivedValue(() => {
    const cx = centerX.value;
    const cy = centerY.value;
    const d = targetDiameter.value;
    const ox = LABEL_REF_DIAMETER * 0.5;
    const oy = LABEL_REF_DIAMETER * 0.5;
    const scale = d > 0 ? d / LABEL_REF_DIAMETER : 0;
    return [
      { translateX: cx },
      { translateY: cy },
      { scale },
      { translateX: -ox },
      { translateY: -oy },
    ];
  });

  const labelOpacity = useDerivedValue(() => {
    return Math.max(0, Math.min(1, overallOpacity.value));
  });

  if (ringVariants == null || bedVariants == null || word.length === 0) {
    return null;
  }

  return (
    <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
      <OrbFlowerShader
        anim={orbAnim}
        seed={seed}
        preset={preset}
        ringVariants={ringVariants}
        bedVariants={bedVariants}
      />
      <Group transform={labelTransform} opacity={labelOpacity}>
        <Group
          style="stroke"
          strokeWidth={LABEL_STROKE_WIDTH}
          strokeJoin="round"
          strokeCap="round"
          color={LABEL_STROKE_COLOR}>
          <Glyphs font={font} glyphs={glyphs} />
        </Group>
        <Glyphs font={font} glyphs={glyphs} color={LABEL_FILL_COLOR} />
      </Group>
    </Canvas>
  );
}
