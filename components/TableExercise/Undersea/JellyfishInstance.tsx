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

const {
  shadowColor: defaultShadowColor,
  shadowOpacity: defaultShadowOpacity,
  shadowSoftness: defaultShadowSoftness,
} = jellyfishDeformUniformDefaults;

type JellyfishDeformPassProps = {
  image: SkImage;
  /** Centered square size in px. */
  size: number;
  /** Sprite center on screen. */
  centerX: number;
  centerY: number;
  centerXOffset: number;
  centerYOffset: number;
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
  tiltAngle: number;
  tiltCenterShift: number;
  tiltBodyShift: number;
  tiltLen: number;
  tiltEgg: number;
  renderMode: number;
  shadowColor: readonly [number, number, number];
  shadowOpacity: number;
  shadowSoftness: number;
  clock: SharedValue<number>;
};

function JellyfishDeformPass({
  image,
  size,
  centerX,
  centerY,
  centerXOffset,
  centerYOffset,
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
  renderMode,
  shadowColor,
  shadowOpacity,
  shadowSoftness,
  clock,
}: JellyfishDeformPassProps) {
  const penumbraPx = renderMode > 0.5 ? shadowSoftness * size * 0.8 : 0;
  const effectiveCenterX = centerX + centerXOffset;
  const effectiveCenterY = centerY + centerYOffset;
  const jellyX = effectiveCenterX - size / 2;
  const jellyY = effectiveCenterY - size / 2;
  const rectX = jellyX - penumbraPx;
  const rectY = jellyY - penumbraPx;
  const rectSize = size + penumbraPx * 2;
  const shadowColorUniform = [...shadowColor] as [number, number, number];

  const uniforms = useDerivedValue(() => ({
    jellyX,
    jellyY,
    jellyW: size,
    jellyH: size,
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
    opacity,
    tiltAngle,
    tiltCenterShift,
    tiltBodyShift,
    tiltLen,
    tiltEgg,
    renderMode,
    shadowColor: shadowColorUniform,
    shadowOpacity,
    shadowSoftness,
  }));

  return (
    <Rect x={rectX} y={rectY} width={rectSize} height={rectSize}>
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
  centerX: number;
  centerY: number;
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
  tiltAngle?: number;
  /** Lean amplitude in UV units: bell center leans toward tiltAngle, tentacles trail opposite. */
  tiltAmp?: number;
  /** Tentacle body slide as a multiple of tiltAmp (opposite direction). */
  tentacleTiltShiftRatio?: number;
  /** Tentacle length asymmetry as a multiple of tiltAmp. */
  tentacleTiltLenRatio?: number;
  /** Egg silhouette warp on the bell: 0 = circle, ~0.4 = blunt back arc, rounded front dome. */
  bellTiltEgg?: number;
  clock: SharedValue<number>;
};

type JellyfishRenderProps = JellyfishInstanceProps & {
  centerXOffset: number;
  centerYOffset: number;
  renderMode: number;
  shadowColor: readonly [number, number, number];
  shadowOpacity: number;
  shadowSoftness: number;
};

function JellyfishRender({
  bellImage,
  tentacleImage,
  centerX,
  centerY,
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
  tiltAngle = jellyfishDeformUniformDefaults.tiltAngle,
  tiltAmp = 0,
  tentacleTiltShiftRatio = 1,
  tentacleTiltLenRatio = 3,
  bellTiltEgg = 0,
  clock,
  centerXOffset,
  centerYOffset,
  renderMode,
  shadowColor,
  shadowOpacity,
  shadowSoftness,
}: JellyfishRenderProps) {
  const tentacleSize = bellSize * tentacleSizeRatio;
  const tentacleBodyShift = -tiltAmp * tentacleTiltShiftRatio;
  const tentacleLen = tiltAmp * tentacleTiltLenRatio;
  const isShadow = renderMode > 0.5;
  const passProps = {
    centerX,
    centerY,
    centerXOffset,
    centerYOffset,
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
    tiltAngle,
    renderMode,
    shadowColor,
    shadowOpacity,
    shadowSoftness,
    clock,
  };

  return (
    <>
      {!isShadow && (
        <JellyfishDeformPass
          image={tentacleImage}
          size={tentacleSize}
          swirlAmp={tentacleSwirlAmp}
          swirlFreq={tentacleSwirlFreq}
          densityGamma={1}
          contractShrink={tentacleRetract}
          rimWidth={0}
          rimStrength={0}
          wobbleAmp={tentacleWobbleAmp}
          opacity={tentacleOpacity}
          tiltCenterShift={0}
          tiltBodyShift={tentacleBodyShift}
          tiltLen={tentacleLen}
          tiltEgg={0}
          {...passProps}
        />
      )}
      <JellyfishDeformPass
        image={bellImage}
        size={bellSize}
        swirlAmp={0}
        swirlFreq={tentacleSwirlFreq}
        densityGamma={bellDensityGamma}
        contractShrink={0}
        rimWidth={bellRimWidth}
        rimStrength={bellRimStrength}
        wobbleAmp={bellWobbleAmp}
        opacity={bellOpacity}
        tiltCenterShift={tiltAmp}
        tiltBodyShift={0}
        tiltLen={0}
        tiltEgg={bellTiltEgg}
        {...passProps}
      />
    </>
  );
}

export function JellyfishInstance(props: JellyfishInstanceProps) {
  return (
    <JellyfishRender
      {...props}
      centerXOffset={0}
      centerYOffset={0}
      renderMode={0}
      shadowColor={defaultShadowColor}
      shadowOpacity={defaultShadowOpacity}
      shadowSoftness={0}
    />
  );
}

export type JellyfishShadowInstanceProps = JellyfishInstanceProps & {
  offsetX: number;
  offsetY: number;
  shadowColor?: readonly [number, number, number];
  shadowOpacity?: number;
  shadowSoftness?: number;
};

export function JellyfishShadowInstance({
  offsetX,
  offsetY,
  shadowColor = defaultShadowColor,
  shadowOpacity = defaultShadowOpacity,
  shadowSoftness = defaultShadowSoftness,
  ...props
}: JellyfishShadowInstanceProps) {
  return (
    <JellyfishRender
      {...props}
      centerXOffset={offsetX}
      centerYOffset={offsetY}
      renderMode={1}
      shadowColor={shadowColor}
      shadowOpacity={shadowOpacity}
      shadowSoftness={shadowSoftness}
    />
  );
}
