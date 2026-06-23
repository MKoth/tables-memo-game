import React from 'react';
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
import {
  JELLYFISH_DEFORM_SKSL,
  jellyfishDeformUniformDefaults,
} from '../../../shaders/jellyfishDeform.sksl';

function compileJellyfishEffect(): SkRuntimeEffect {
  const effect = Skia.RuntimeEffect.Make(JELLYFISH_DEFORM_SKSL);
  if (!effect) {
    throw new Error('Failed to compile jellyfish deform shader');
  }
  return effect;
}

const jellyfishEffect = compileJellyfishEffect();

type JellyfishDeformPassProps = {
  image: SkImage;
  /** Unscaled square size in px. */
  baseSize: number;
  /** Multiplier applied to baseSize (reactive). */
  sizeScale: SharedValue<number>;
  /** Sprite center on screen — reactive SharedValue so scroll doesn't trigger React re-renders. */
  centerX: SharedValue<number>;
  centerY: SharedValue<number>;
  /**
   * Submerge depth: 0 = fully visible front layer, 1 = fully submerged back layer.
   * Continuously drives opacity and a subtle blue-shift of the tint.
   */
  depth?: SharedValue<number>;
  phase: number;
  pulseSpeed: number;
  pivotR: number;
  relaxAmp: number;
  contractAmp: number;
  pushDur: number;
  swirlAmp: number;
  swirlFreq: number;
  swirlSpeed: number;
  densityGamma: number;
  contractShrink: number;
  scaleRelax: number;
  scaleContract: number;
  rimWidth: number;
  rimStrength: number;
  wobbleAmp: number;
  wobbleSpeed: number;
  wobbleLobes: number;
  opacity: number;
  tiltAngle: SharedValue<number>;
  tiltCenterShift: SharedValue<number>;
  tiltBodyShift: SharedValue<number>;
  tiltLen: SharedValue<number>;
  tiltEgg: number;
  tintMode: number;
  tintStrength: number;
  tintA: readonly [number, number, number];
  tintB: readonly [number, number, number];
  tintC: readonly [number, number, number];
  animatedTint: number;
  tintWaveSpeed: number;
  clock: SharedValue<number>;
};

