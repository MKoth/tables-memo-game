import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { GestureDetector, useTapGesture } from 'react-native-gesture-handler';
import { useSharedValue } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { getTableBodyWords, spanishPresentTable2Plural } from '../../../../data/tableData';
import {
  ExerciseClockProvider,
  ExerciseRuntimeProvider,
  TABLE_EXERCISE_STORE_CONFIG,
  useExerciseLayout,
  useExerciseStore,
} from '../../core';
import { FlowerGardenWordSpriteTableLayer } from './carrier/FlowerGardenWordSpriteTableLayer/FlowerGardenWordSpriteTableLayerOuter';
import { FlowerGardenRoamerMotionZone } from './roamer/FlowerGardenRoamerMotionZone';
import { ExerciseShell } from '../../shared';
import { ExerciseCornerControls } from '../../ui';
import { FlowerGardenScenery } from './scenery/FlowerGardenScenery';
import { FlowerGardenTableProvider } from './scenery/flowerGardenTableContext';
import { useFieldFlowerConfigs } from './scenery/FieldFlowerShaderLayer/useFieldFlowerConfigs';
import { useRoamerSimulation, type RoamerSimulation } from './roamer/core/useRoamerSimulation';
import { FlowerGardenParticleLayer } from './roamer/particles/FlowerGardenParticleLayer';
import { PARTICLE_Z } from './roamer/particles/particleConfig';
import { useFlowerGardenAssetsContext } from './core/providers/FlowerGardenAssetsProvider';
import { generateOrbPetalConfigs } from './orb/generateOrbPetalConfigs';
import { createRng, hashSeedString } from './scenery/BushShaderLayer/helpers/seededRandom';
import { CaptureOrb } from './orb/CaptureOrb';
import { useOrbAnimation } from './orb/useOrbAnimation';
import {
  ORB_CAPTIVE_DRIFT_RATIO,
  ORB_DIAMETER_RATIO,
  ORB_RING_CONFIGS,
  ORB_ROAMER_TAP_HIT_RADIUS,
} from './orb/orbAnimPresets';
import { useFlowerGardenRoamerTapGesture } from './orb/useFlowerGardenRoamerTapGesture';
import type { RoamerRuntimeEntry } from './roamer/core/types';
import { FlightState } from './roamer/core/types';

const WORD_SPRITE_LAYER_Z = 5;
const SCENERY_Z = 1;
const ROAMER_Z = 2;
const ROAMER_GESTURE_Z = 3;
const ORB_Z = 6;
const ORB_TAP_Z = 7;

