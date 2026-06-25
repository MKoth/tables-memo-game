import React, { useMemo } from 'react';
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

/**
 * Sprites are minified hard (256px source → ≤115px on screen), so trilinear
 * mipmapping is both cheaper to sample and removes shimmer versus plain bilinear.
 */
const SPRITE_SAMPLING = {
  filter: FilterMode.Linear,
  mipmap: MipmapMode.Linear,
} as const;

export type JellyfishInstanceProps = {
  bellImage: SkImage;
  tentacleImage: SkImage;
  layoutX: SharedValue<number[]>;
  layoutY: SharedValue<number[]>;
  layoutScale: SharedValue<number[]>;
  layoutIndex: number;
  /** Submerge depth 0..1; modulates opacity and fog. Default 0 (fully visible). */
  depth?: SharedValue<number>;
  /** Bell square size in px; tentacles are scaled relative to this. */
  bellSize: number;
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
  tiltAngle: SharedValue<number>;
  /** Lean amplitude in UV units: bell center leans toward tiltAngle, tentacles trail opposite. */
  tiltAmp: SharedValue<number>;
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
  layoutX,
  layoutY,
  layoutScale,
  layoutIndex,
  depth,
  bellSize,
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
  tiltAngle,
  tiltAmp,
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
  const tintAUniform = useMemo(
    () => [tintA[0], tintA[1], tintA[2]] as [number, number, number],
    [tintA],
  );
  const tintBUniform = useMemo(
    () => [tintB[0], tintB[1], tintB[2]] as [number, number, number],
    [tintB],
  );
  const tintCUniform = useMemo(
    () => [tintC[0], tintC[1], tintC[2]] as [number, number, number],
    [tintC],
  );

  const uniforms = useDerivedValue(() => {
    const scale = layoutScale.value[layoutIndex] ?? 1;
    const cx = layoutX.value[layoutIndex] ?? 0;
    const cy = layoutY.value[layoutIndex] ?? 0;
    const tentacleSize = tentacleBaseSize * scale;
    const bellSizePx = bellSize * scale;
    const tentacleX = cx - tentacleSize / 2;
    const tentacleY = cy - tentacleSize / 2;
    const bellX = cx - bellSizePx / 2;
    const bellY = cy - bellSizePx / 2;

    const d = depth?.value ?? 0;
    const depthFade = 1 - d * 0.7;
    const tiltAngleVal = tiltAngle.value;
    const tiltAmpVal = tiltAmp.value;

    return {
      tentacleX,
      tentacleY,
      tentacleW: tentacleSize,
      tentacleH: tentacleSize,
      bellX,
      bellY,
      bellW: bellSizePx,
      bellH: bellSizePx,
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
      tiltDirX: Math.cos(tiltAngleVal),
      tiltDirY: Math.sin(tiltAngleVal),
      tentacleSwirlAmp,
      tentacleContractShrink: tentacleRetract,
      tentacleWobbleAmp,
      tentacleOpacity: tentacleOpacity * depthFade,
      tentacleTiltBodyShift: -tiltAmpVal * tentacleTiltShiftRatio,
      tentacleTiltLen: tiltAmpVal * tentacleTiltLenRatio,
      bellDensityGamma,
      bellRimWidth,
      bellRimStrength,
      bellWobbleAmp,
      bellOpacity: bellOpacity * depthFade,
      bellTiltCenterShift: tiltAmpVal,
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

  const tentacleX = useDerivedValue(() => uniforms.value.tentacleX);
  const tentacleY = useDerivedValue(() => uniforms.value.tentacleY);
  const tentacleSize = useDerivedValue(() => uniforms.value.tentacleW);
  const bellX = useDerivedValue(() => uniforms.value.bellX);
  const bellY = useDerivedValue(() => uniforms.value.bellY);
  const bellSizePx = useDerivedValue(() => uniforms.value.bellW);

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
          sampling={SPRITE_SAMPLING}
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
          sampling={SPRITE_SAMPLING}
        />
      </Shader>
    </Rect>
  );
}
