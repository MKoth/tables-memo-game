import React, { useMemo } from 'react';
import { Group, type SkImage } from '@shopify/react-native-skia';
import { useDerivedValue, type SharedValue } from 'react-native-reanimated';
import { CloudPatch } from './CloudPatch';
import { createLetterOrbCloudLayerConfig } from './orbCloudPresets';
import type { OrbAnimState } from './orbAnimTypes';
import { useOrbCloudPoolLoop } from './useOrbCloudLayer';

export type LetterOrbCloudLayerProps = {
  anim: SharedValue<OrbAnimState>;
  centerX: number;
  centerY: number;
  diameter: number;
  images: ReadonlyArray<SkImage>;
};

export function LetterOrbCloudLayer({
  anim,
  centerX,
  centerY,
  diameter,
  images,
}: LetterOrbCloudLayerProps) {
  const aspects = useMemo(
    () =>
      images.map(image => {
        const imageWidth = image.width();
        const imageHeight = image.height();
        return imageHeight > 0 ? imageWidth / imageHeight : 1;
      }),
    [images],
  );

  const config = useMemo(
    () =>
      createLetterOrbCloudLayerConfig({
        centerX,
        centerY,
        diameter,
        imageCount: images.length,
      }),
    [centerX, centerY, diameter, images.length],
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

  if (images.length === 0) {
    return null;
  }

  const patches = [];
  for (let i = 0; i < config.patchCount; i++) {
    patches.push(<CloudPatch key={i} index={i} pool={pool} images={images} aspects={aspects} />);
  }

  return (
    <Group transform={followTransform} opacity={opacity}>
      {patches}
    </Group>
  );
}
