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
  KOI_BODY_FIT_SCALE,
  KOI_FIN_OUTER,
  KOI_FISH_DEFORM_SKSL,
  koiFishDeformUniformDefaults,
} from '../../../../shaders/koiFishDeform.sksl';
import { RENDER_BOUNDS_MARGIN } from './config/koiInstanceConfig';

function compileKoiEffect(): SkRuntimeEffect {
  const effect = Skia.RuntimeEffect.Make(KOI_FISH_DEFORM_SKSL);
  if (!effect) {
    throw new Error('Failed to compile koi fish deform shader');
  }
  return effect;
}

const koiEffect = compileKoiEffect();

const {
  shadowColor: defaultShadowColor,
  shadowOpacity: defaultShadowOpacity,
  shadowSoftness: defaultShadowSoftness,
} = koiFishDeformUniformDefaults;

export type KoiFishState = {
  x: SharedValue<number>;
  y: SharedValue<number>;
  angle: SharedValue<number>;
  amplitude: SharedValue<number>;
  turnArc: SharedValue<number>;
  wavePhase: SharedValue<number>;
  finSquashLeft: SharedValue<number>;
  finSquashRight: SharedValue<number>;
  finVariantLeft: SharedValue<number>;
  finVariantRight: SharedValue<number>;
};

export type KoiTailFlexSettings = {
  tailBendScale: number;
  tailTipBendScale: number;
  headBendScale: number;
};

export type KoiTurnDistortSettings = {
  squashGain: number;
  bulgeGain: number;
};

type KoiRenderBaseProps = {
  image: SkImage;
  maskImage: SkImage;
  overlayMaskImage: SkImage;
  spotColor: readonly [number, number, number];
  bodyColor: readonly [number, number, number];
  bodyTintStrength: number;
  overlayColor: readonly [number, number, number];
  overlayStrength: number;
  swimZoneX: number;
  swimZoneY: number;
  swimZoneW: number;
  swimZoneH: number;
  fishW: number;
  fishH: number;
  sourceAngle?: number;
  tailFlex: KoiTailFlexSettings;
  turnDistort: KoiTurnDistortSettings;
  phase: number;
  state: KoiFishState;
  /** Multiplier applied to fishW/fishH each frame (e.g. bubble capture scale). */
  fishWScale?: SharedValue<number>;
  /** When true, render bounds follow the fish anywhere on screen (escape mode). */
  freeBounds?: SharedValue<boolean>;
};

export type KoiInstanceProps = KoiRenderBaseProps;

function readAnimNumber(value: number | SharedValue<number> | undefined, fallback = 0): number {
  'worklet';
  if (value == null) {
    return fallback;
  }
  if (typeof value === 'number') {
    return value;
  }
  return value.value;
}

type KoiBounds = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type KoiUniforms = {
  swimZoneX: number;
  swimZoneY: number;
  swimZoneW: number;
  swimZoneH: number;
  fishX: number;
  fishY: number;
  fishW: number;
  fishH: number;
  fishAngle: number;
  sourceAngle: number;
  waveAmplitude: number;
  tailBendScale: number;
  tailTipBendScale: number;
  headBendScale: number;
  wavePhase: number;
  phase: number;
  turnArc: number;
  finSquashLeft: number;
  finSquashRight: number;
  finVariantLeft: number;
  finVariantRight: number;
  imageWidth: number;
  imageHeight: number;
  renderMode: number;
  shadowColor: [number, number, number];
  shadowOpacity: number;
  shadowSoftness: number;
  spotColor: [number, number, number];
  bodyColor: [number, number, number];
  bodyTintStrength: number;
  overlayColor: [number, number, number];
  overlayStrength: number;
};

