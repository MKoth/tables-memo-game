import React, { useMemo } from 'react';
import {
  ImageShader,
  Rect,
  Shader,
  Skia,
  type SkImage,
  type SkRuntimeEffect,
} from '@shopify/react-native-skia';
import type { SharedValue } from 'react-native-reanimated';
import { useDerivedValue } from 'react-native-reanimated';
import { JELLYFISH_COMBINED_DEFORM_SKSL } from '../../../shaders/jellyfishCombinedDeform.sksl';
import { jellyfishDeformUniformDefaults } from '../../../shaders/jellyfishDeform.sksl';

function compileJellyfishCombinedEffect(): SkRuntimeEffect {
  const effect = Skia.RuntimeEffect.Make(JELLYFISH_COMBINED_DEFORM_SKSL);
  if (!effect) {
    throw new Error('Failed to compile jellyfish combined deform shader');
  }
  return effect;
}

const jellyfishCombinedEffect = compileJellyfishCombinedEffect();

function toTintUniform(tint: readonly [number, number, number]): [number, number, number] {
  return [tint[0], tint[1], tint[2]];
}

export type JellyfishInstanceProps = {
  bellImage: SkImage;
  tentacleImage: SkImage;
  /** Reactive center — pass a SharedValue so scroll is driven on the UI thread. */
  centerX: SharedValue<number>;
  centerY: SharedValue<number>;
  /** Submerge depth 0..1; modulates opacity and fog. Default 0 (fully visible). */
  depth?: SharedValue<number>;
  /** Bell square size in px; tentacles are scaled relative to this. */
  bellSize: number;
  /** Reactive size multiplier from local spacing (default 1). */
  sizeScale?: number | SharedValue<number>;
  /** Tentacle square size as a multiple of bellSize. */
  tentacleSizeRatio?: number;
  phase?: number;
  pulseSpeed?: number;
  pivotR?: number;
  relaxAmp?: number;
  contractAmp?: number;
  pushDur?: number;
  tentacleSwirlAmp?: number;
  tentacleSwirlFreq?: number;
  swirlSpeed?: number;
  bellDensityGamma?: number;
  tentacleRetract?: number;
  scaleRelax?: number;
  scaleContract?: number;
  bellRimWidth?: number;
  bellRimStrength?: number;
  bellWobbleAmp?: number;
  tentacleWobbleAmp?: number;
  wobbleSpeed?: number;
  wobbleLobes?: number;
  bellOpacity?: number;
  tentacleOpacity?: number;
  /** Lean direction in radians (0 = right, increasing toward down). */
  tiltAngle?: number | SharedValue<number>;
  /** Lean amplitude in UV units: bell center leans toward tiltAngle, tentacles trail opposite. */
  tiltAmp?: number | SharedValue<number>;
  /** Tentacle body slide as a multiple of tiltAmp (opposite direction). */
  tentacleTiltShiftRatio?: number;
  /** Tentacle length asymmetry as a multiple of tiltAmp. */
  tentacleTiltLenRatio?: number;
  /** Egg silhouette warp on the bell: 0 = circle, ~0.4 = blunt back arc, rounded front dome. */
  bellTiltEgg?: number;
  /** 0 = uniform tint, 1 = two-stop radial, 2 = three-stop radial. */
  tintMode?: number;
  tintStrength?: number;
  tintA?: readonly [number, number, number];
  tintB?: readonly [number, number, number];
  tintC?: readonly [number, number, number];
  /** Scroll multicolor bell tint outward (colors expand from center and swap roles). */
  animatedTint?: boolean;
  tintWaveSpeed?: number;
  clock: SharedValue<number>;
};

