import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { getTableBodyWords, spanishPresentTable2Plural } from '../../../data/tableData';
import { UnderseaThemeBackground } from './background';
import {
  UnderseaThemeClockProvider,
  UnderseaThemeRuntimeProvider,
  WORD_TRANSFORMATION_STORE_CONFIG,
  useUnderseaThemeAssetsContext,
  useUnderseaThemeExerciseStore,
  useUnderseaThemeLayout,
  useUnderseaThemeRuntime,
} from './core';
import type { UnderseaThemeSoundController } from './core/assets/useUnderseaThemeSounds';
import { JellyfishTableLayer, type JellyfishSoundKind } from './jellyfish';
import { KoiSwimZone, type KoiSwimZoneController } from './koi';
import { UnderseaThemeExerciseShell } from './shared/UnderseaThemeExerciseShell';
import { CaptureOverlay, TransformationInstructionBar, UnderseaThemeCornerControls } from './ui';
import {
  TransformationInsertFlight,
  TransformationVariantPicker,
  TransformationWordBubbles,
  TRANSFORMATION_VARIANT_ROW_Y_RATIO,
  TRANSFORMATION_WORD_ROW_Y_RATIO,
  useWordTransformationGame,
  type WordOperationSequence,
} from './wordTransformation';

const JELLYFISH_LAYER_Z = 5;
/** Above jellyfish so escaping koi swim over table cells. */
const KOI_SWIM_ZONE_Z = 10;
/** Above koi fish so letter bubbles stay readable and tappable. */
const BUBBLE_LAYER_Z = 15;
/** Brief pause after a sequence is solved before the koi swims to its jellyfish. */
const KOI_ESCAPE_DELAY_MS = 700;

type WordTransformationContentProps = {
  sounds: UnderseaThemeSoundController;
};

function WordTransformationContent({ sounds }: WordTransformationContentProps) {
  const table = spanishPresentTable2Plural;
  const words = useMemo(() => getTableBodyWords(table), [table]);
  const soundEnabled = useUnderseaThemeExerciseStore((state) => state.soundEnabled);

  const { jellyBridge } = useUnderseaThemeRuntime();
  const { jellyRect, koiRect } = useUnderseaThemeLayout();
  const jellyBridgeRef = useRef(jellyBridge);
  jellyBridgeRef.current = jellyBridge;
  const jellyRectRef = useRef(jellyRect);
  jellyRectRef.current = jellyRect;

  const koiControllerRef = useRef<KoiSwimZoneController | null>(null);
  const escapeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    sounds.startWaterflow();
    return () => {
      sounds.stopWaterflow();
    };
  }, [sounds]);

  useEffect(() => {
    sounds.setMuted(!soundEnabled);
  }, [sounds, soundEnabled]);

  useEffect(
    () => () => {
      if (escapeTimerRef.current != null) {
        clearTimeout(escapeTimerRef.current);
      }
    },
    [],
  );

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

  const handleSequenceSolved = useCallback((sequence: WordOperationSequence) => {
    const koi = koiControllerRef.current;
    if (koi == null) {
      return;
    }

    const captured = koi.armCaptureByWord(sequence.targetWord);
    if (!captured) {
      return;
    }

    if (escapeTimerRef.current != null) {
      clearTimeout(escapeTimerRef.current);
    }
    escapeTimerRef.current = setTimeout(() => {
      escapeTimerRef.current = null;
      const bridge = jellyBridgeRef.current;
      const rect = jellyRectRef.current;
      const targetX =
        bridge?.layoutX.value[sequence.cellIndex] ?? rect.x + rect.w * 0.5;
      const targetY =
        bridge?.layoutY.value[sequence.cellIndex] ?? rect.y + rect.h * 0.5;
      koiControllerRef.current?.dispatchEscapeTo(targetX, targetY, sequence.cellIndex);
    }, KOI_ESCAPE_DELAY_MS);
  }, []);

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
        {!game.isCompleted && (
          <TransformationWordBubbles
            letters={game.letters}
            interactive={
              !game.transitioning &&
              game.insertAnimation == null &&
              game.wordTransition == null
            }
            insertPreview={
              game.insertAnimation != null && game.insertAnimation.phase !== 'dismiss'
                ? {
                    insertIndex: game.insertAnimation.insertIndex,
                    insertLength: game.insertAnimation.insertLength,
                    targetLetterCount: game.insertAnimation.nextWord.length,
                  }
                : undefined
            }
            onLetterPress={game.handleLetterPress}
          />
        )}
        {game.insertAnimation != null &&
          (game.insertAnimation.phase === 'fly' ||
            game.insertAnimation.phase === 'dismiss') && (
          <TransformationInsertFlight flight={game.insertAnimation} />
        )}
        {(game.mode === 'insert' || game.insertAnimation != null) &&
          !game.transitioning &&
          game.wordTransition == null && (
          <TransformationVariantPicker
            items={game.variantPickerItems}
            wrongItemId={game.wrongItemId}
            hiddenItemIds={game.pickerHiddenItemIds}
            poppedItemIds={game.poppedPickerItemIds}
            interactive={game.insertAnimation == null}
            onSelect={game.handleVariantPress}
          />
        )}
      </View>
      <TransformationInstructionBar
        message={game.instruction}
        centerY={instructionCenterY}
      />
      <UnderseaThemeCornerControls helpVisible={false} />
    </View>
  );
}

function WordTransformationContentWithSounds() {
  const { sounds } = useUnderseaThemeAssetsContext();
  return (
    <UnderseaThemeRuntimeProvider>
      <UnderseaThemeClockProvider>
        <WordTransformationContent sounds={sounds} />
      </UnderseaThemeClockProvider>
    </UnderseaThemeRuntimeProvider>
  );
}

export function UnderseaThemeTableWordTransformationExercise() {
  return (
    <UnderseaThemeExerciseShell storeConfig={WORD_TRANSFORMATION_STORE_CONFIG}>
      <WordTransformationContentWithSounds />
    </UnderseaThemeExerciseShell>
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
