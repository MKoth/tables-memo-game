import {
  KOI_BODY_FIT_SCALE,
  KOI_FIN_OUTER,
} from '../../../shaders/koiFishDeform.sksl';
import type { RoamerBounds, RoamerFishState, RoamerUniforms } from './roamerInstanceTypes';

export function readAnimNumber(value: number | import('react-native-reanimated').SharedValue<number> | undefined, fallback = 0): number {
  'worklet';
  if (value == null) {
    return fallback;
  }
  if (typeof value === 'number') {
    return value;
  }
  return value.value;
}

export function computeRoamerBounds(
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
  state: RoamerFishState,
  centerX: number,
  centerY: number,
  margin: number,
  penumbraPx: number,
  clampToSwimZone: boolean,
): RoamerBounds {
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

export function buildRoamerUniforms(
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
  state: RoamerFishState,
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
): RoamerUniforms {
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
