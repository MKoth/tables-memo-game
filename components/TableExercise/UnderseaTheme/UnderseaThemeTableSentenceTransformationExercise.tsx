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
import {
  TRANSFORMATION_VARIANT_ROW_Y_RATIO,
  TRANSFORMATION_WORD_ROW_Y_RATIO,
} from './core/layout/underseaExerciseLayout';
import type { UnderseaThemeSoundController } from './core/assets/useUnderseaThemeSounds';
import { DecorativeKoiLayer } from './koi/DecorativeKoiLayer/DecorativeKoiLayer';
import { UnderseaThemeExerciseShell } from './shared/UnderseaThemeExerciseShell';
import { TransformationInstructionBar, UnderseaThemeCornerControls } from './ui';
import { TransformationBubbleLayer } from './wordTransformation';
import { JellyfishSentenceRowLayer } from './sentenceTransformation/components/JellyfishSentenceRowLayer/JellyfishSentenceRowLayer';
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

  const { koiRect, jellyRect, orientation, screenWidth, screenHeight } = useUnderseaThemeLayout();

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
    orientation,
    screenWidth,
    screenHeight,
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
          conjugatedForm={game.conjugatedForm}
          roundPos={game.roundPos}
          roundPhase={game.roundPhase}
          swimPaths={game.swimPaths}
          blankSlotIndex={game.blankSlotIndex}
          blankExiting={game.blankExiting}
          poppingSlotIndex={game.poppingSlotIndex}
          onTokenTap={handleTokenTap}
          onRowEnterComplete={game.handleRowEnterComplete}
          onRowExitComplete={game.handleRowExitComplete}
        />
      </View>
      <View style={styles.bubbleLayer} pointerEvents="box-none">
        <TransformationBubbleLayer
          wordBubblesVisible={!game.isCompleted}
          mergeWord={game.mergeWord}
          onMergeComplete={game.handleMergeComplete}
          betweenWordBubblesAndInsertFlight={
            !game.isCompleted ? (
              <TransformationRoundResolutionBubble
                bubble={game.resolutionBubble}
                roundPhase={game.roundPhase}
                onMaterializeComplete={game.handleMaterializeComplete}
                onResolveComplete={game.handleResolveComplete}
                onPopComplete={game.handlePopComplete}
              />
            ) : undefined
          }
          letters={game.letters}
          lettersInteractive={
            !game.transitioning &&
            game.insertAnimation == null &&
            game.bubbleEnter == null
          }
          insertAnimation={game.insertAnimation}
          variantPickerVisible={
            (game.mode === 'insert' || game.insertAnimation != null) &&
            !game.transitioning &&
            game.bubbleEnter == null
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
