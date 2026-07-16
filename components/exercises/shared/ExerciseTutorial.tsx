import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { Canvas } from '@shopify/react-native-skia';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useExerciseLayout } from '../core/providers/ExerciseLayoutProvider';
import { useExerciseRuntime } from '../core/providers/ExerciseRuntimeProvider';
import { useExerciseStore } from '../core/store/createExerciseStore';
import type { TutorialStep } from '../core/types/bridgeTypes';
import {
  InstructionTooltip,
  HELP_MARGIN,
  INSTRUCTIONS_Z,
  computeTooltipPosition,
} from '../ui';
import { useTheme } from '../themeContract';

export function ExerciseTutorial() {
  const step = useExerciseStore((state) => state.tutorialStep);
  const nextTutorialStep = useExerciseStore((state) => state.nextTutorialStep);
  const dismissTutorial = useExerciseStore((state) => state.dismissTutorial);
  const { roamerBridge, wordSpriteBridge } = useExerciseRuntime();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { controlsAnchor } = useExerciseLayout();
  const theme = useTheme();

  const [roamerTargetIndex, setRoamerTargetIndex] = useState<number | null>(null);
  const [wordSpriteTargetIndex, setWordSpriteTargetIndex] = useState<number | null>(null);
  const [headerTargetIndex, setHeaderTargetIndex] = useState<number | null>(null);

  useEffect(() => {
    if (step !== 'roamer') {
      setRoamerTargetIndex(null);
      return;
    }
    if (roamerBridge != null) {
      setRoamerTargetIndex(theme.tutorial.pickRoamerTarget(roamerBridge));
    }
  }, [step, roamerBridge, theme.tutorial]);

  useEffect(() => {
    if (step !== 'wordSprite') {
      setWordSpriteTargetIndex(null);
      return;
    }
    if (wordSpriteBridge != null) {
      setWordSpriteTargetIndex(theme.tutorial.pickWordSpriteTarget(wordSpriteBridge));
    }
  }, [step, wordSpriteBridge, theme.tutorial]);

  useEffect(() => {
    if (step === 'roamer' && roamerBridge != null && roamerTargetIndex == null) {
      setRoamerTargetIndex(theme.tutorial.pickRoamerTarget(roamerBridge));
    }
  }, [step, roamerBridge, roamerTargetIndex, theme.tutorial]);

  useEffect(() => {
    if (step === 'wordSprite' && wordSpriteBridge != null && wordSpriteTargetIndex == null) {
      setWordSpriteTargetIndex(theme.tutorial.pickWordSpriteTarget(wordSpriteBridge));
    }
  }, [step, wordSpriteBridge, wordSpriteTargetIndex, theme.tutorial]);

  useEffect(() => {
    if (step !== 'translate') {
      setHeaderTargetIndex(null);
      return;
    }
    if (wordSpriteBridge != null) {
      setHeaderTargetIndex(theme.tutorial.pickHeaderTarget(wordSpriteBridge));
    }
  }, [step, wordSpriteBridge, theme.tutorial]);

  useEffect(() => {
    if (step === 'translate' && wordSpriteBridge != null && headerTargetIndex == null) {
      setHeaderTargetIndex(theme.tutorial.pickHeaderTarget(wordSpriteBridge));
    }
  }, [step, wordSpriteBridge, headerTargetIndex, theme.tutorial]);

  const gradientRadius = useMemo(
    () => Math.hypot(width, height) * 0.75,
    [width, height],
  );

  const tooltipPosition = computeTooltipPosition(controlsAnchor, insets, HELP_MARGIN);

  const tutorialStep = step as Exclude<TutorialStep, 'idle'>;
  const stepCopy = step !== 'idle' ? theme.tutorial.copy[tutorialStep] : null;

  const message = stepCopy?.message ?? '';
  const stepLabel = stepCopy?.stepLabel ?? '';
  const actionLabel = stepCopy?.actionLabel ?? 'Next';
  const onAction = step === 'translate' ? dismissTutorial : nextTutorialStep;

  if (step === 'idle') {
    return null;
  }

  return (
    <View style={[styles.overlayRoot, { zIndex: INSTRUCTIONS_Z }]} pointerEvents="box-none">
      <View style={styles.dimTouchBlocker} pointerEvents="auto">
        <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
          <theme.tutorial.SpotlightOverlay
            step={tutorialStep}
            width={width}
            height={height}
            gradientRadius={gradientRadius}
            roamerBridge={roamerBridge}
            wordSpriteBridge={wordSpriteBridge}
            fishTargetIndex={roamerTargetIndex}
            jellyTargetIndex={wordSpriteTargetIndex}
            headerTargetIndex={headerTargetIndex}
          />
        </Canvas>
      </View>

      <InstructionTooltip
        message={message}
        stepLabel={stepLabel}
        actionLabel={actionLabel}
        onAction={onAction}
        {...tooltipPosition}
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
});
