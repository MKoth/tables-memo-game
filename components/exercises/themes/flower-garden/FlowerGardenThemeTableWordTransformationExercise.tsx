import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSharedValue } from 'react-native-reanimated';
import { getTableBodyWords, spanishPresentTable2Plural } from '../../../../data/tableData';
import {
  ExerciseClockProvider,
  ExerciseRuntimeProvider,
  WORD_TRANSFORMATION_STORE_CONFIG,
  useExerciseLayout,
  useExerciseRuntime,
  useExerciseStore,
} from '../../core';
import { useFlowerGardenAssetsContext } from './core/providers/FlowerGardenAssetsProvider';
import {
  TRANSFORMATION_VARIANT_ROW_Y_RATIO,
  TRANSFORMATION_WORD_ROW_Y_RATIO,
} from '../../core/layout/exerciseLayout';
import type { FlowerGardenSoundController } from './core/assets/useFlowerGardenThemeSounds';
import type { FlowerWordSpriteSoundKind } from './carrier/FlowerGardenWordSpriteTableLayer/types';
import { FlowerGardenWordSpriteTableLayer } from './carrier/FlowerGardenWordSpriteTableLayer/FlowerGardenWordSpriteTableLayerOuter';
import {
  FlowerGardenRoamerMotionZone,
  type FlowerGardenRoamerMotionZoneController,
} from './roamer/FlowerGardenRoamerMotionZone';
import { useFlowerGardenRoamerEscapeCoordinator } from './carrier/escape/useFlowerGardenRoamerEscapeCoordinator';
import { ExerciseShell } from '../../shared';
import { ExerciseCornerControls, TransformationInstructionBar } from '../../ui';
import { FlowerGardenScenery } from './scenery/FlowerGardenScenery';
import { FlowerGardenTableProvider } from './scenery/flowerGardenTableContext';
import { useFieldFlowerConfigs } from './scenery/FieldFlowerShaderLayer/useFieldFlowerConfigs';
import { FlowerGardenTransformationActorsCanvas } from './wordTransformationScene/FlowerGardenTransformationActorsCanvas';
import { useWordTransformationGame } from '../../wordTransformation/hooks/useWordTransformationGame';
import type { WordTransformationSceneState } from '../../wordTransformation/scene/sceneStateTypes';

const SCENERY_Z = 1;
const WORD_SPRITE_LAYER_Z = 5;
const ROAMER_Z = 10;
const ORB_LAYER_Z = 15;
type WordTransformationContentProps = {
  sounds: FlowerGardenSoundController;
};

function WordTransformationContent({ sounds }: WordTransformationContentProps) {
  const table = spanishPresentTable2Plural;
  const words = useMemo(() => getTableBodyWords(table), [table]);
  const soundEnabled = useExerciseStore(state => state.soundEnabled);

  const { wordSpriteBridge } = useExerciseRuntime();
  const { spriteRect, roamerRect } = useExerciseLayout();

  const fieldFlowerConfigs = useFieldFlowerConfigs();
  const flowerSwingBoosts = useSharedValue<number[]>([]);

  useEffect(() => {
    flowerSwingBoosts.value = new Array(Math.max(fieldFlowerConfigs.length, 1)).fill(0);
  }, [fieldFlowerConfigs.length, flowerSwingBoosts]);

  const roamerControllerRef = useRef<FlowerGardenRoamerMotionZoneController | null>(null);
  const handleSequenceSolved = useFlowerGardenRoamerEscapeCoordinator({
    roamerControllerRef,
    spriteBridge: wordSpriteBridge,
    spriteRect,
  });

  useEffect(() => {
    sounds.startAmbient();
    return () => {
      sounds.stopAmbient();
    };
  }, [sounds]);

  useEffect(() => {
    sounds.setMuted(!soundEnabled);
  }, [sounds, soundEnabled]);

  const handleWordSpriteSound = useCallback(
    (kind: FlowerWordSpriteSoundKind) => {
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

  const sceneStateSv = useSharedValue<WordTransformationSceneState>({
    wordOrbsVisible: true,
    lettersInteractive: true,
    letters: [],
    insertAnimation: null,
    variantPicker: {
      visible: false,
      interactive: false,
      items: [],
    },
  });

  const game = useWordTransformationGame({
    table,
    roamerRect,
    onSequenceSolved: handleSequenceSolved,
    onAllSolved: sounds.playFanfare,
    playPop: sounds.playOrbPop,
    playInflate: sounds.playOrbInflate,
    playWrong: sounds.playWrongClick,
    sceneStateSv,
  });

  const instructionCenterY =
    roamerRect.y +
    roamerRect.h *
      ((TRANSFORMATION_WORD_ROW_Y_RATIO + TRANSFORMATION_VARIANT_ROW_Y_RATIO) * 0.5);

  return (
    <FlowerGardenTableProvider value={{ table, fieldFlowerConfigs, flowerSwingBoosts }}>
      <View style={styles.container}>
        <View style={[styles.fullLayer, { zIndex: SCENERY_Z }]} pointerEvents="none">
          <FlowerGardenScenery />
        </View>
        <View style={[styles.fullLayer, { zIndex: WORD_SPRITE_LAYER_Z }]} pointerEvents="box-none">
          <FlowerGardenWordSpriteTableLayer
            table={table}
            onWordSpriteSound={handleWordSpriteSound}
            highlightedCellIndex={game.highlightedCellIndex}
            extraRevealedBodyIndices={game.revealedCellIndices}
          />
        </View>
        <View style={[styles.fullLayer, { zIndex: ROAMER_Z }]} pointerEvents="box-none">
          <FlowerGardenRoamerMotionZone
            words={words}
            interactive={false}
            controllerRef={roamerControllerRef}
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

function WordTransformationContentWithSounds() {
  const { sounds } = useFlowerGardenAssetsContext();
  return (
    <ExerciseRuntimeProvider>
      <ExerciseClockProvider>
        <WordTransformationContent sounds={sounds} />
      </ExerciseClockProvider>
    </ExerciseRuntimeProvider>
  );
}

export function FlowerGardenThemeTableWordTransformationExercise() {
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
  fullLayer: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
});