export function JellyfishInstance({
  bellImage,
  tentacleImage,
  centerX,
  centerY,
  depth,
  bellSize,
  sizeScale = 1,
  tentacleSizeRatio = 1.35,
  phase = jellyfishDeformUniformDefaults.phase,
  pulseSpeed = jellyfishDeformUniformDefaults.pulseSpeed,
  pivotR = jellyfishDeformUniformDefaults.pivotR,
  relaxAmp = jellyfishDeformUniformDefaults.relaxAmp,
  contractAmp = jellyfishDeformUniformDefaults.contractAmp,
  pushDur = jellyfishDeformUniformDefaults.pushDur,
  tentacleSwirlAmp = jellyfishDeformUniformDefaults.swirlAmp,
  tentacleSwirlFreq = jellyfishDeformUniformDefaults.swirlFreq,
  swirlSpeed = jellyfishDeformUniformDefaults.swirlSpeed,
  bellDensityGamma = jellyfishDeformUniformDefaults.densityGamma,
  tentacleRetract = jellyfishDeformUniformDefaults.contractShrink,
  scaleRelax = jellyfishDeformUniformDefaults.scaleRelax,
  scaleContract = jellyfishDeformUniformDefaults.scaleContract,
  bellRimWidth = jellyfishDeformUniformDefaults.rimWidth,
  bellRimStrength = jellyfishDeformUniformDefaults.rimStrength,
  bellWobbleAmp = jellyfishDeformUniformDefaults.wobbleAmp,
  tentacleWobbleAmp = jellyfishDeformUniformDefaults.wobbleAmp * 1.35,
  wobbleSpeed = jellyfishDeformUniformDefaults.wobbleSpeed,
  wobbleLobes = jellyfishDeformUniformDefaults.wobbleLobes,
  bellOpacity = 0.88,
  tentacleOpacity = 0.85,
  tiltAngle = jellyfishDeformUniformDefaults.tiltAngle,
  tiltAmp = 0,
  tentacleTiltShiftRatio = 0.45,
  tentacleTiltLenRatio = 1.8,
  bellTiltEgg = 0,
  tintMode = jellyfishDeformUniformDefaults.tintMode,
  tintStrength = jellyfishDeformUniformDefaults.tintStrength,
  tintA = jellyfishDeformUniformDefaults.tintA,
  tintB = jellyfishDeformUniformDefaults.tintB,
  tintC = jellyfishDeformUniformDefaults.tintC,
  animatedTint = false,
  tintWaveSpeed = jellyfishDeformUniformDefaults.tintWaveSpeed,
  clock,
}: JellyfishInstanceProps) {
  const tentacleBaseSize = bellSize * tentacleSizeRatio;
  const tintAUniform = useMemo(() => toTintUniform(tintA), [tintA]);
  const tintBUniform = useMemo(() => toTintUniform(tintB), [tintB]);
  const tintCUniform = useMemo(() => toTintUniform(tintC), [tintC]);

  const sizeScaleSv = useDerivedValue(() => {
    if (typeof sizeScale === 'number') {
      return sizeScale;
    }
    return sizeScale?.value ?? 1;
  });

  const tiltAngleSv = useDerivedValue(() => {
    if (typeof tiltAngle === 'number') {
      return tiltAngle;
    }
    return tiltAngle?.value ?? jellyfishDeformUniformDefaults.tiltAngle;
  });

  const tiltAmpSv = useDerivedValue(() => {
    if (typeof tiltAmp === 'number') {
      return tiltAmp;
    }
    return tiltAmp?.value ?? 0;
  });

  const tentacleSize = useDerivedValue(() => tentacleBaseSize * sizeScaleSv.value);
  const bellSizePx = useDerivedValue(() => bellSize * sizeScaleSv.value);
  const tentacleX = useDerivedValue(() => centerX.value - tentacleSize.value / 2);
  const tentacleY = useDerivedValue(() => centerY.value - tentacleSize.value / 2);
  const bellX = useDerivedValue(() => centerX.value - bellSizePx.value / 2);
  const bellY = useDerivedValue(() => centerY.value - bellSizePx.value / 2);

  const uniforms = useDerivedValue(() => {
    const d = depth?.value ?? 0;
    const depthFade = 1 - d * 0.7;

    return {
      tentacleX: tentacleX.value,
      tentacleY: tentacleY.value,
      tentacleW: tentacleSize.value,
      tentacleH: tentacleSize.value,
      bellX: bellX.value,
      bellY: bellY.value,
      bellW: bellSizePx.value,
      bellH: bellSizePx.value,
      iTime: clock.value / 1000,
      phase,
      pulseSpeed,
      pivotR,
      relaxAmp,
      contractAmp,
      pushDur,
      swirlFreq: tentacleSwirlFreq,
      swirlSpeed,
      scaleRelax,
      scaleContract,
      wobbleSpeed,
      wobbleLobes,
      tiltAngle: tiltAngleSv.value,
      tentacleSwirlAmp,
      tentacleContractShrink: tentacleRetract,
      tentacleWobbleAmp,
      tentacleOpacity: tentacleOpacity * depthFade,
      tentacleTiltBodyShift: -tiltAmpSv.value * tentacleTiltShiftRatio,
      tentacleTiltLen: tiltAmpSv.value * tentacleTiltLenRatio,
      bellDensityGamma,
      bellRimWidth,
      bellRimStrength,
      bellWobbleAmp,
      bellOpacity: bellOpacity * depthFade,
      bellTiltCenterShift: tiltAmpSv.value,
      bellTiltEgg,
      tintMode,
      tintStrength,
      tintA: tintAUniform,
      tintB: tintBUniform,
      tintC: tintCUniform,
      tintAnimated: animatedTint ? 1 : 0,
      tintWaveSpeed,
    };
  });

  return (
    <Rect x={tentacleX} y={tentacleY} width={tentacleSize} height={tentacleSize}>
      <Shader source={jellyfishCombinedEffect} uniforms={uniforms}>
        <ImageShader
          image={tentacleImage}
          x={tentacleX}
          y={tentacleY}
          width={tentacleSize}
          height={tentacleSize}
          fit="fill"
          tx="clamp"
          ty="clamp"
        />
        <ImageShader
          image={bellImage}
          x={bellX}
          y={bellY}
          width={bellSizePx}
          height={bellSizePx}
          fit="fill"
          tx="clamp"
          ty="clamp"
        />
      </Shader>
    </Rect>
  );
}