function RoamerOrbLayer({
  words,
  interactive,
  sim,
  capturedRoamerIndexSv,
}: {
  words: string[];
  interactive: boolean;
  sim: RoamerSimulation;
  capturedRoamerIndexSv: ReturnType<typeof useSharedValue<number>>;
}) {
  const { sounds, images } = useFlowerGardenAssetsContext();
  const orbPetalImagesReady = images.orbPetalImages != null;

  const [selection, setSelection] = useState<{
    roamerIndex: number;
    originX: number;
    originY: number;
  } | null>(null);
  const [poolHiddenRoamerIndex, setPoolHiddenRoamerIndex] = useState<number | null>(null);
  const transitionRafRef = useRef<number | null>(null);

  const cancelTransitionRaf = useCallback(() => {
    if (transitionRafRef.current != null) {
      cancelAnimationFrame(transitionRafRef.current);
      transitionRafRef.current = null;
    }
  }, []);

  useEffect(() => () => cancelTransitionRaf(), [cancelTransitionRaf]);

  const petalSeed = useMemo(() => hashSeedString('flower-garden-orb-table'), []);
  const petals = useMemo(
    () =>
      generateOrbPetalConfigs({
        rng: createRng(petalSeed),
      }),
    [petalSeed],
  );

  const targetCenterX = sim.swimZone.x + sim.swimZone.w * 0.5;
  const targetCenterY = sim.swimZone.y + sim.swimZone.h * 0.5;
  const targetDiameter = Math.min(sim.swimZone.w, sim.swimZone.h) * ORB_DIAMETER_RATIO;

  const orbConfig = useMemo(
    () => ({
      originX: selection?.originX ?? targetCenterX,
      originY: selection?.originY ?? targetCenterY,
      targetCenterX,
      targetCenterY,
      targetDiameter,
    }),
    [
      selection?.originX,
      selection?.originY,
      targetCenterX,
      targetCenterY,
      targetDiameter,
    ],
  );

  const releaseRoamerFromOrb = useCallback(
    (_burstStartRealTimeMs: number) => {
      'worklet';
      capturedRoamerIndexSv.value = -1;
      if (selection == null) {
        return;
      }
      const entry = sim.runtimeEntries[selection.roamerIndex];
      if (entry == null) {
        return;
      }
      entry.runtime.state.value = FlightState.FLYING_CRUISE;
      entry.runtime.bodyScale.value = 1;
      entry.runtime.isPreTakeoff.value = 0;
      entry.runtime.sitTimer.value = 0;
      entry.runtime.sitWingPauseTimer.value = 0;
      entry.runtime.sitWingPauseTriggered.value = 0;
      entry.runtime.sitOffsetX.value = 0;
      entry.runtime.sitOffsetY.value = 0;
      entry.runtime.sitTargetOffsetX.value = 0;
      entry.runtime.sitTargetOffsetY.value = 0;
      entry.runtime.sitActionTimer.value = 0;
    },
    [selection, sim, capturedRoamerIndexSv],
  );

  const handleDismiss = useCallback(() => {
    cancelTransitionRaf();
    setPoolHiddenRoamerIndex(null);
    transitionRafRef.current = requestAnimationFrame(() => {
      transitionRafRef.current = null;
      setSelection(null);
    });
  }, [cancelTransitionRaf]);

  const { anim, startBurst } = useOrbAnimation(
    orbConfig,
    ORB_RING_CONFIGS,
    petals,
    handleDismiss,
    selection != null,
    releaseRoamerFromOrb,
  );

  const armCapture = useCallback(
    (roamerIndex: number, originX: number, originY: number) => {
      cancelTransitionRaf();
      sounds.playOrbInflate();
      capturedRoamerIndexSv.value = roamerIndex;
      const entry = sim.runtimeEntries[roamerIndex];
      if (entry != null) {
        entry.runtime.state.value = FlightState.FLYING_CRUISE;
        entry.runtime.bodyScale.value = 1;
        entry.runtime.isPreTakeoff.value = 0;
        entry.runtime.sitTimer.value = 0;
        entry.runtime.sitWingPauseTimer.value = 0;
        entry.runtime.sitWingPauseTriggered.value = 0;
        entry.runtime.sitOffsetX.value = 0;
        entry.runtime.sitOffsetY.value = 0;
        entry.runtime.sitTargetOffsetX.value = 0;
        entry.runtime.sitTargetOffsetY.value = 0;
        entry.runtime.sitActionTimer.value = 0;
      }
      setSelection({ roamerIndex, originX, originY });
      setPoolHiddenRoamerIndex(roamerIndex);
    },
    [cancelTransitionRaf, sounds, sim.runtimeEntries, capturedRoamerIndexSv],
  );

  const roamerTapGesture = useFlowerGardenRoamerTapGesture({
    sharedPositions: sim.sharedPositions,
    roamerCount: sim.runtimeEntries.length,
    hitRadius: ORB_ROAMER_TAP_HIT_RADIUS,
    onRoamerTap: armCapture,
  });

  const dismissOrb = useCallback(() => {
    sounds.playOrbPop();
    startBurst();
  }, [sounds, startBurst]);

  const orbDismissGesture = useTapGesture({
    maxDistance: 10,
    onDeactivate: () => {
      'worklet';
      scheduleOnRN(dismissOrb);
    },
  });

  const capturedEntry: RoamerRuntimeEntry | null =
    selection != null ? sim.runtimeEntries[selection.roamerIndex] ?? null : null;

  return (
    <>
      <View style={[styles.fullLayer, { zIndex: ROAMER_Z }]} pointerEvents="box-none">
        <FlowerGardenRoamerMotionZone
          words={words}
          interactive={interactive}
          sim={sim}
          hiddenIndices={poolHiddenRoamerIndex != null ? [poolHiddenRoamerIndex] : []}
        />
      </View>
      {interactive && (
        <GestureDetector gesture={roamerTapGesture}>
          <View style={[styles.fullLayer, { zIndex: ROAMER_GESTURE_Z }]} />
        </GestureDetector>
      )}
      {capturedEntry != null && orbPetalImagesReady && (
        <>
          <View style={[styles.fullLayer, { zIndex: ORB_Z }]} pointerEvents="none">
            <CaptureOrb
              anim={anim}
              capturedEntry={capturedEntry}
              petals={petals}
              centerX={targetCenterX}
              centerY={targetCenterY}
            />
          </View>
          {interactive && (
            <GestureDetector gesture={orbDismissGesture}>
              <View
                style={[
                  styles.orbTapZone,
                  {
                    left: targetCenterX - targetDiameter * 0.5,
                    top: targetCenterY - targetDiameter * 0.5,
                    width: targetDiameter,
                    height: targetDiameter,
                    zIndex: ORB_TAP_Z,
                  },
                ]}
              />
            </GestureDetector>
          )}
        </>
      )}
    </>
  );
}

