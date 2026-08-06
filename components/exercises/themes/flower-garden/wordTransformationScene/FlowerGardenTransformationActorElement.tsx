import React, { memo, useMemo } from 'react';
import { Glyphs, Group, type SkImage } from '@shopify/react-native-skia';
import { useDerivedValue, type SharedValue } from 'react-native-reanimated';
import { LETTER_ORB_FLOWER_PRESET } from '../orb/orbAnimPresets';
import { OrbFlowerShader } from '../orb/OrbFlowerShader';
import {
  LABEL_FILL_COLOR,
  LABEL_REF_DIAMETER,
  LABEL_STROKE_COLOR,
  LABEL_STROKE_WIDTH,
  LABEL_WRONG_COLOR,
  labelFontFor,
  labelGlyphsFor,
} from '../orb/orbLabel';
import { hashSeedString } from '../scenery/BushShaderLayer/helpers/seededRandom';
import type { OrbAnimState } from '../orb/orbAnimTypes';

export type FlowerGardenTransformationActorElementProps = {
  slot: number;
  poses: SharedValue<OrbAnimState[]>;
  label: string;
  ringVariants: ReadonlyArray<SkImage | null> | null;
  bedVariants: ReadonlyArray<SkImage | null> | null;
  labelFixed?: boolean;
  letterSpacing?: number;
};

export const FlowerGardenTransformationActorElement = memo(
  function FlowerGardenTransformationActorElementComponent({
    slot,
    poses,
    label,
    ringVariants,
    bedVariants,
    labelFixed = false,
    letterSpacing = 0,
  }: FlowerGardenTransformationActorElementProps) {
    const pose = useDerivedValue(() => poses.value[slot]!, [poses, slot]);

    const orbSeed = useMemo(
      () => hashSeedString(`flower-garden-letter-orb-${label}`),
      [label],
    );

    const font = useMemo(() => labelFontFor(label.length), [label.length]);
    const glyphs = useMemo(
      () => labelGlyphsFor(label, font, letterSpacing),
      [font, label, letterSpacing],
    );

    const labelTransform = useDerivedValue(() => {
      const { centerX: cx, centerY: cy, diameter: d } = pose.value;
      const ox = LABEL_REF_DIAMETER * 0.5;
      const oy = LABEL_REF_DIAMETER * 0.5;
      const scale = labelFixed ? 1 : d > 0 ? d / LABEL_REF_DIAMETER : 1;
      return [
        { translateX: cx - d * 0.5 },
        { translateY: cy - d * 0.5 },
        { translateX: ox },
        { translateY: oy },
        { scale },
        { translateX: -ox },
        { translateY: -oy },
      ];
    });

    const labelOpacity = useDerivedValue(() => {
      const { overallOpacity, captureVisualT } = pose.value;
      return overallOpacity * captureVisualT;
    });

    const labelColor = useDerivedValue(() => {
      const { tintStrength } = pose.value;
      return tintStrength > 0 ? LABEL_WRONG_COLOR : LABEL_FILL_COLOR;
    });

    if (ringVariants == null || bedVariants == null || label === '') {
      return null;
    }

    return (
      <>
        <OrbFlowerShader
          anim={pose}
          seed={orbSeed}
          preset={LETTER_ORB_FLOWER_PRESET}
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
          <Glyphs font={font} glyphs={glyphs} color={labelColor} />
        </Group>
      </>
    );
  },
);
