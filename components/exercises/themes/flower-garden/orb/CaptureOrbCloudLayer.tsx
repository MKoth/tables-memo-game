import React, { useMemo } from 'react';
import { StyleSheet, useWindowDimensions } from 'react-native';
import { Canvas, Group, Image, type SkImage } from '@shopify/react-native-skia';
import { useDerivedValue, type SharedValue } from 'react-native-reanimated';
import { createOrbCloudLayerConfig } from './orbCloudPresets';
import type { CloudPatchSlot } from './orbCloudTypes';
import { useOrbCloudLayer } from './useOrbCloudLayer';

function CloudPatch({
  index,
  pool,
  images,
  aspects,
}: {
  index: number;
  pool: SharedValue<CloudPatchSlot[]>;
  images: ReadonlyArray<SkImage>;
  aspects: ReadonlyArray<number>;
}) {
  const draw = useDerivedValue(() => {
    const slot = pool.value[index];
    if (slot == null || !slot.active) {
      return null;
    }
    const aspect = aspects[slot.imageIndex] ?? 1;
    const width = slot.size;
    const height = width / aspect;
    return {
      x: slot.x,
      y: slot.y,
      halfW: width * 0.5,
      halfH: height * 0.5,
      width,
      height,
      rotation: slot.rotation,
      opacity: slot.opacity,
      imageIndex: slot.imageIndex,
    };
  }, [pool, index, aspects, images]);

  const transform = useDerivedValue(() => {
    const d = draw.value;
    if (d == null) {
      return [{ translateX: 0 }, { translateY: 0 }];
    }
    return [
      { translateX: d.x },
      { translateY: d.y },
      { rotate: d.rotation },
      { translateX: -d.halfW },
      { translateY: -d.halfH },
    ];
  }, [draw]);

  const opacity = useDerivedValue(() => draw.value?.opacity ?? 0, [draw]);
  const width = useDerivedValue(() => draw.value?.width ?? 0, [draw]);
  const height = useDerivedValue(() => draw.value?.height ?? 0, [draw]);
  const image = useDerivedValue(() => {
    const d = draw.value;
    if (d == null || images.length === 0) {
      return images[0] ?? null;
    }
    return images[Math.min(d.imageIndex, images.length - 1)] ?? images[0] ?? null;
  }, [draw, images]);

  return (
    <Group transform={transform} opacity={opacity}>
      <Image
        image={image}
        x={0}
        y={0}
        width={width}
        height={height}
        fit="contain"
      />
    </Group>
  );
}

export type CaptureOrbCloudLayerProps = {
  centerX: number;
  centerY: number;
  diameter: number;
  phase: SharedValue<number>;
  images: ReadonlyArray<SkImage>;
};

export function CaptureOrbCloudLayer({
  centerX,
  centerY,
  diameter,
  phase,
  images,
}: CaptureOrbCloudLayerProps) {
  const { width, height } = useWindowDimensions();

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
    () => createOrbCloudLayerConfig({ centerX, centerY, diameter, imageCount: images.length }),
    [centerX, centerY, diameter, images.length],
  );

  const { pool, layerOpacity } = useOrbCloudLayer(config, phase);

  if (width === 0 || height === 0 || images.length === 0) {
    return null;
  }

  const patches = [];
  for (let i = 0; i < config.patchCount; i++) {
    patches.push(<CloudPatch key={i} index={i} pool={pool} images={images} aspects={aspects} />);
  }

  return (
    <Canvas style={[StyleSheet.absoluteFill, { width, height }]} pointerEvents="none">
      <Group opacity={layerOpacity}>{patches}</Group>
    </Canvas>
  );
}
