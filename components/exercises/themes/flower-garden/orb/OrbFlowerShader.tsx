import React from 'react';
import {
  FilterMode,
  ImageShader,
  MipmapMode,
  Rect,
  Shader,
  Skia,
  type SkImage,
  type SkRuntimeEffect,
} from '@shopify/react-native-skia';
import { useDerivedValue, type SharedValue } from 'react-native-reanimated';
import {
  ORB_FLOWER_VARIANT_COUNT,
  ORB_RING_BURST_SCALE,
  ORB_RING_ENTER_SCALE,
  type OrbFlowerPreset,
} from './orbAnimPresets';
import type { OrbAnimState } from './orbAnimTypes';
import { ORB_FLOWER_SKSL } from './orbFlowerShader.sksl';

function compileOrbFlowerEffect(): SkRuntimeEffect {
  const effect = Skia.RuntimeEffect.Make(ORB_FLOWER_SKSL);
  if (!effect) {
    throw new Error('Failed to compile orb flower shader');
  }
  return effect;
}

const orbFlowerEffect = compileOrbFlowerEffect();

const SPRITE_SAMPLING = {
  filter: FilterMode.Linear,
  mipmap: MipmapMode.Linear,
} as const;

/** Covers the ring at its biggest enter/burst scale. */
const ORB_RECT_PADDING = 24;

export type OrbFlowerShaderProps = {
  anim: SharedValue<OrbAnimState>;
  /** Per-orb seed picking the ring/bed variant of the shader. */
  seed: number;
  targetDiameter: number;
  preset: OrbFlowerPreset;
  ringVariants: ReadonlyArray<SkImage | null>;
  bedVariants: ReadonlyArray<SkImage | null>;
};

export function OrbFlowerShader({
  anim,
  seed,
  targetDiameter,
  preset,
  ringVariants,
  bedVariants,
}: OrbFlowerShaderProps) {
  const ringVariantCount = Math.max(1, ringVariants.length);
  const bedVariantCount = Math.max(1, bedVariants.length);
  const ringImage = ringVariants[seed % ringVariantCount] ?? null;
  const bedImage =
    bedVariants[Math.floor(seed / ORB_FLOWER_VARIANT_COUNT) % bedVariantCount] ??
    null;

  const maxSpriteDiameter =
    Math.max(preset.ringDiameterFraction, preset.bedDiameterFraction) *
    targetDiameter *
    0.5;

  const bounds = useDerivedValue(() => {
    const { centerX, centerY } = anim.value;
    const margin =
      maxSpriteDiameter * Math.max(ORB_RING_ENTER_SCALE, ORB_RING_BURST_SCALE) +
      ORB_RECT_PADDING;
    return Skia.XYWHRect(centerX - margin, centerY - margin, margin * 2, margin * 2);
  });

  const uniforms = useDerivedValue(() => {
    const a = anim.value;
    return {
      centerX: a.centerX,
      centerY: a.centerY,
      ringDiameter: preset.ringDiameterFraction * targetDiameter,
      bedDiameter: preset.bedDiameterFraction * targetDiameter,
      ringSizePx: ringImage == null ? 0 : ringImage.width(),
      bedSizePx: bedImage == null ? 0 : bedImage.width(),
      rotationSpeed: preset.rotationSpeed,
      rotationTimeSec: a.idleElapsedMs / 1000,
      enterT: a.enterT,
      burstT: a.burstT,
      overallOpacity: a.overallOpacity,
      tintR: a.tintR,
      tintG: a.tintG,
      tintB: a.tintB,
      tintStrength: a.tintStrength,
    };
  });

  if (targetDiameter <= 0 || ringImage == null || bedImage == null) {
    return null;
  }

  return (
    <Rect rect={bounds}>
      <Shader source={orbFlowerEffect} uniforms={uniforms}>
        <ImageShader
          image={ringImage}
          x={0}
          y={0}
          width={ringImage.width()}
          height={ringImage.height()}
          fit="fill"
          tx="clamp"
          ty="clamp"
          sampling={SPRITE_SAMPLING}
        />
        <ImageShader
          image={bedImage}
          x={0}
          y={0}
          width={bedImage.width()}
          height={bedImage.height()}
          fit="fill"
          tx="clamp"
          ty="clamp"
          sampling={SPRITE_SAMPLING}
        />
      </Shader>
    </Rect>
  );
}
