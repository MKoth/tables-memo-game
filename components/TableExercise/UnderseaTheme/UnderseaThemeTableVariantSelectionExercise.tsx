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
import { JellyfishSentenceRowLayer } from './sentenceTransformation/components/JellyfishSentenceRowLayer/JellyfishSentenceRowLayer';
import { useVariantSelectionGame } from './variantSelection/hooks/useVariantSelectionGame';
import { OptionJellyfishLayer } from './variantSelection/components/OptionJellyfishLayer';

const DECORATIVE_KOI_Z = 2;
const SENTENCE_ROW_LAYER_Z = 5;
const OPTION_LAYER_Z = 10;

type VariantSelectionContentProps = {
  sounds: UnderseaThemeSoundController;
};

function VariantSelectionContent({ sounds }: VariantSelectionContentProps) {
  const table = spanishPresentTable2Plural;
  const soundEnabled = useUnderseaThemeExerciseStore(state => state.soundEnabled);

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

  const game = useVariantSelectionGame({
    table,
    orientation,
    screenWidth,
    screenHeight,
    koiRect,
    jellyRect,
    playSuccess: sounds.playSuccessClick,
    playWrong: sounds.playWrongClick,
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
          blankSlotIndex={-1}
          blankExiting={false}
          poppingSlotIndex={null}
          onTokenTap={handleTokenTap}
          onRowEnterComplete={game.handleRowEnterComplete}
          onRowExitComplete={game.handleRowExitComplete}
        />
      </View>
      <View style={styles.optionLayer} pointerEvents="box-none">
        <OptionJellyfishLayer
          options={game.options}
          swimPaths={game.optionSwimPaths}
          roundPhase={game.roundPhase}
          onOptionTap={game.handleOptionTap}
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

function VariantSelectionContentWithSounds() {
  const { sounds } = useUnderseaThemeAssetsContext();
  return (
    <UnderseaThemeRuntimeProvider>
      <UnderseaThemeClockProvider>
        <VariantSelectionContent sounds={sounds} />
      </UnderseaThemeClockProvider>
    </UnderseaThemeRuntimeProvider>
  );
}

export function UnderseaThemeTableVariantSelectionExercise() {
  return (
    <UnderseaThemeExerciseShell storeConfig={WORD_TRANSFORMATION_STORE_CONFIG}>
      <VariantSelectionContentWithSounds />
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
  optionLayer: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    zIndex: OPTION_LAYER_Z,
  },
});
