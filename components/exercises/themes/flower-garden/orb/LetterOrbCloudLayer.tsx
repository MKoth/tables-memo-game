import React, { useMemo } from 'react';
import { Group, type SkImage } from '@shopify/react-native-skia';
import { useDerivedValue, type SharedValue } from 'react-native-reanimated';
import type { AtlasRegion } from '../core/assets/textureAtlas/packTextureAtlas';
import { CloudPatch } from './CloudPatch';
import { createLetterOrbCloudLayerConfig } from './orbCloudPresets';
import type { OrbAnimState } from './orbAnimTypes';
import { useOrbCloudPoolLoop } from './useOrbCloudLayer';

export type LetterOrbCloudLayerProps = {
  anim: SharedValue<OrbAnimState>;
  centerX: number;
  centerY: number;
  diameter: number;
  atlas: SkImage | null;
  regions: ReadonlyArray<AtlasRegion>;
};

export function LetterOrbCloudLayer({
  anim,
  centerX,
  centerY,
  diameter,
  atlas,
  regions,
}: LetterOrbCloudLayerProps) {
  const config = useMemo(
    () =>
      createLetterOrbCloudLayerConfig({
        centerX,
        centerY,
        diameter,
        imageCount: regions.length,
      }),
    [centerX, centerY, diameter, regions.length],
  );

  const { pool } = useOrbCloudPoolLoop(config);

  const followTransform = useDerivedValue(() => {
    const { centerX: cx, centerY: cy, diameter: d } = anim.value;
    const scale = config.diameter > 0 ? d / config.diameter : 1;
    return [
      { translateX: cx },
      { translateY: cy },
      { scale },
      { translateX: -config.centerX },
      { translateY: -config.centerY },
    ];
  }, [anim, config]);

  const opacity = useDerivedValue(() => anim.value.overallOpacity, [anim]);

  if (atlas == null || regions.length === 0) {
    return null;
  }

  const patches = [];
  for (let i = 0; i < config.patchCount; i++) {
    patches.push(<CloudPatch key={i} index={i} pool={pool} atlas={atlas} regions={regions} />);
  }

  return (
    <Group transform={followTransform} opacity={opacity}>
      {patches}
    </Group>
  );
}
