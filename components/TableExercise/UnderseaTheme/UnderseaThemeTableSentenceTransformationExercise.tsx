import React, { useCallback, useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { spanishPresentTable2Plural } from '../../../data/tableData';
import { UnderseaThemeBackground } from './background';
import {
  UnderseaThemeClockProvider,
  UnderseaThemeRuntimeProvider,
  WORD_TRANSFORMATION_STORE_CONFIG,
  useUnderseaThemeAssetsContext,
  useUnderseaThemeExerciseStore,
  useUnderseaThemeLayout,
} from './core';
import type { UnderseaThemeSoundController } from './core/assets/useUnderseaThemeSounds';
import { DecorativeKoiLayer } from './koi/DecorativeKoiLayer/DecorativeKoiLayer';
import { UnderseaThemeExerciseShell } from './shared/UnderseaThemeExerciseShell';
import { TransformationInstructionBar, UnderseaThemeCornerControls } from './ui';
import {
  TransformationInsertFlight,
  TransformationVariantPicker,
  TransformationWordBubbles,
  TRANSFORMATION_VARIANT_ROW_Y_RATIO,
  TRANSFORMATION_WORD_ROW_Y_RATIO,
} from './wordTransformation';
import { JellyfishSentenceRowLayer } from './sentenceTransformation/components/JellyfishSentenceRowLayer/JellyfishSentenceRowLayer';
import { TransformationMergeBubbles } from './sentenceTransformation/components/TransformationMergeBubbles';
import { TransformationRoundResolutionBubble } from './sentenceTransformation/components/TransformationRoundResolutionBubble';
import { useSentenceTransformationGame } from './sentenceTransformation/hooks/useSentenceTransformationGame';

/** Behind sentence row and bubbles per PRD z-order. */
const DECORATIVE_KOI_Z = 2;
const SENTENCE_ROW_LAYER_Z = 5;
/** Above decorative koi so letter bubbles stay readable and tappable. */
const BUBBLE_LAYER_Z = 15;

type SentenceTransformationContentProps = {
  sounds: UnderseaThemeSoundController;
};

function SentenceTransformationContent({ sounds }: SentenceTransformationContentProps) {
  const table = spanishPresentTable2Plural;
  const soundEnabled = useUnderseaThemeExerciseStore((state) => state.soundEnabled);

  const { koiRect, jellyRect } = useUnderseaThemeLayout();

  useEffect(() => {
    sounds.startWaterflow();
    return () => {
      sounds.stopWaterflow();
    };
  }, [sounds]);

  useEffect(() => {
    sounds.setMuted(!soundEnabled);
  }, [sounds, soundEnabled]);

  const handleTokenTap = useCallback(() => {
    sounds.playPrimaryClick();
  }, [sounds]);

  const game = useSentenceTransformationGame({
    table,
    koiRect,
    jellyRect,
    playPop: sounds.playBubblePop,
    playInflate: sounds.playBubbleInflate,
    playWrong: sounds.playWrongClick,
    playSuccess: sounds.playSuccessClick,
  });

  const instructionCenterY =
    koiRect.y +
    koiRect.h *
      ((TRANSFORMATION_WORD_ROW_Y_RATIO + TRANSFORMATION_VARIANT_ROW_Y_RATIO) * 0.5);

  return (
    <View style={styles.container}>
      <UnderseaThemeBackground />
      <DecorativeKoiLayer zIndex={DECORATIVE_KOI_Z} />
      <View style={styles.sentenceRowLayer} pointerEvents="box-none">
        <JellyfishSentenceRowLayer
          displaySlots={game.displaySlots}
          roundPhase={game.roundPhase}
          exitEdge={game.exitEdge}
          blankSlotIndex={game.blankSlotIndex}
          blankExiting={game.blankExiting}
          poppingSlotIndex={game.poppingSlotIndex}
          onTokenTap={handleTokenTap}
        />
      </View>
      <View style={styles.bubbleLayer} pointerEvents="box-none">
        {!game.isCompleted && (
          <>
            {game.mergeWord != null && (
              <TransformationMergeBubbles word={game.mergeWord} />
            )}
            <TransformationWordBubbles
              letters={game.letters}
              interactive={
                !game.transitioning &&
                game.insertAnimation == null &&
                game.bubbleEnter == null
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
              playPop={sounds.playBubblePop}
              playInflate={sounds.playBubbleInflate}
            />
            <TransformationRoundResolutionBubble bubble={game.resolutionBubble} />
          </>
        )}
        <TransformationInsertFlight flight={game.insertAnimation} />
        {(game.mode === 'insert' || game.insertAnimation != null) &&
          !game.transitioning &&
          game.bubbleEnter == null && (
          <TransformationVariantPicker
            items={game.variantPickerItems}
            wrongItemId={game.wrongItemId}
            hiddenItemIds={game.pickerHiddenItemIds}
            poppedItemIds={game.poppedPickerItemIds}
            interactive={game.insertAnimation == null}
            onSelect={game.handleVariantPress}
            playPop={sounds.playBubblePop}
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

function SentenceTransformationContentWithSounds() {
  const { sounds } = useUnderseaThemeAssetsContext();
  return (
    <UnderseaThemeRuntimeProvider>
      <UnderseaThemeClockProvider>
        <SentenceTransformationContent sounds={sounds} />
      </UnderseaThemeClockProvider>
    </UnderseaThemeRuntimeProvider>
  );
}

export function UnderseaThemeTableSentenceTransformationExercise() {
  return (
    <UnderseaThemeExerciseShell storeConfig={WORD_TRANSFORMATION_STORE_CONFIG}>
      <SentenceTransformationContentWithSounds />
    </UnderseaThemeExerciseShell>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  sentenceRowLayer: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    zIndex: SENTENCE_ROW_LAYER_Z,
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