function computeKoiBounds(
  swimZoneX: number,
  swimZoneY: number,
  swimZoneW: number,
  swimZoneH: number,
  fishW: number,
  fishH: number,
  tailBendScale: number,
  tailTipBendScale: number,
  headBendScale: number,
  squashGain: number,
  bulgeGain: number,
  state: KoiFishState,
  centerX: number,
  centerY: number,
  margin: number,
  penumbraPx: number,
  clampToSwimZone: boolean,
): KoiBounds {
  'worklet';
  const turnT = Math.abs(state.turnArc.value);
  const fishWAdj = fishW / (1 + turnT * squashGain);
  const fishHAdj = fishH * (1 + turnT * bulgeGain);
  const maxWaveDisp =
    Math.abs(state.amplitude.value) * (tailBendScale + tailTipBendScale + headBendScale);
  const bendMargin = Math.abs(state.turnArc.value) + maxWaveDisp;
  const basePerpExtent = 0.5 / KOI_BODY_FIT_SCALE;
  const perpLimit = Math.max(basePerpExtent, 0.5 + bendMargin);
  const halfAlong = fishWAdj * 0.5;
  const halfPerp = fishHAdj * Math.max(perpLimit, KOI_FIN_OUTER + 0.02);
  const angle = state.angle.value;
  const cosA = Math.abs(Math.cos(angle));
  const sinA = Math.abs(Math.sin(angle));
  const halfW = halfAlong * cosA + halfPerp * sinA;
  const halfH = halfAlong * sinA + halfPerp * cosA;
  const totalMargin = margin + penumbraPx;

  if (!clampToSwimZone) {
    const pad = halfW + totalMargin;
    const padY = halfH + totalMargin;
    return {
      x: centerX - pad,
      y: centerY - padY,
      width: Math.max(1, pad * 2),
      height: Math.max(1, padY * 2),
    };
  }

  const minX = Math.max(swimZoneX, centerX - halfW - totalMargin);
  const minY = Math.max(swimZoneY, centerY - halfH - totalMargin);
  const maxX = Math.min(swimZoneX + swimZoneW, centerX + halfW + totalMargin);
  const maxY = Math.min(swimZoneY + swimZoneH, centerY + halfH + totalMargin);

  return {
    x: minX,
    y: minY,
    width: Math.max(1, maxX - minX),
    height: Math.max(1, maxY - minY),
  };
}

function buildKoiUniforms(
  swimZoneX: number,
  swimZoneY: number,
  swimZoneW: number,
  swimZoneH: number,
  fishW: number,
  fishH: number,
  sourceAngle: number,
  tailBendScale: number,
  tailTipBendScale: number,
  headBendScale: number,
  squashGain: number,
  bulgeGain: number,
  phase: number,
  state: KoiFishState,
  imageWidth: number,
  imageHeight: number,
  fishX: number,
  fishY: number,
  renderMode: number,
  shadowColor: [number, number, number],
  shadowOpacity: number,
  shadowSoftness: number,
  spotColor: [number, number, number],
  bodyColor: [number, number, number],
  bodyTintStrength: number,
  overlayColor: [number, number, number],
  overlayStrength: number,
): KoiUniforms {
  'worklet';
  const turnT = Math.abs(state.turnArc.value);
  const fishWAdj = fishW / (1 + turnT * squashGain);
  const fishHAdj = fishH * (1 + turnT * bulgeGain);

  return {
    swimZoneX,
    swimZoneY,
    swimZoneW,
    swimZoneH,
    fishX,
    fishY,
    fishW: fishWAdj,
    fishH: fishHAdj,
    fishAngle: state.angle.value,
    sourceAngle,
    waveAmplitude: state.amplitude.value,
    tailBendScale,
    tailTipBendScale,
    headBendScale,
    wavePhase: state.wavePhase.value,
    phase,
    turnArc: state.turnArc.value,
    finSquashLeft: state.finSquashLeft.value,
    finSquashRight: state.finSquashRight.value,
    finVariantLeft: state.finVariantLeft.value,
    finVariantRight: state.finVariantRight.value,
    imageWidth,
    imageHeight,
    renderMode,
    shadowColor,
    shadowOpacity,
    shadowSoftness,
    spotColor,
    bodyColor,
    bodyTintStrength,
    overlayColor,
    overlayStrength,
  };
}

type KoiShaderRectProps = KoiRenderBaseProps & {
  centerXOffset?: number | SharedValue<number>;
  centerYOffset?: number | SharedValue<number>;
  renderMode: number;
  shadowColor: readonly [number, number, number];
  shadowOpacity: number;
  shadowSoftness: number;
};

