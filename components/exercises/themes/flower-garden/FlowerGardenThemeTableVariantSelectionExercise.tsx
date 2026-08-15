import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { GestureDetector, useTapGesture } from 'react-native-gesture-handler';
import { useSharedValue } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { spanishPresentTable2Plural } from '../../../../data/tableData';
import {
  ExerciseClockProvider,
  ExerciseLayoutProvider,
  ExerciseRuntimeProvider,
  WORD_TRANSFORMATION_STORE_CONFIG,
  useExerciseLayout,
  useExerciseStore,
  type ExerciseZoneRatios,
  type ZoneRect,
} from '../../core';
import { useFlowerGardenAssetsContext } from './core/providers/FlowerGardenAssetsProvider';
import {
  TRANSFORMATION_VARIANT_ROW_Y_RATIO,
  TRANSFORMATION_WORD_ROW_Y_RATIO,
} from '../../core/layout/exerciseLayout';
import type { FlowerGardenSoundController } from './core/assets/useFlowerGardenThemeSounds';
import { FlowerGardenScenery } from './scenery/FlowerGardenScenery';
import { FlowerGardenTableProvider } from './scenery/flowerGardenTableContext';
import { useFieldFlowerConfigs } from './scenery/FieldFlowerShaderLayer/useFieldFlowerConfigs';
import { FlowerGardenDecorativeRoamerLayer } from './roamer/FlowerGardenDecorativeRoamerLayer';
import { ExerciseShell } from '../../shared';
import { ExerciseCornerControls, TransformationInstructionBar } from '../../ui';
import { useVariantSelectionGame } from '../../variantSelection/hooks/useVariantSelectionGame';
import { ROUND_RESOLVE_FLY_DURATION_MS } from '../../variantSelection/domain/roundResolutionTiming';
import {
  FlowerGardenWordSpriteSentenceRowLayer,
  type FlowerGardenSentenceRowTapController,
} from './exercises/sentenceTransformation/components/FlowerGardenWordSpriteSentenceRowLayer';
import { FlowerGardenOptionWordSpriteLayer } from './exercises/variantSelection/components/FlowerGardenOptionWordSpriteLayer';
import { TAP_MAX_DISTANCE_PX } from './carrier/FlowerGardenWordSpriteTableLayer/config/flowerTableLayerConfig';

const FULL_SCREEN_ZONE_RATIOS: ExerciseZoneRatios = {
  roamerFraction: 1,
  wordSpriteInsetRatio: 0,
  wordSpriteHeightFraction: 1,
};

/** Roses sit in the upper half; the option word orbs take the lower half. */
const ROW_ZONE_FRACTION = 0.5;
/** Petal scatter band anchored at the top, near the roses. */
const PETAL_BAND_HEIGHT_RATIO = 0.32;
/** Rose size multiplier vs the default jellyfish-like sizing. */
const ROW_SIZE_SCALE = 1.5;
/** Pulls wrapped sentence lines closer together vertically. */
const ROW_LINE_HEIGHT_RATIO = 0.75;

const SCENERY_Z = 1;
const DECORATIVE_ROAMER_Z = 2;
const ROW_TAP_Z = 4;
const SENTENCE_ROW_LAYER_Z = 5;
const OPTION_LAYER_Z = 10;

type RowTapSurfaceProps = {
  onTap: (x: number, y: number) => void;
};

function RowTapSurface({ onTap }: RowTapSurfaceProps) {
  const tapGesture = useTapGesture({
    maxDistance: TAP_MAX_DISTANCE_PX,
    onDeactivate: event => {
      'worklet';
      scheduleOnRN(onTap, event.x, event.y);
    },
  });

  return (
    <GestureDetector gesture={tapGesture}>
      <View style={[styles.fullLayer, { zIndex: ROW_TAP_Z }]} />
    </GestureDetector>
  );
}

type VariantSelectionContentProps = {
  sounds: FlowerGardenSoundController;
};

