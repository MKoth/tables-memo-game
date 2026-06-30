import React, { useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import {
  Canvas,
  Circle,
  Line,
  RadialGradient,
  Rect,
  vec,
} from '@shopify/react-native-skia';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDerivedValue, type SharedValue } from 'react-native-reanimated';
import { UiDropPanel } from './UiDropPanel';
import type {
  JellyfishLayoutBridge,
  KoiFishRuntimePosition,
  KoiSimBridge,
  TutorialStep,
} from './underseaInstructionTypes';

export const INSTRUCTIONS_Z = 20;
export const HELP_BUTTON_Z = 22;

const HELP_BUTTON_SIZE = 52;
const HELP_MARGIN = 16;
const TOOLTIP_MIN_WIDTH = 240;
const TOOLTIP_CORNER_RADIUS = 22;
const OVERLAY_DARK = 'rgba(5, 20, 40, 0.82)';
const GUIDE_LINE_COLOR = 'rgba(180, 220, 255, 0.35)';
const SPOTLIGHT_RING_COLOR = 'rgba(200, 235, 255, 0.85)';

/** Tight spotlight around the fish body (tap uses hitRadius * 1.55). */
const FISH_SPOTLIGHT_SCALE = 1.35;
const JELLY_SPOTLIGHT_SCALE = 1.15;

function pickRandomFishIndex(bridge: KoiSimBridge): number | null {
  const eliminated = bridge.eliminatedFishSv.value;
  const eligible: number[] = [];
  for (let i = 0; i < bridge.fishCount; i++) {
    let isEliminated = false;
    for (let e = 0; e < eliminated.length; e++) {
      if (eliminated[e] === i) {
        isEliminated = true;
        break;
      }
    }
    if (!isEliminated) {
      eligible.push(i);
    }
  }
  if (eligible.length === 0) {
    return null;
  }
  return eligible[Math.floor(Math.random() * eligible.length)]!;
}

function pickRandomJellyIndex(bridge: JellyfishLayoutBridge): number | null {
  const { bodyCellIndices } = bridge;
  if (bodyCellIndices.length === 0) {
    return null;
  }
  return bodyCellIndices[Math.floor(Math.random() * bodyCellIndices.length)]!;
}

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

