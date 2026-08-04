import React from 'react';
import { ImageShader, Rect, Shader, Skia, type SkImage, type SkRuntimeEffect } from '@shopify/react-native-skia';
import { useDerivedValue, type SharedValue } from 'react-native-reanimated';
import {
  ATLAS_SPRITE_SAMPLING,
  ATLAS_SPRITE_SKSL,
} from '../shaders/atlasSprite.sksl';
import { ATLAS_PADDING_PX, type AtlasRegion } from '../core/assets/textureAtlas/packTextureAtlas';

function compileAtlasSpriteEffect(): SkRuntimeEffect {
  const effect = Skia.RuntimeEffect.Make(ATLAS_SPRITE_SKSL);
  if (!effect) {
    throw new Error('Failed to compile atlas sprite shader');
  }
  return effect;
}

const atlasSpriteEffect = compileAtlasSpriteEffect();

type AtlasSize = number | SharedValue<number>;
type AtlasRegionValue = AtlasRegion | SharedValue<AtlasRegion | null>;

export function AtlasSprite({
  atlas,
  region,
  width,
  height,
}: {
  atlas: SkImage | null;
  region: AtlasRegionValue;
  width: AtlasSize;
  height: AtlasSize;
}) {
  const uniforms = useDerivedValue(() => {
    const regionValue =
      region != null && typeof region === 'object' && 'value' in region
        ? region.value
        : region;
    const w = typeof width === 'number' ? width : width.value;
    const h = typeof height === 'number' ? height : height.value;
    if (regionValue == null || w <= 0 || h <= 0) {
      return { region: [0, 0, 0, 0], destSize: [0, 0], padding: ATLAS_PADDING_PX };
    }
    return {
      region: [regionValue.x, regionValue.y, regionValue.width, regionValue.height],
      destSize: [w, h],
      padding: ATLAS_PADDING_PX,
    };
  }, [region, width, height]);

  if (atlas == null) {
    return null;
  }

  const atlasWidth = atlas.width();
  const atlasHeight = atlas.height();

  return (
    <Rect x={0} y={0} width={width} height={height}>
      <Shader source={atlasSpriteEffect} uniforms={uniforms}>
        <ImageShader
          image={atlas}
          x={0}
          y={0}
          width={atlasWidth}
          height={atlasHeight}
          fit="fill"
          tx="clamp"
          ty="clamp"
          sampling={ATLAS_SPRITE_SAMPLING}
        />
      </Shader>
    </Rect>
  );
}
