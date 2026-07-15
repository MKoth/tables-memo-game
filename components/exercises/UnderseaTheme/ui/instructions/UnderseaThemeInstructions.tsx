import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { Canvas } from '@shopify/react-native-skia';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useExerciseLayout } from '../../../core/providers/ExerciseLayoutProvider';
import { useExerciseRuntime } from '../../../core/providers/ExerciseRuntimeProvider';
import { useExerciseStore } from '../../../core/store/createExerciseStore';
import { TutorialSpotlightOverlay } from './components/TutorialSpotlightOverlay';
import { InstructionTooltip } from './components/UnderseaThemeCornerControls';
import { HELP_MARGIN, INSTRUCTIONS_Z } from './constants';
import { computeTooltipPosition } from './helpers/controlsPosition';
import {
  pickRandomFishIndex,
  pickRandomHeaderJellyIndex,
  pickRandomJellyIndex,
} from './helpers/tutorialTargets';

export {
  INSTRUCTIONS_Z,
  HELP_BUTTON_Z,
} from './constants';

export {
  UnderseaThemeCornerControls,
  UnderseaThemeHelpButton,
  UnderseaThemeSoundToggleButton,
  type UnderseaThemeHelpButtonProps,
  type UnderseaThemeCornerControlsProps,
  type UnderseaThemeSoundToggleButtonProps,
} from './components/UnderseaThemeCornerControls';

export function UnderseaThemeInstructions() {
  const step = useExerciseStore((state) => state.tutorialStep);
  const nextTutorialStep = useExerciseStore((state) => state.nextTutorialStep);
  const dismissTutorial = useExerciseStore((state) => state.dismissTutorial);
  const { koiBridge, jellyBridge } = useExerciseRuntime();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { controlsAnchor } = useExerciseLayout();
  const [fishTargetIndex, setFishTargetIndex] = useState<number | null>(null);
  const [jellyTargetIndex, setJellyTargetIndex] = useState<number | null>(null);
  const [headerTargetIndex, setHeaderTargetIndex] = useState<number | null>(null);

  useEffect(() => {
    if (step !== 'fish') {
      setFishTargetIndex(null);
      return;
    }
    if (koiBridge != null) {
      setFishTargetIndex(pickRandomFishIndex(koiBridge));
    }
  }, [step, koiBridge]);

  useEffect(() => {
    if (step !== 'jellyfish') {
      setJellyTargetIndex(null);
      return;
    }
    if (jellyBridge != null) {
      setJellyTargetIndex(pickRandomJellyIndex(jellyBridge));
    }
  }, [step, jellyBridge]);

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

  useEffect(() => {
    if (step !== 'translate') {
      setHeaderTargetIndex(null);
      return;
    }
    if (jellyBridge != null) {
      setHeaderTargetIndex(pickRandomHeaderJellyIndex(jellyBridge));
    }
  }, [step, jellyBridge]);

  useEffect(() => {
    if (step === 'translate' && jellyBridge != null && headerTargetIndex == null) {
      setHeaderTargetIndex(pickRandomHeaderJellyIndex(jellyBridge));
    }
  }, [step, jellyBridge, headerTargetIndex]);

  const gradientRadius = useMemo(
    () => Math.hypot(width, height) * 0.75,
    [width, height],
  );

  const tooltipPosition = computeTooltipPosition(controlsAnchor, insets, HELP_MARGIN);

  const message =
    step === 'fish'
      ? 'Tap any fish to catch it in a bubble.'
      : step === 'jellyfish'
        ? 'Select the matching jellyfish using the table rules.'
        : 'Tap any row or column header jellyfish to see its English translation.';

  const stepLabel =
    step === 'fish' ? '1/3' : step === 'jellyfish' ? '2/3' : '3/3';

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
            koiBridge={koiBridge}
            jellyBridge={jellyBridge}
            fishTargetIndex={fishTargetIndex}
            jellyTargetIndex={jellyTargetIndex}
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