function JellyfishDeformPass({
  image,
  baseSize,
  sizeScale,
  centerX,
  centerY,
  depth,
  phase,
  pulseSpeed,
  pivotR,
  relaxAmp,
  contractAmp,
  pushDur,
  swirlAmp,
  swirlFreq,
  swirlSpeed,
  densityGamma,
  contractShrink,
  scaleRelax,
  scaleContract,
  rimWidth,
  rimStrength,
  wobbleAmp,
  wobbleSpeed,
  wobbleLobes,
  opacity,
  tiltAngle,
  tiltCenterShift,
  tiltBodyShift,
  tiltLen,
  tiltEgg,
  tintMode,
  tintStrength,
  tintA,
  tintB,
  tintC,
  animatedTint,
  tintWaveSpeed,
  clock,
}: JellyfishDeformPassProps) {
  const size = useDerivedValue(() => baseSize * sizeScale.value);
  const half = useDerivedValue(() => size.value / 2);
  const tintAUniform = [...tintA] as [number, number, number];
  const tintBUniform = [...tintB] as [number, number, number];
  const tintCUniform = [...tintC] as [number, number, number];

  // Reactive position: SharedValue so position changes never cause React re-renders.
  const jellyX = useDerivedValue(() => centerX.value - half.value);
  const jellyY = useDerivedValue(() => centerY.value - half.value);

  const uniforms = useDerivedValue(() => {
    const d = depth?.value ?? 0;
    // Fade to ~30 % opacity as the cell submerges; also deepen blue tint slightly.
    const effectiveOpacity = opacity * (1 - d * 0.7);
    const s = size.value;
    const h = s / 2;

    return {
      jellyX: centerX.value - h,
      jellyY: centerY.value - h,
      jellyW: s,
      jellyH: s,
      iTime: clock.value / 1000,
      phase,
      pulseSpeed,
      pivotR,
      relaxAmp,
      contractAmp,
      pushDur,
      swirlAmp,
      swirlFreq,
      swirlSpeed,
      densityGamma,
      contractShrink,
      scaleRelax,
      scaleContract,
      rimWidth,
      rimStrength,
      wobbleAmp,
      wobbleSpeed,
      wobbleLobes,
      opacity: effectiveOpacity,
      tiltAngle: tiltAngle.value,
      tiltCenterShift: tiltCenterShift.value,
      tiltBodyShift: tiltBodyShift.value,
      tiltLen: tiltLen.value,
      tiltEgg,
      tintMode,
      tintStrength,
      tintA: tintAUniform,
      tintB: tintBUniform,
      tintC: tintCUniform,
      tintAnimated: animatedTint,
      tintWaveSpeed,
    };
  });

  return (
    <Rect x={jellyX} y={jellyY} width={size} height={size}>
      <Shader source={jellyfishEffect} uniforms={uniforms}>
        <ImageShader
          image={image}
          x={jellyX}
          y={jellyY}
          width={size}
          height={size}
          fit="fill"
          tx="clamp"
          ty="clamp"
        />
      </Shader>
    </Rect>
  );
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
  tentacleTiltShiftRatio = 1,
  tentacleTiltLenRatio = 3,
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
  const tentacleBodyShift = useDerivedValue(
    () => -tiltAmpSv.value * tentacleTiltShiftRatio,
  );
  const tentacleLen = useDerivedValue(
    () => tiltAmpSv.value * tentacleTiltLenRatio,
  );
  const bellTiltCenterShift = useDerivedValue(() => tiltAmpSv.value);
  const zeroSv = useDerivedValue(() => 0);

  const bellTintProps = {
    tintMode,
    tintStrength,
    tintA,
    tintB,
    tintC,
    animatedTint: animatedTint ? 1 : 0,
    tintWaveSpeed,
  };
  const passProps = {
    centerX,
    centerY,
    depth,
    phase,
    pulseSpeed,
    pivotR,
    relaxAmp,
    contractAmp,
    pushDur,
    swirlSpeed,
    scaleRelax,
    scaleContract,
    wobbleSpeed,
    wobbleLobes,
    clock,
  };

  return (
    <>
      <JellyfishDeformPass
        image={tentacleImage}
        baseSize={bellSize * tentacleSizeRatio}
        sizeScale={sizeScaleSv}
        swirlAmp={tentacleSwirlAmp}
        swirlFreq={tentacleSwirlFreq}
        densityGamma={1}
        contractShrink={tentacleRetract}
        rimWidth={0}
        rimStrength={0}
        wobbleAmp={tentacleWobbleAmp}
        opacity={tentacleOpacity}
        tiltAngle={tiltAngleSv}
        tiltCenterShift={zeroSv}
        tiltBodyShift={tentacleBodyShift}
        tiltLen={tentacleLen}
        tiltEgg={0}
        tintMode={0}
        tintStrength={0}
        tintA={jellyfishDeformUniformDefaults.tintA}
        tintB={jellyfishDeformUniformDefaults.tintB}
        tintC={jellyfishDeformUniformDefaults.tintC}
        animatedTint={0}
        tintWaveSpeed={0}
        {...passProps}
      />
      <JellyfishDeformPass
        image={bellImage}
        baseSize={bellSize}
        sizeScale={sizeScaleSv}
        swirlAmp={0}
        swirlFreq={tentacleSwirlFreq}
        densityGamma={bellDensityGamma}
        contractShrink={0}
        rimWidth={bellRimWidth}
        rimStrength={bellRimStrength}
        wobbleAmp={bellWobbleAmp}
        opacity={bellOpacity}
        tiltAngle={tiltAngleSv}
        tiltCenterShift={bellTiltCenterShift}
        tiltBodyShift={zeroSv}
        tiltLen={zeroSv}
        tiltEgg={bellTiltEgg}
        {...bellTintProps}
        {...passProps}
      />
    </>
  );
}