function FishSpotlight({
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

function JellySpotlight({
  bridge,
  jellyIndex,
  width,
  height,
  gradientRadius,
}: {
  bridge: JellyfishLayoutBridge;
  jellyIndex: number;
  width: number;
  height: number;
  gradientRadius: number;
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
      <JellyGuideLines
        centerX={guideLineX}
        centerY={guideLineY}
        width={width}
        height={height}
      />
    </>
  );
}

export type UnderseaHelpButtonProps = {
  onPress: () => void;
  disabled?: boolean;
};

export function UnderseaHelpButton({ onPress, disabled = false }: UnderseaHelpButtonProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.helpAnchor,
        {
          bottom: insets.bottom + HELP_MARGIN,
          right: insets.right + HELP_MARGIN,
          zIndex: HELP_BUTTON_Z,
        },
      ]}
      pointerEvents={disabled ? 'none' : 'box-none'}>
      <View style={styles.helpButtonShell}>
        <UiDropPanel width={HELP_BUTTON_SIZE} height={HELP_BUTTON_SIZE} />
        <Pressable
          onPress={onPress}
          disabled={disabled}
          style={({ pressed }) => [
            styles.helpButtonHit,
            pressed && !disabled && styles.helpButtonPressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel="Show instructions">
          <Text style={styles.helpButtonText}>?</Text>
        </Pressable>
      </View>
    </View>
  );
}

type InstructionTooltipProps = {
  message: string;
  stepLabel?: string;
  actionLabel: string;
  onAction: () => void;
  bottom: number;
  right: number;
};

function InstructionTooltip({
  message,
  stepLabel,
  actionLabel,
  onAction,
  bottom,
  right,
}: InstructionTooltipProps) {
  const [panelSize, setPanelSize] = useState({ width: TOOLTIP_MIN_WIDTH, height: 120 });

  return (
    <View
      style={[styles.tooltipAnchor, { bottom, right }]}
      pointerEvents="box-none">
      <View
        style={styles.tooltipShell}
        onLayout={event => {
          const { width, height } = event.nativeEvent.layout;
          if (width > 0 && height > 0) {
            setPanelSize({ width, height });
          }
        }}>
        <UiDropPanel
          width={panelSize.width}
          height={panelSize.height}
          cornerRadius={TOOLTIP_CORNER_RADIUS}
        />
        <View style={styles.tooltipContent} pointerEvents="auto">
          <Text style={styles.tooltipMessage}>{message}</Text>
          {stepLabel != null && (
            <Text style={styles.stepLabel}>{stepLabel}</Text>
          )}
          <Pressable
            onPress={onAction}
            hitSlop={8}
            accessibilityRole="link">
            <Text style={styles.actionLink}>{actionLabel}</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

export type UnderseaInstructionsProps = {
  step: Exclude<TutorialStep, 'idle'>;
  koiBridge: KoiSimBridge | null;
  jellyBridge: JellyfishLayoutBridge | null;
  onNext: () => void;
  onDismiss: () => void;
};

export function UnderseaInstructions({
  step,
  koiBridge,
  jellyBridge,
  onNext,
  onDismiss,
}: UnderseaInstructionsProps) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [fishTargetIndex, setFishTargetIndex] = useState<number | null>(null);
  const [jellyTargetIndex, setJellyTargetIndex] = useState<number | null>(null);

  useEffect(() => {
    if (step !== 'fish') {
      setFishTargetIndex(null);
      return;
    }
    if (koiBridge != null) {
      setFishTargetIndex(pickRandomFishIndex(koiBridge));
    }
  }, [step]);

  useEffect(() => {
    if (step !== 'jellyfish') {
      setJellyTargetIndex(null);
      return;
    }
    if (jellyBridge != null) {
      setJellyTargetIndex(pickRandomJellyIndex(jellyBridge));
    }
  }, [step]);

  useEffect(() => {
    if (step === 'fish' && koiBridge != null && fishTargetIndex == null) {
      setFishTargetIndex(pickRandomFishIndex(koiBridge));
    }
  }, [step, koiBridge, fishTargetIndex]);

  useEffect(() => {
    if (step === 'jellyfish' && jellyBridge != null && jellyTargetIndex == null) {
      setJellyTargetIndex(pickRandomJellyIndex(jellyBridge));
    }
  }, [step, jellyBridge, jellyTargetIndex]);

  const gradientRadius = useMemo(
    () => Math.hypot(width, height) * 0.75,
    [width, height],
  );

  const fishPos =
    koiBridge != null && fishTargetIndex != null
      ? koiBridge.fishRuntimePositions[fishTargetIndex] ?? null
      : null;

  const tooltipBottom =
    insets.bottom + HELP_MARGIN + HELP_BUTTON_SIZE + 12;
  const tooltipRight = insets.right + HELP_MARGIN;

  const message =
    step === 'fish'
      ? 'Tap any fish to catch it in a bubble.'
      : 'Select the matching jellyfish using the table rules.';

  const actionLabel = step === 'fish' ? 'Next' : 'Got it!';
  const onAction = step === 'fish' ? onNext : onDismiss;

  return (
    <View style={[styles.overlayRoot, { zIndex: INSTRUCTIONS_Z }]} pointerEvents="box-none">
      <View style={styles.dimTouchBlocker} pointerEvents="auto">
        <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
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
        </Canvas>
      </View>

      <InstructionTooltip
        message={message}
        stepLabel={step === 'fish' ? '1/2' : undefined}
        actionLabel={actionLabel}
        onAction={onAction}
        bottom={tooltipBottom}
        right={tooltipRight}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  overlayRoot: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  dimTouchBlocker: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  helpAnchor: {
    position: 'absolute',
  },
  helpButtonShell: {
    width: HELP_BUTTON_SIZE,
    height: HELP_BUTTON_SIZE,
    overflow: 'hidden',
  },
  helpButtonHit: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  helpButtonPressed: {
    opacity: 0.82,
    transform: [{ scale: 0.96 }],
  },
  helpButtonText: {
    fontSize: 28,
    fontWeight: '800',
    color: '#ffffff',
    marginTop: -2,
    textShadowColor: 'rgba(10, 40, 64, 0.45)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  tooltipAnchor: {
    position: 'absolute',
    maxWidth: 280,
    alignItems: 'flex-end',
  },
  tooltipShell: {
    minWidth: TOOLTIP_MIN_WIDTH,
    position: 'relative',
    overflow: 'hidden',
  },
  tooltipContent: {
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
  tooltipMessage: {
    fontSize: 15,
    lineHeight: 21,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 10,
    textShadowColor: 'rgba(10, 40, 64, 0.35)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  stepLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.75)',
    marginBottom: 8,
    textAlign: 'center',
  },
  actionLink: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
    textAlign: 'center',
    textDecorationLine: 'underline',
    textShadowColor: 'rgba(10, 40, 64, 0.35)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
});
