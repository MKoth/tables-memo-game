import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSharedValue } from 'react-native-reanimated';
import { spanishPresentTable2Plural } from '../../../../data/tableData';
import {
  ExerciseClockProvider,
  ExerciseRuntimeProvider,
  WORD_TRANSFORMATION_STORE_CONFIG,
  useExerciseLayout,
  useExerciseStore,
  type ZoneRect,
} from '../../core';
import { useFlowerGardenAssetsContext } from './core/providers/FlowerGardenAssetsProvider';
import {
  blankSlotCenter,
  computeLetterLayout,
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
import { useSentenceTransformationGame } from '../../sentenceTransformation/hooks/useSentenceTransformationGame';
import { useFlowerGardenSentenceTransformationScene } from './exercises/sentenceTransformation/scene/useFlowerGardenSentenceTransformationScene';
import {
  FlowerGardenWordSpriteSentenceRowLayer,
  type FlowerGardenSentenceRowTapController,
} from './exercises/sentenceTransformation/components/FlowerGardenWordSpriteSentenceRowLayer';
import { FlowerGardenTransformationRoundResolutionOrb } from './exercises/sentenceTransformation/components/FlowerGardenTransformationRoundResolutionOrb';
import { computeMergeOrbDiameter } from './exercises/sentenceTransformation/components/FlowerGardenTransformationMergeOrbs';
import { FlowerGardenTransformationActorsCanvas } from './wordTransformationScene/FlowerGardenTransformationActorsCanvas';

/** Roses sit in the upper half; the letter/variant orbs take the lower half. */
const ROW_ZONE_FRACTION = 0.5;
/** Petal scatter band anchored at the top, near the roses. */
const PETAL_BAND_HEIGHT_RATIO = 0.32;
/** Rose size multiplier vs the default jellyfish-like sizing. */
const ROW_SIZE_SCALE = 1.5;
/** Pulls wrapped sentence lines closer together vertically. */
const ROW_LINE_HEIGHT_RATIO = 0.75;

const SCENERY_Z = 1;
const DECORATIVE_ROAMER_Z = 2;
const SENTENCE_ROW_LAYER_Z = 5;
const ORB_LAYER_Z = 15;
const RESOLUTION_LAYER_Z = 16;

type SentenceTransformationContentProps = {
  sounds: FlowerGardenSoundController;
};

function SentenceTransformationContent({ sounds }: SentenceTransformationContentProps) {
  const table = spanishPresentTable2Plural;
  const soundEnabled = useExerciseStore(state => state.soundEnabled);
  const { orientation, screenWidth, screenHeight } = useExerciseLayout();
  const isLandscape = orientation === 'landscapeLeft' || orientation === 'landscapeRight';

  const rowRect = useMemo<ZoneRect>(
    () =>
      isLandscape
        ? { x: screenWidth * ROW_ZONE_FRACTION, y: 0, w: screenWidth * (1 - ROW_ZONE_FRACTION), h: screenHeight }
        : { x: 0, y: 0, w: screenWidth, h: screenHeight * ROW_ZONE_FRACTION },
    [screenWidth, screenHeight, isLandscape],
  );
  const orbRect = useMemo<ZoneRect>(
    () =>
      isLandscape
        ? { x: 0, y: 0, w: screenWidth * ROW_ZONE_FRACTION, h: screenHeight }
        : { x: 0, y: screenHeight * ROW_ZONE_FRACTION, w: screenWidth, h: screenHeight * (1 - ROW_ZONE_FRACTION) },
    [screenWidth, screenHeight, isLandscape],
  );

  const rowSizeScale = isLandscape ? 1.2 : ROW_SIZE_SCALE;
  const rowLineHeightRatio = isLandscape ? 0.6 : ROW_LINE_HEIGHT_RATIO;
  const fieldFlowerConfigs = useFieldFlowerConfigs(
    isLandscape
      ? { bandTopRatio: 0.1, bandHeightRatio: 0.8, bandLeftRatio: 0, bandWidthRatio: 0.5 }
      : {},
  );
  const flowerSwingBoosts = useSharedValue<number[]>([]);
  const petalBandZone = useMemo<ZoneRect>(
    () =>
      isLandscape
        ? { x: 0, y: 0, w: screenWidth * PETAL_BAND_HEIGHT_RATIO, h: screenHeight }
        : { x: 0, y: 0, w: screenWidth, h: screenHeight * PETAL_BAND_HEIGHT_RATIO },
    [screenWidth, screenHeight, isLandscape],
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

  const game = useSentenceTransformationGame({
    table,
    orientation,
    screenWidth,
    screenHeight,
    roamerRect: orbRect,
    spriteRect: rowRect,
    rowSizeScale,
    rowLineHeightRatio,
    playPop: sounds.playOrbPop,
    playInflate: sounds.playOrbInflate,
    playWrong: sounds.playWrongClick,
    playSuccess: sounds.playSuccessClick,
  });

  const sceneStateSv = useFlowerGardenSentenceTransformationScene(game, orbRect);
  const rowTapControllerRef = useRef<FlowerGardenSentenceRowTapController | null>(null);

  const handleNeutralTap = useCallback((x: number, y: number) => {
    rowTapControllerRef.current?.handleTap(x, y);
  }, []);

  const mergeGeometry = useMemo(() => {
    if (game.mergeWord == null || game.mergeWord.length === 0) {
      return null;
    }
    const layout = computeLetterLayout(orbRect, game.mergeWord.length);
    const first = layout.centers[0] ?? orbRect.x + orbRect.w * 0.5;
    const last = layout.centers[layout.centers.length - 1] ?? first;
    const blank = blankSlotCenter(
      game.displaySlots,
      rowRect,
      orbRect,
      game.mergeWord,
      game.roundPos,
      rowSizeScale,
      rowLineHeightRatio,
    );
    return {
      centerX: (first + last) * 0.5,
      centerY: layout.rowY,
      diameter:
        blank?.footprintDiameter ??
        computeMergeOrbDiameter(game.mergeWord.length, orbRect.w, orbRect.h),
    };
  }, [game.mergeWord, game.displaySlots, game.roundPos, orbRect, rowRect, rowSizeScale, rowLineHeightRatio]);

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
        <View style={[styles.fullLayer, { zIndex: SENTENCE_ROW_LAYER_Z }]} pointerEvents="box-none">
          <FlowerGardenWordSpriteSentenceRowLayer
            displaySlots={game.displaySlots}
            conjugatedForm={game.conjugatedForm}
            roundPos={game.roundPos}
            roundPhase={game.roundPhase}
            motionPaths={game.motionPaths}
            blankSlotIndex={game.blankSlotIndex}
            blankExiting={game.blankExiting}
            poppingSlotIndex={game.poppingSlotIndex}
            onTokenTap={handleTokenTap}
            onRowEnterComplete={game.handleRowEnterComplete}
            onRowExitComplete={game.handleRowExitComplete}
            controllerRef={rowTapControllerRef}
            spriteRect={rowRect}
            roamerRect={orbRect}
            sizeScale={rowSizeScale}
            lineHeightRatio={rowLineHeightRatio}
          />
        </View>
        <View style={[styles.fullLayer, { zIndex: ORB_LAYER_Z }]} pointerEvents="box-none">
          <FlowerGardenTransformationActorsCanvas
            sceneStateSv={sceneStateSv}
            variantPickerItems={game.variantPickerItems}
            onLetterPress={game.handleLetterPress}
            onVariantSelect={game.handleVariantPress}
            playPop={sounds.playOrbPop}
            playInflate={sounds.playOrbInflate}
            onNeutralTap={handleNeutralTap}
          />
        </View>
        <View style={[styles.fullLayer, { zIndex: RESOLUTION_LAYER_Z }]} pointerEvents="box-none">
          <FlowerGardenTransformationRoundResolutionOrb
            orb={game.resolutionOrb}
            roundPhase={game.roundPhase}
            translation={game.bubbleTranslation}
            onMaterializeComplete={game.handleMaterializeComplete}
            onResolveComplete={game.handleResolveComplete}
            onPopComplete={game.handlePopComplete}
            mergeWord={game.mergeWord}
            mergeCenterX={mergeGeometry?.centerX}
            mergeCenterY={mergeGeometry?.centerY}
            mergeDiameter={mergeGeometry?.diameter}
            onMergeComplete={game.handleMergeComplete}
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

function SentenceTransformationContentWithSounds() {
  const { sounds } = useFlowerGardenAssetsContext();
  return (
    <ExerciseRuntimeProvider>
      <ExerciseClockProvider>
        <SentenceTransformationContent sounds={sounds} />
      </ExerciseClockProvider>
    </ExerciseRuntimeProvider>
  );
}

export function FlowerGardenThemeTableSentenceTransformationExercise() {
  return (
    <ExerciseShell storeConfig={WORD_TRANSFORMATION_STORE_CONFIG}>
      <SentenceTransformationContentWithSounds />
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
