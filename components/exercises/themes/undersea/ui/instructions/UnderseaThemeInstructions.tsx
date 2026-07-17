import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { Canvas } from '@shopify/react-native-skia';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useExerciseLayout } from '../../../../core/providers/ExerciseLayoutProvider';
import { useExerciseRuntime } from '../../../../core/providers/ExerciseRuntimeProvider';
import { useExerciseStore } from '../../../../core/store/createExerciseStore';
import {
  InstructionTooltip,
  HELP_MARGIN,
  INSTRUCTIONS_Z,
  computeTooltipPosition,
} from '../../../../ui';
import { TutorialSpotlightOverlay } from './components/TutorialSpotlightOverlay';
import {
  pickRandomRoamerIndex,
  pickRandomHeaderSpriteIndex,
  pickRandomSpriteIndex,
} from './helpers/tutorialTargets';

export function UnderseaThemeInstructions() {
  const step = useExerciseStore((state) => state.tutorialStep);
  const nextTutorialStep = useExerciseStore((state) => state.nextTutorialStep);
  const dismissTutorial = useExerciseStore((state) => state.dismissTutorial);
  const { roamerBridge, wordSpriteBridge } = useExerciseRuntime();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { controlsAnchor } = useExerciseLayout();
  const [roamerTargetIndex, setRoamerTargetIndex] = useState<number | null>(null);
  const [spriteTargetIndex, setSpriteTargetIndex] = useState<number | null>(null);
  const [headerTargetIndex, setHeaderTargetIndex] = useState<number | null>(null);

  useEffect(() => {
    if (step !== 'roamer') {
      setRoamerTargetIndex(null);
      return;
    }
    if (roamerBridge != null) {
      setRoamerTargetIndex(pickRandomRoamerIndex(roamerBridge));
    }
  }, [step, roamerBridge]);

  useEffect(() => {
    if (step !== 'wordSprite') {
      setSpriteTargetIndex(null);
      return;
    }
    if (wordSpriteBridge != null) {
      setSpriteTargetIndex(pickRandomSpriteIndex(wordSpriteBridge));
    }
  }, [step, wordSpriteBridge]);

  useEffect(() => {
    if (step === 'roamer' && roamerBridge != null && roamerTargetIndex == null) {
      setRoamerTargetIndex(pickRandomRoamerIndex(roamerBridge));
    }
  }, [step, roamerBridge, roamerTargetIndex]);

  useEffect(() => {
    if (step === 'wordSprite' && wordSpriteBridge != null && spriteTargetIndex == null) {
      setSpriteTargetIndex(pickRandomSpriteIndex(wordSpriteBridge));
    }
  }, [step, wordSpriteBridge, spriteTargetIndex]);

  useEffect(() => {
    if (step !== 'translate') {
      setHeaderTargetIndex(null);
      return;
    }
    if (wordSpriteBridge != null) {
      setHeaderTargetIndex(pickRandomHeaderSpriteIndex(wordSpriteBridge));
    }
  }, [step, wordSpriteBridge]);

  useEffect(() => {
    if (step === 'translate' && wordSpriteBridge != null && headerTargetIndex == null) {
      setHeaderTargetIndex(pickRandomHeaderSpriteIndex(wordSpriteBridge));
    }
  }, [step, wordSpriteBridge, headerTargetIndex]);

  const gradientRadius = useMemo(
    () => Math.hypot(width, height) * 0.75,
    [width, height],
  );

  const tooltipPosition = computeTooltipPosition(controlsAnchor, insets, HELP_MARGIN);

  const message =
    step === 'roamer'
      ? 'Tap any fish to catch it in a bubble.'
      : step === 'wordSprite'
        ? 'Select the matching wordSprite using the table rules.'
        : 'Tap any row or column header wordSprite to see its English translation.';

  const stepLabel =
    step === 'roamer' ? '1/3' : step === 'wordSprite' ? '2/3' : '3/3';

  const actionLabel = step === 'translate' ? 'Got it!' : 'Next';
  const onAction = step === 'translate' ? dismissTutorial : nextTutorialStep;

  if (step === 'idle') {
    return null;
  }

  return (
    <View style={[styles.overlayRoot, { zIndex: INSTRUCTIONS_Z }]} pointerEvents="box-none">
      <View style={styles.dimTouchBlocker} pointerEvents="auto">
        <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
          <TutorialSpotlightOverlay
            step={step}
            width={width}
            height={height}
            gradientRadius={gradientRadius}
            roamerBridge={roamerBridge}
            wordSpriteBridge={wordSpriteBridge}
            roamerTargetIndex={roamerTargetIndex}
            spriteTargetIndex={spriteTargetIndex}
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
