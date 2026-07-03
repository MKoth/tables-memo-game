import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { getTableBodyWords, spanishPresentTable2Singular } from '../../../data/tableData';
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
  TransformationVariantPicker,
  TransformationWordBubbles,
  useWordTransformationGame,
  type WordOperationSequence,
} from './wordTransformation';

const JELLYFISH_LAYER_Z = 5;
/** Delay after capture starts before the koi bubble bursts and swims to its jellyfish. */
const KOI_ESCAPE_DELAY_MS = 700;

type WordTransformationContentProps = {
  sounds: UnderseaThemeSoundController;
};

function WordTransformationContent({ sounds }: WordTransformationContentProps) {
  const table = spanishPresentTable2Singular;
  const words = useMemo(() => getTableBodyWords(table), [table]);
  const soundEnabled = useUnderseaThemeExerciseStore((state) => state.soundEnabled);

  const { jellyBridge } = useUnderseaThemeRuntime();
  const { jellyRect } = useUnderseaThemeLayout();
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
    onSequenceSolved: handleSequenceSolved,
    playPop: sounds.playBubblePop,
    playWrong: sounds.playWrongClick,
    playSuccess: sounds.playSuccessClick,
  });

  return (
    <View style={styles.container}>
      <UnderseaThemeBackground />
      <KoiSwimZone
        words={words}
        interactive={false}
        captureEnabled={false}
        sounds={sounds}
        controllerRef={koiControllerRef}
      />
      <CaptureOverlay />
      <View style={styles.jellyfishLayer} pointerEvents="box-none">
        <JellyfishTableLayer
          table={table}
          interactive={false}
          onJellyfishSound={handleJellyfishSound}
          highlightedCellIndex={game.highlightedCellIndex}
          extraRevealedBodyIndices={game.revealedCellIndices}
        />
      </View>
      {!game.isCompleted && (
        <TransformationWordBubbles
          letters={game.letters}
          interactive={!game.transitioning}
          onLetterPress={game.handleLetterPress}
        />
      )}
      {game.mode === 'insert' && !game.transitioning && (
        <TransformationVariantPicker
          variants={game.variants}
          wrongVariant={game.wrongVariant}
          interactive={!game.transitioning}
          onSelect={game.handleVariantPress}
        />
      )}
      <TransformationInstructionBar message={game.instruction} />
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
});
