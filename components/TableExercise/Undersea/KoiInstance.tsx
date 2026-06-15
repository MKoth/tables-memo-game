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
  KOI_FISH_DEFORM_SKSL,
  koiFishDeformUniformDefaults,
} from '../../../shaders/koiFishDeform.sksl';

function compileKoiEffect(): SkRuntimeEffect {
  const effect = Skia.RuntimeEffect.Make(KOI_FISH_DEFORM_SKSL);
  if (!effect) {
    throw new Error('Failed to compile koi fish deform shader');
  }
  return effect;
}

const koiEffect = compileKoiEffect();

export type KoiFishState = {
  x: SharedValue<number>;
  y: SharedValue<number>;
  angle: SharedValue<number>;
  amplitude: SharedValue<number>;
  turnArc: SharedValue<number>;
  wavePhase: SharedValue<number>;
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

export type KoiInstanceProps = {
  image: SkImage;
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
};

export function KoiInstance({
  image,
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
}: KoiInstanceProps) {
  const imageWidth = image.width();
  const imageHeight = image.height();

  const uniforms = useDerivedValue(() => {
    const turnT = Math.abs(state.turnArc.value);
    const fishWAdj = fishW / (1 + turnT * turnDistort.squashGain);
    const fishHAdj = fishH * (1 + turnT * turnDistort.bulgeGain);

    return {
    swimZoneX,
    swimZoneY,
    swimZoneW,
    swimZoneH,
    fishX: state.x.value,
    fishY: state.y.value,
    fishW: fishWAdj,
    fishH: fishHAdj,
    fishAngle: state.angle.value,
    sourceAngle,
    waveAmplitude: state.amplitude.value,
    tailBendScale: tailFlex.tailBendScale,
    tailTipBendScale: tailFlex.tailTipBendScale,
    headBendScale: tailFlex.headBendScale,
    wavePhase: state.wavePhase.value,
    phase,
    turnArc: state.turnArc.value,
    imageWidth,
    imageHeight,
  };
  });

  return (
    <Rect x={swimZoneX} y={swimZoneY} width={swimZoneW} height={swimZoneH}>
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
      </Shader>
    </Rect>
  );
}
