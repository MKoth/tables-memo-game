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
  const uniforms = useDerivedValue(() => {
    const r = region.value;
    const w = width.value;
    const h = height.value;
    if (r == null || w <= 0 || h <= 0) {
      return { region: [0, 0, 0, 0], destSize: [0, 0], padding: ATLAS_PADDING_PX };
    }
    return {
      region: [r.x, r.y, r.width, r.height],
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
