import React from 'react';
import {
  Circle,
  Line,
  RadialGradient,
  Rect,
  vec,
} from '@shopify/react-native-skia';
import { useDerivedValue, type SharedValue } from 'react-native-reanimated';
import type {
  JellyfishLayoutBridge,
  KoiFishRuntimePosition,
  KoiSimBridge,
} from '../../../core/types/tutorialTypes';
import {
  FISH_SPOTLIGHT_SCALE,
  GUIDE_LINE_COLOR,
  JELLY_SPOTLIGHT_SCALE,
  OVERLAY_DARK,
  SPOTLIGHT_RING_COLOR,
} from '../constants';

type SpotlightDimProps = {
  width: number;
  height: number;
  gradientRadius: number;
  center: SharedValue<{ x: number; y: number }>;
  holeRadius: SharedValue<number>;
};

function SpotlightDim({
  width,
  height,
  gradientRadius,
  center,
  holeRadius,
}: SpotlightDimProps) {
  const spotlightCenter = useDerivedValue(() =>
    vec(center.value.x, center.value.y),
  );

  const gradientPositions = useDerivedValue(() => {
    const hole = holeRadius.value;
    const innerStop = Math.min(0.22, Math.max(0.025, hole / gradientRadius));
    return [0, innerStop];
  });

  const ringRadius = useDerivedValue(() => holeRadius.value);
  const ringCx = useDerivedValue(() => center.value.x);
  const ringCy = useDerivedValue(() => center.value.y);

  return (
    <>
      <Rect x={0} y={0} width={width} height={height}>
        <RadialGradient
          c={spotlightCenter}
          r={gradientRadius}
          colors={['transparent', OVERLAY_DARK]}
          positions={gradientPositions}
        />
      </Rect>
      <Circle
        cx={ringCx}
        cy={ringCy}
        r={ringRadius}
        color={SPOTLIGHT_RING_COLOR}
        style="stroke"
        strokeWidth={3}
      />
    </>
  );
}

function JellyGuideLines({
  centerX,
  centerY,
  width,
  height,
}: {
  centerX: SharedValue<number>;
  centerY: SharedValue<number>;
  width: number;
  height: number;
}) {
  const hP1 = useDerivedValue(() => vec(0, centerY.value));
  const hP2 = useDerivedValue(() => vec(width, centerY.value));
  const vP1 = useDerivedValue(() => vec(centerX.value, 0));
  const vP2 = useDerivedValue(() => vec(centerX.value, height));

  return (
    <>
      <Line p1={hP1} p2={hP2} color={GUIDE_LINE_COLOR} strokeWidth={2} />
      <Line p1={vP1} p2={vP2} color={GUIDE_LINE_COLOR} strokeWidth={2} />
    </>
  );
}

export function FishSpotlight({
  pos,
  hitRadius,
  width,
  height,
  gradientRadius,
}: {
  pos: KoiFishRuntimePosition;
  hitRadius: number;
  width: number;
  height: number;
  gradientRadius: number;
}) {
  const center = useDerivedValue(() => ({
    x: pos.x.value,
    y: pos.y.value,
  }));
  const holeRadius = useDerivedValue(() => hitRadius * FISH_SPOTLIGHT_SCALE);

  return (
    <SpotlightDim
      width={width}
      height={height}
      gradientRadius={gradientRadius}
      center={center}
      holeRadius={holeRadius}
    />
  );
}

export function JellySpotlight({
  bridge,
  jellyIndex,
  width,
  height,
  gradientRadius,
  showGuideLines = true,
}: {
  bridge: JellyfishLayoutBridge;
  jellyIndex: number;
  width: number;
  height: number;
  gradientRadius: number;
  showGuideLines?: boolean;
}) {
  const center = useDerivedValue(() => ({
    x: bridge.layoutX.value[jellyIndex] ?? width * 0.5,
    y: bridge.layoutY.value[jellyIndex] ?? height * 0.2,
  }));

  const holeRadius = useDerivedValue(() => {
    const scale = bridge.layoutScale.value[jellyIndex] ?? 1;
    const bellSize = bridge.bellSizes[jellyIndex] ?? 55;
    return (bellSize * scale * JELLY_SPOTLIGHT_SCALE) / 2;
  });

  const guideLineX = useDerivedValue(() => center.value.x);
  const guideLineY = useDerivedValue(() => center.value.y);

  return (
    <>
      <SpotlightDim
        width={width}
        height={height}
        gradientRadius={gradientRadius}
        center={center}
        holeRadius={holeRadius}
      />
      {showGuideLines && (
        <JellyGuideLines
          centerX={guideLineX}
          centerY={guideLineY}
          width={width}
          height={height}
        />
      )}
    </>
  );
}

export type TutorialSpotlightOverlayProps = {
  step: 'fish' | 'jellyfish' | 'translate';
  width: number;
  height: number;
  gradientRadius: number;
  koiBridge: KoiSimBridge | null;
  jellyBridge: JellyfishLayoutBridge | null;
  fishTargetIndex: number | null;
  jellyTargetIndex: number | null;
  headerTargetIndex: number | null;
};

export function TutorialSpotlightOverlay({
  step,
  width,
  height,
  gradientRadius,
  koiBridge,
  jellyBridge,
  fishTargetIndex,
  jellyTargetIndex,
  headerTargetIndex,
}: TutorialSpotlightOverlayProps) {
  const fishPos =
    koiBridge != null && fishTargetIndex != null
      ? koiBridge.fishRuntimePositions[fishTargetIndex] ?? null
      : null;

  return (
    <>
      {step === 'fish' && fishPos != null && koiBridge != null && (
        <FishSpotlight
          pos={fishPos}
          hitRadius={koiBridge.hitRadius}
          width={width}
          height={height}
          gradientRadius={gradientRadius}
        />
      )}
      {step === 'jellyfish' &&
        jellyBridge != null &&
        jellyTargetIndex != null && (
          <JellySpotlight
            bridge={jellyBridge}
            jellyIndex={jellyTargetIndex}
            width={width}
            height={height}
            gradientRadius={gradientRadius}
          />
        )}
      {step === 'translate' &&
        jellyBridge != null &&
        headerTargetIndex != null && (
          <JellySpotlight
            bridge={jellyBridge}
            jellyIndex={headerTargetIndex}
            width={width}
            height={height}
            gradientRadius={gradientRadius}
            showGuideLines={false}
          />
        )}
    </>
  );
}
