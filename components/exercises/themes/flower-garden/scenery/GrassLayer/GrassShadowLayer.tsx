import React, { useMemo } from 'react';
import { StyleSheet, useWindowDimensions } from 'react-native';
import {
  Atlas,
  BlendColor,
  Canvas,
  Group,
  Skia,
  type SkRSXform,
  type SkRect,
} from '@shopify/react-native-skia';
import { useFlowerGardenAssetsContext } from '../../core/providers/FlowerGardenAssetsProvider';
import { useGrassConfigs } from './useGrassConfigs';
import { packGrassShadowUniforms } from './packGrassShadowUniforms';
import { DEFAULT_GRASS_CONFIG_PARAMS } from './types';
import type { SpriteRect } from './types';

const ELEMENT_SPREAD_PX = 3;

function buildShadowSpriteData(
  configs: ReturnType<typeof useGrassConfigs>,
  spriteRects: SpriteRect[],
  screenWidth: number,
  screenHeight: number,
): { sprites: SkRect[]; transforms: SkRSXform[] } | null {
  const { skewIntensity } = DEFAULT_GRASS_CONFIG_PARAMS;
  const uniforms = packGrassShadowUniforms(
    configs,
    screenWidth,
    screenHeight,
    DEFAULT_GRASS_CONFIG_PARAMS,
  );

  let elementIdx = 0;
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

      const shadowAngle = uniforms.shadowAngles[elementIdx]!;
      const shadowLength = uniforms.shadowLengths[elementIdx]!;

      const offsetX = Math.sin(shadowAngle) * shadowLength;
      const offsetY = Math.cos(shadowAngle) * shadowLength;

      const pivotX = sw / 2;
      const pivotY = sh;

      const skewScale = 1 + skewIntensity;
      const scos = scale * skewScale * cosA;
      const ssin = scale * sinA;

      const tx = elementX - scos * pivotX + ssin * pivotY + offsetX;
      const ty = elementY - ssin * pivotX - scos * pivotY + offsetY;

      sprites.push(Skia.XYWHRect(rect.x, rect.y, sw, sh));
      transforms.push(Skia.RSXform(scos, ssin, tx, ty));

      elementIdx++;
    }
  }

  if (sprites.length === 0) return null;

  return { sprites, transforms };
}

function GrassShadowLayerImpl() {
  const { width, height } = useWindowDimensions();
  const { images } = useFlowerGardenAssetsContext();
  const grassConfigs = useGrassConfigs();

  const atlasImage = images.grassAtlasImage;
  const spriteRects = images.grassSpriteRects;

  const { shadowOpacity } = DEFAULT_GRASS_CONFIG_PARAMS;

  const spriteData = useMemo(() => {
    if (atlasImage == null || spriteRects == null || grassConfigs.length === 0) {
      return null;
    }
    return buildShadowSpriteData(grassConfigs, spriteRects, width, height);
  }, [atlasImage, spriteRects, grassConfigs, width, height]);

  if (width === 0 || height === 0) return null;
  if (spriteData == null || atlasImage == null) return null;

  return (
    <Canvas style={styles.canvas} pointerEvents="none">
      <Group opacity={shadowOpacity}>
        <BlendColor color="black" mode="modulate" />
        <Atlas
          image={atlasImage}
          sprites={spriteData.sprites}
          transforms={spriteData.transforms}
        />
      </Group>
    </Canvas>
  );
}

export const GrassShadowLayer = React.memo(GrassShadowLayerImpl);

const styles = StyleSheet.create({
  canvas: {
    position: 'absolute',
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
  },
});
