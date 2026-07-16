import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { getTableBodyWords, spanishPresentTable2Plural } from '../../../data/tableData';
import { UnderseaThemeBackground } from './background';
import {
  ExerciseClockProvider,
  ExerciseRuntimeProvider,
  WORD_TRANSFORMATION_STORE_CONFIG,
  useExerciseLayout,
  useExerciseRuntime,
  useExerciseStore,
} from '../core';
import { useUnderseaThemeAssetsContext } from './core/providers/UnderseaThemeAssetsProvider';
import {
  TRANSFORMATION_VARIANT_ROW_Y_RATIO,
  TRANSFORMATION_WORD_ROW_Y_RATIO,
} from '../core/layout/exerciseLayout';
import type { UnderseaThemeSoundController } from './core/assets/useUnderseaThemeSounds';
import { JellyfishTableLayer, type JellyfishSoundKind } from './jellyfish';
import { KoiSwimZone, type KoiSwimZoneController } from './koi';
import { useKoiEscapeCoordinator } from './koi/escape/useKoiEscapeCoordinator';
import { ExerciseShell } from '../shared';
import { CaptureOverlay, TransformationInstructionBar, ExerciseCornerControls } from '../ui';
import {
  TransformationBubbleLayer,
} from './wordTransformation';
import { useWordTransformationGame } from '../wordTransformation/hooks/useWordTransformationGame';

const JELLYFISH_LAYER_Z = 5;
/** Above jellyfish so escaping koi swim over table cells. */
const KOI_SWIM_ZONE_Z = 10;
/** Above koi fish so letter bubbles stay readable and tappable. */
const BUBBLE_LAYER_Z = 15;
type WordTransformationContentProps = {
  sounds: UnderseaThemeSoundController;
};

function WordTransformationContent({ sounds }: WordTransformationContentProps) {
  const table = spanishPresentTable2Plural;
  const words = useMemo(() => getTableBodyWords(table), [table]);
  const soundEnabled = useExerciseStore((state) => state.soundEnabled);

  const { wordSpriteBridge } = useExerciseRuntime();
  const { jellyRect, koiRect } = useExerciseLayout();

  const koiControllerRef = useRef<KoiSwimZoneController | null>(null);
  const handleSequenceSolved = useKoiEscapeCoordinator({
    koiControllerRef,
    jellyBridge: wordSpriteBridge,
    jellyRect,
  });

  useEffect(() => {
    sounds.startWaterflow();
    return () => {
      sounds.stopWaterflow();
    };
  }, [sounds]);

  useEffect(() => {
    sounds.setMuted(!soundEnabled);
  }, [sounds, soundEnabled]);

  const handleJellyfishSound = useCallback(
    (kind: JellyfishSoundKind) => {
      if (kind === 'success') {
        sounds.playSuccessClick();
        return;
      }
      if (kind === 'error') {
        sounds.playWrongClick();
        return;
      }
      sounds.playPrimaryClick();
    },
    [sounds],
  );

  const game = useWordTransformationGame({
    table,
    koiRect,
    onSequenceSolved: handleSequenceSolved,
    playPop: sounds.playBubblePop,
    playInflate: sounds.playBubbleInflate,
    playWrong: sounds.playWrongClick,
  });

  const instructionCenterY =
    koiRect.y +
    koiRect.h *
      ((TRANSFORMATION_WORD_ROW_Y_RATIO + TRANSFORMATION_VARIANT_ROW_Y_RATIO) * 0.5);

  return (
    <View style={styles.container}>
      <UnderseaThemeBackground />
      <KoiSwimZone
        words={words}
        interactive={false}
        captureEnabled={false}
        bubbleCaptureEnabled={false}
        swimZoneZIndex={KOI_SWIM_ZONE_Z}
        sounds={sounds}
        controllerRef={koiControllerRef}
      />
      <CaptureOverlay />
      <View style={styles.jellyfishLayer} pointerEvents="box-none">
        <JellyfishTableLayer
          table={table}
          onJellyfishSound={handleJellyfishSound}
          highlightedCellIndex={game.highlightedCellIndex}
          extraRevealedBodyIndices={game.revealedCellIndices}
        />
      </View>
      <View style={styles.bubbleLayer} pointerEvents="box-none">
        <TransformationBubbleLayer
          wordBubblesVisible={!game.isCompleted}
          letters={game.letters}
          lettersInteractive={
            !game.transitioning &&
            game.insertAnimation == null &&
            game.wordTransition == null
          }
          insertAnimation={game.insertAnimation}
          variantPickerVisible={
            (game.mode === 'insert' || game.insertAnimation != null) &&
            !game.transitioning &&
            game.wordTransition == null
          }
          variantPickerInteractive={game.insertAnimation == null}
          variantPickerItems={game.variantPickerItems}
          wrongItemId={game.wrongItemId}
          pickerHiddenItemIds={game.pickerHiddenItemIds}
          poppedPickerItemIds={game.poppedPickerItemIds}
          onLetterPress={game.handleLetterPress}
          onVariantSelect={game.handleVariantPress}
          playPop={sounds.playBubblePop}
          playInflate={sounds.playBubbleInflate}
        />
      </View>
      <TransformationInstructionBar
        message={game.instruction}
        centerY={instructionCenterY}
      />
      <ExerciseCornerControls helpVisible={false} />
    </View>
  );
}

function WordTransformationContentWithSounds() {
  const { sounds } = useUnderseaThemeAssetsContext();
  return (
    <ExerciseRuntimeProvider>
      <ExerciseClockProvider>
        <WordTransformationContent sounds={sounds} />
      </ExerciseClockProvider>
    </ExerciseRuntimeProvider>
  );
}

export function UnderseaThemeTableWordTransformationExercise() {
  return (
    <ExerciseShell storeConfig={WORD_TRANSFORMATION_STORE_CONFIG}>
      <WordTransformationContentWithSounds />
    </ExerciseShell>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  jellyfishLayer: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    zIndex: JELLYFISH_LAYER_Z,
  },
  bubbleLayer: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    zIndex: BUBBLE_LAYER_Z,
  },
});