function KoiShaderRect({
  image,
  maskImage,
  overlayMaskImage,
  spotColor,
  bodyColor,
  bodyTintStrength,
  overlayColor,
  overlayStrength,
  swimZoneX,
  swimZoneY,
  swimZoneW,
  swimZoneH,
  fishW,
  fishH,
  sourceAngle = koiFishDeformUniformDefaults.sourceAngle,
  tailFlex,
  turnDistort,
  phase,
  state,
  fishWScale,
  freeBounds,
  centerXOffset = 0,
  centerYOffset = 0,
  renderMode,
  shadowColor,
  shadowOpacity,
  shadowSoftness,
}: KoiShaderRectProps) {
  const imageWidth = image.width();
  const imageHeight = image.height();
  const maskWidth = maskImage.width();
  const maskHeight = maskImage.height();
  const overlayMaskWidth = overlayMaskImage.width();
  const overlayMaskHeight = overlayMaskImage.height();
  const shadowColorUniform = [...shadowColor] as [number, number, number];
  const spotColorUniform = [...spotColor] as [number, number, number];
  const bodyColorUniform = [...bodyColor] as [number, number, number];
  const overlayColorUniform = [...overlayColor] as [number, number, number];

  const bounds = useDerivedValue(() => {
    const scale = fishWScale?.value ?? 1;
    const scaledFishW = fishW * scale;
    const scaledFishH = fishH * scale;
    const centerX = state.x.value + readAnimNumber(centerXOffset);
    const centerY = state.y.value + readAnimNumber(centerYOffset);
    const turnT = Math.abs(state.turnArc.value);
    const fishHAdj = scaledFishH * (1 + turnT * turnDistort.bulgeGain);
    const penumbraPx = renderMode > 0.5 ? shadowSoftness * fishHAdj * 0.8 : 0;
    return computeKoiBounds(
      swimZoneX,
      swimZoneY,
      swimZoneW,
      swimZoneH,
      scaledFishW,
      scaledFishH,
      tailFlex.tailBendScale,
      tailFlex.tailTipBendScale,
      tailFlex.headBendScale,
      turnDistort.squashGain,
      turnDistort.bulgeGain,
      state,
      centerX,
      centerY,
      RENDER_BOUNDS_MARGIN,
      penumbraPx,
      !(freeBounds?.value ?? false),
    );
  });

  const uniforms = useDerivedValue(() => {
    const scale = fishWScale?.value ?? 1;
    const scaledFishW = fishW * scale;
    const scaledFishH = fishH * scale;
    return buildKoiUniforms(
      swimZoneX,
      swimZoneY,
      swimZoneW,
      swimZoneH,
      scaledFishW,
      scaledFishH,
      sourceAngle,
      tailFlex.tailBendScale,
      tailFlex.tailTipBendScale,
      tailFlex.headBendScale,
      turnDistort.squashGain,
      turnDistort.bulgeGain,
      phase,
      state,
      imageWidth,
      imageHeight,
      state.x.value + readAnimNumber(centerXOffset),
      state.y.value + readAnimNumber(centerYOffset),
      renderMode,
      shadowColorUniform,
      shadowOpacity,
      shadowSoftness,
      spotColorUniform,
      bodyColorUniform,
      bodyTintStrength,
      overlayColorUniform,
      overlayStrength,
    );
  });

  return (
    <Rect rect={bounds}>
      <Shader source={koiEffect} uniforms={uniforms}>
        <ImageShader
          image={image}
          x={0}
          y={0}
          width={imageWidth}
          height={imageHeight}
          fit="fill"
          tx="clamp"
          ty="clamp"
        />
        <ImageShader
          image={maskImage}
          x={0}
          y={0}
          width={maskWidth}
          height={maskHeight}
          fit="fill"
          tx="clamp"
          ty="clamp"
        />
        <ImageShader
          image={overlayMaskImage}
          x={0}
          y={0}
          width={overlayMaskWidth}
          height={overlayMaskHeight}
          fit="fill"
          tx="clamp"
          ty="clamp"
        />
      </Shader>
    </Rect>
  );
}

export function KoiInstance(props: KoiInstanceProps) {
  return (
    <KoiShaderRect
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

export type KoiShadowInstanceProps = KoiRenderBaseProps & {
  offsetX?: number | SharedValue<number>;
  offsetY?: number | SharedValue<number>;
  shadowColor?: readonly [number, number, number];
  shadowOpacity?: number;
  shadowSoftness?: number;
};

export function KoiShadowInstance({
  offsetX = 0,
  offsetY = 0,
  shadowColor = defaultShadowColor,
  shadowOpacity = defaultShadowOpacity,
  shadowSoftness = defaultShadowSoftness,
  ...props
}: KoiShadowInstanceProps) {
  return (
    <KoiShaderRect
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
