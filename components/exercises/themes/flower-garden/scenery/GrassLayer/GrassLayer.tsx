import React, { useMemo } from 'react';
import { StyleSheet, useWindowDimensions } from 'react-native';
import {
  Atlas,
  Canvas,
  Skia,
  type SkRSXform,
  type SkRect,
} from '@shopify/react-native-skia';
import { useFlowerGardenAssetsContext } from '../../core/providers/FlowerGardenAssetsProvider';
import { useGrassConfigs } from './useGrassConfigs';
import { DEFAULT_GRASS_CONFIG_PARAMS } from './types';
import type { GrassClusterConfig } from './types';

const ELEMENT_SPREAD_PX = 3;

type SpriteRect = { x: number; y: number; width: number; height: number };

function buildSpriteData(
  configs: GrassClusterConfig[],
  spriteRects: SpriteRect[],
): { sprites: SkRect[]; transforms: SkRSXform[] } {
  const { skewIntensity } = DEFAULT_GRASS_CONFIG_PARAMS;
  const sprites: SkRect[] = [];
  const transforms: SkRSXform[] = [];

  for (const cluster of configs) {
    for (let j = 0; j < cluster.elements.length; j++) {
      const element = cluster.elements[j]!;
      const rect = spriteRects[element.imageVariant];
      if (rect == null) continue;

      const sw = rect.width;
      const sh = rect.height;
      const naturalSize = sw > sh ? sw : sh;
      const scale = element.size / naturalSize;
      const angle = element.inclineAngle;
      const spreadDist = (j + 1) * ELEMENT_SPREAD_PX;

      const cosA = Math.cos(angle);
      const sinA = Math.sin(angle);

      const elementX = cluster.clusterX + cosA * spreadDist;
      const elementY = cluster.clusterY + sinA * spreadDist;

      const pivotX = sw / 2;
      const pivotY = sh;

      const skewScale = 1 + skewIntensity;
      const scos = scale * skewScale * cosA;
      const ssin = scale * sinA;

      const tx = elementX - scos * pivotX + ssin * pivotY;
      const ty = elementY - ssin * pivotX - scos * pivotY;

      sprites.push(Skia.XYWHRect(rect.x, rect.y, sw, sh));
      transforms.push(Skia.RSXform(scos, ssin, tx, ty));
    }
  }

  return { sprites, transforms };
}

function GrassLayerImpl() {
  const { width, height } = useWindowDimensions();
  const { images } = useFlowerGardenAssetsContext();
  const grassConfigs = useGrassConfigs();

  const atlasImage = images.grassAtlasImage;
  const spriteRects = images.grassSpriteRects;

  const spriteData = useMemo(() => {
    if (atlasImage == null || spriteRects == null || grassConfigs.length === 0) {
      return null;
    }
    return buildSpriteData(grassConfigs, spriteRects);
  }, [atlasImage, spriteRects, grassConfigs]);

  if (width === 0 || height === 0) return null;
  if (spriteData == null || atlasImage == null) return null;

  return (
    <Canvas style={styles.canvas} pointerEvents="none">
      <Atlas
        image={atlasImage}
        sprites={spriteData.sprites}
        transforms={spriteData.transforms}
      />
    </Canvas>
  );
}

export const GrassLayer = React.memo(GrassLayerImpl);

const styles = StyleSheet.create({
  canvas: {
    position: 'absolute',
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
  },
});
