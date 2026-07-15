import React, { useCallback, useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { spanishPresentTable2Plural } from '../../../data/tableData';
import { UnderseaThemeBackground } from './background';
import {
  ExerciseClockProvider,
  ExerciseRuntimeProvider,
  WORD_TRANSFORMATION_STORE_CONFIG,
  useExerciseLayout,
  useExerciseStore,
} from '../core';
import { useUnderseaThemeAssetsContext } from './core/providers/UnderseaThemeAssetsProvider';
import {
  TRANSFORMATION_VARIANT_ROW_Y_RATIO,
  TRANSFORMATION_WORD_ROW_Y_RATIO,
} from '../core/layout/exerciseLayout';
import type { UnderseaThemeSoundController } from './core/assets/useUnderseaThemeSounds';
import { DecorativeKoiLayer } from './koi/DecorativeKoiLayer/DecorativeKoiLayer';
import { ExerciseShell } from '../shared';
import { TransformationInstructionBar, ExerciseCornerControls } from '../ui';
import { JellyfishSentenceRowLayer } from './sentenceTransformation/components/JellyfishSentenceRowLayer/JellyfishSentenceRowLayer';
import { useVariantSelectionGame } from '../variantSelection/hooks/useVariantSelectionGame';
import { OptionJellyfishLayer } from './variantSelection/components/OptionJellyfishLayer';
import { VariantSelectionResolveFlight } from './variantSelection/components/VariantSelectionResolveFlight';
import { ROUND_RESOLVE_FLY_DURATION_MS } from '../variantSelection/domain/roundResolutionTiming';

const DECORATIVE_KOI_Z = 2;
const SENTENCE_ROW_LAYER_Z = 5;
const OPTION_LAYER_Z = 10;
const RESOLVE_FLIGHT_Z = 12;

type VariantSelectionContentProps = {
  sounds: UnderseaThemeSoundController;
};

function VariantSelectionContent({ sounds }: VariantSelectionContentProps) {
  const table = spanishPresentTable2Plural;
  const soundEnabled = useExerciseStore(state => state.soundEnabled);

  const { koiRect, jellyRect, orientation, screenWidth, screenHeight } = useExerciseLayout();

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
          blankSlotIndex={game.blankSlotIndex}
          blankExiting={game.blankExiting}
          blankExitDurationMs={ROUND_RESOLVE_FLY_DURATION_MS}
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
          roundPos={game.roundPos}
          correctOptionIndex={game.correctOptionIndex}
          onOptionTap={game.handleOptionTap}
        />
      </View>
      <View style={styles.resolveFlightLayer} pointerEvents="box-none">
        {game.resolveFlight != null && (
          <VariantSelectionResolveFlight
            phase={game.resolveFlightPhase}
            form={game.resolveFlight.form}
            translation={game.translation}
            fromCenterX={game.resolveFlight.fromCenterX}
            fromCenterY={game.resolveFlight.fromCenterY}
            toCenterX={game.resolveFlight.toCenterX}
            toCenterY={game.resolveFlight.toCenterY}
            diameter={game.resolveFlight.diameter}
            toSpawnX={game.resolveFlight.toSpawnX}
            toSpawnY={game.resolveFlight.toSpawnY}
            onResolveComplete={game.handleResolveComplete}
            onExitComplete={game.handleExitComplete}
          />
        )}
      </View>
      <TransformationInstructionBar
        message={game.instruction}
        centerY={instructionCenterY}
      />
      <ExerciseCornerControls helpVisible={false} />
    </View>
  );
}

function VariantSelectionContentWithSounds() {
  const { sounds } = useUnderseaThemeAssetsContext();
  return (
    <ExerciseRuntimeProvider>
      <ExerciseClockProvider>
        <VariantSelectionContent sounds={sounds} />
      </ExerciseClockProvider>
    </ExerciseRuntimeProvider>
  );
}

export function UnderseaThemeTableVariantSelectionExercise() {
  return (
    <ExerciseShell storeConfig={WORD_TRANSFORMATION_STORE_CONFIG}>
      <VariantSelectionContentWithSounds />
    </ExerciseShell>
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
  resolveFlightLayer: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    zIndex: RESOLVE_FLIGHT_Z,
  },
});