function VariantSelectionContent({ sounds }: VariantSelectionContentProps) {
  const table = spanishPresentTable2Plural;
  const soundEnabled = useExerciseStore(state => state.soundEnabled);
  const { orientation, screenWidth, screenHeight } = useExerciseLayout();

  const rowRect = useMemo<ZoneRect>(
    () => ({ x: 0, y: 0, w: screenWidth, h: screenHeight * ROW_ZONE_FRACTION }),
    [screenWidth, screenHeight],
  );
  const orbRect = useMemo<ZoneRect>(
    () => ({
      x: 0,
      y: screenHeight * ROW_ZONE_FRACTION,
      w: screenWidth,
      h: screenHeight * (1 - ROW_ZONE_FRACTION),
    }),
    [screenWidth, screenHeight],
  );

  const fieldFlowerConfigs = useFieldFlowerConfigs();
  const flowerSwingBoosts = useSharedValue<number[]>([]);
  const petalBandZone = useMemo<ZoneRect>(
    () => ({ x: 0, y: 0, w: screenWidth, h: screenHeight * PETAL_BAND_HEIGHT_RATIO }),
    [screenWidth, screenHeight],
  );

  useEffect(() => {
    flowerSwingBoosts.value = new Array(Math.max(fieldFlowerConfigs.length, 1)).fill(0);
  }, [fieldFlowerConfigs.length, flowerSwingBoosts]);

  useEffect(() => {
    sounds.startAmbient();
    return () => {
      sounds.stopAmbient();
    };
  }, [sounds]);

  useEffect(() => {
    sounds.setMuted(!soundEnabled);
  }, [sounds, soundEnabled]);

  const handleTokenTap = useCallback(() => {
    sounds.playPrimaryClick();
  }, [sounds]);

  const rowTapControllerRef = useRef<FlowerGardenSentenceRowTapController | null>(null);

  const handleRowTapJs = useCallback((x: number, y: number) => {
    rowTapControllerRef.current?.handleTap(x, y);
  }, []);

  const game = useVariantSelectionGame({
    table,
    orientation,
    screenWidth,
    screenHeight,
    roamerRect: orbRect,
    spriteRect: rowRect,
    rowSizeScale: ROW_SIZE_SCALE,
    rowLineHeightRatio: ROW_LINE_HEIGHT_RATIO,
    playSuccess: sounds.playSuccessClick,
    playWrong: sounds.playWrongClick,
  });

  const instructionCenterY =
    orbRect.y +
    orbRect.h *
      ((TRANSFORMATION_WORD_ROW_Y_RATIO + TRANSFORMATION_VARIANT_ROW_Y_RATIO) * 0.5);

  return (
    <FlowerGardenTableProvider
      value={{
        table: null,
        fieldFlowerConfigs,
        flowerSwingBoosts,
        groundScatterBandZone: petalBandZone,
      }}>
      <View style={styles.container}>
        <View style={[styles.fullLayer, { zIndex: SCENERY_Z }]} pointerEvents="none">
          <FlowerGardenScenery />
        </View>
        <View style={[styles.fullLayer, { zIndex: DECORATIVE_ROAMER_Z }]} pointerEvents="none">
          <FlowerGardenDecorativeRoamerLayer />
        </View>
        <RowTapSurface onTap={handleRowTapJs} />
        <View style={[styles.fullLayer, { zIndex: SENTENCE_ROW_LAYER_Z }]} pointerEvents="box-none">
          <FlowerGardenWordSpriteSentenceRowLayer
            displaySlots={game.displaySlots}
            conjugatedForm={game.conjugatedForm}
            roundPos={game.roundPos}
            roundPhase={game.roundPhase}
            motionPaths={game.motionPaths}
            blankSlotIndex={game.blankSlotIndex}
            blankExiting={game.blankExiting}
            blankExitDurationMs={ROUND_RESOLVE_FLY_DURATION_MS}
            poppingSlotIndex={null}
            onTokenTap={handleTokenTap}
            onRowEnterComplete={game.handleRowEnterComplete}
            onRowExitComplete={game.handleRowExitComplete}
            controllerRef={rowTapControllerRef}
            spriteRect={rowRect}
            roamerRect={orbRect}
            sizeScale={ROW_SIZE_SCALE}
            lineHeightRatio={ROW_LINE_HEIGHT_RATIO}
          />
        </View>
        <View style={[styles.fullLayer, { zIndex: OPTION_LAYER_Z }]} pointerEvents="box-none">
          <FlowerGardenOptionWordSpriteLayer
            options={game.options}
            motionPaths={game.optionMotionPaths}
            roundPhase={game.roundPhase}
            roundPos={game.roundPos}
            correctOptionIndex={game.correctOptionIndex}
            onOptionTap={game.handleOptionTap}
            roamerRect={orbRect}
            resolveTargetX={game.resolveFlight?.toCenterX}
            resolveTargetY={game.resolveFlight?.toCenterY}
            resolveExitX={game.resolveFlight?.toSpawnX}
            resolveExitY={game.resolveFlight?.toSpawnY}
            onResolveComplete={game.handleResolveComplete}
            onExitComplete={game.handleExitComplete}
            translation={game.translation}
          />
        </View>
        <TransformationInstructionBar
          message={game.instruction}
          centerY={instructionCenterY}
        />
        <ExerciseCornerControls helpVisible={false} />
      </View>
    </FlowerGardenTableProvider>
  );
}

function VariantSelectionContentWithSounds() {
  const { sounds } = useFlowerGardenAssetsContext();
  return (
    <ExerciseRuntimeProvider>
      <ExerciseClockProvider>
        <VariantSelectionContent sounds={sounds} />
      </ExerciseClockProvider>
    </ExerciseRuntimeProvider>
  );
}

export function FlowerGardenThemeTableVariantSelectionExercise() {
  return (
    <ExerciseShell storeConfig={WORD_TRANSFORMATION_STORE_CONFIG}>
      <ExerciseLayoutProvider zoneRatios={FULL_SCREEN_ZONE_RATIOS}>
        <VariantSelectionContentWithSounds />
      </ExerciseLayoutProvider>
    </ExerciseShell>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  fullLayer: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
});
