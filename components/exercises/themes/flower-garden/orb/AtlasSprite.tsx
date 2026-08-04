import React from 'react';
import { Group, Image, Skia, type SkImage } from '@shopify/react-native-skia';
import { useDerivedValue, type SharedValue } from 'react-native-reanimated';
import type { AtlasRegion } from '../core/assets/textureAtlas/packTextureAtlas';

export function AtlasSprite({
  atlas,
  region,
  width,
  height,
}: {
  atlas: SkImage | null;
  region: SharedValue<AtlasRegion | null>;
  width: SharedValue<number>;
  height: SharedValue<number>;
}) {
  const transform = useDerivedValue(() => {
    const r = region.value;
    const w = width.value;
    const h = height.value;
    if (r == null || w <= 0 || h <= 0 || r.width <= 0 || r.height <= 0) {
      return [];
    }
    const scale = Math.min(w / r.width, h / r.height);
    const fittedW = r.width * scale;
    const fittedH = r.height * scale;
    const offsetX = (w - fittedW) * 0.5;
    const offsetY = (h - fittedH) * 0.5;
    return [
      { translateX: offsetX },
      { translateY: offsetY },
      { scale },
      { translateX: -r.x },
      { translateY: -r.y },
    ];
  }, [region, width, height]);

  const clipRect = useDerivedValue(() => {
    return Skia.XYWHRect(0, 0, width.value, height.value);
  }, [width, height]);

  if (atlas == null) {
    return null;
  }

  return (
    <Group clip={clipRect}>
      <Group transform={transform}>
        <Image
          image={atlas}
          x={0}
          y={0}
          width={atlas.width()}
          height={atlas.height()}
          fit="fill"
        />
      </Group>
    </Group>
  );
}