function SimAndLayers({
  words,
  interactive,
}: {
  words: string[];
  interactive: boolean;
}) {
  const layout = useExerciseLayout();
  const { roamerRect, screenWidth, screenHeight, layoutKey } = layout;
  const capturedRoamerIndexSv = useSharedValue(-1);

  const orbCaptureCenterX = roamerRect.x + roamerRect.w * 0.5;
  const orbCaptureCenterY = roamerRect.y + roamerRect.h * 0.5;
  const orbCaptureRadius =
    Math.min(roamerRect.w, roamerRect.h) *
    ORB_DIAMETER_RATIO *
    0.5 *
    (1 - ORB_CAPTIVE_DRIFT_RATIO);

  const sim = useRoamerSimulation({
    words,
    width: screenWidth,
    height: screenHeight,
    roamerRect,
    layoutKey,
    capturedRoamerIndex: capturedRoamerIndexSv,
    orbCaptureCenterX,
    orbCaptureCenterY,
    orbCaptureRadius,
  });

  return (
    <>
      <View style={[styles.fullLayer, { zIndex: PARTICLE_Z }]} pointerEvents="none">
        <FlowerGardenParticleLayer
          runtimeEntries={sim.runtimeEntries}
          width={screenWidth}
          height={screenHeight}
        />
      </View>
      <RoamerOrbLayer
        words={words}
        interactive={interactive}
        sim={sim}
        capturedRoamerIndexSv={capturedRoamerIndexSv}
      />
    </>
  );
}

function FlowerGardenExerciseContent() {
  const table = spanishPresentTable2Plural;
  const words = useMemo(() => getTableBodyWords(table), [table]);
  const tutorialStep = useExerciseStore((state) => state.tutorialStep);
  const tutorialActive = tutorialStep !== 'idle';
  const fieldFlowerConfigs = useFieldFlowerConfigs();
  const flowerSwingBoosts = useSharedValue<number[]>([]);

  useEffect(() => {
    flowerSwingBoosts.value = new Array(Math.max(fieldFlowerConfigs.length, 1)).fill(0);
  }, [fieldFlowerConfigs.length, flowerSwingBoosts]);

  return (
    <ExerciseRuntimeProvider>
      <ExerciseClockProvider>
        <FlowerGardenTableProvider value={{ table, fieldFlowerConfigs, flowerSwingBoosts }}>
          <View style={styles.container}>
            <View style={styles.sceneryLayer} pointerEvents="none">
              <FlowerGardenScenery />
            </View>
            <SimAndLayers
              words={words}
              interactive={!tutorialActive}
            />
            <View style={styles.wordSpriteLayer} pointerEvents="box-none">
              <FlowerGardenWordSpriteTableLayer
                table={table}
                interactive={!tutorialActive}
              />
            </View>
            <ExerciseCornerControls />
          </View>
        </FlowerGardenTableProvider>
      </ExerciseClockProvider>
    </ExerciseRuntimeProvider>
  );
}

export function FlowerGardenThemeTableExercise() {
  return (
    <ExerciseShell storeConfig={TABLE_EXERCISE_STORE_CONFIG}>
      <FlowerGardenExerciseContent />
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
  sceneryLayer: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    zIndex: SCENERY_Z,
  },
  wordSpriteLayer: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    zIndex: WORD_SPRITE_LAYER_Z,
  },
  orbTapZone: {
    position: 'absolute',
  },
});
