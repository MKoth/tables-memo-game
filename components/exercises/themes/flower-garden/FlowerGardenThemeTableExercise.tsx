import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Canvas } from '@shopify/react-native-skia';
import { GestureDetector, useTapGesture } from 'react-native-gesture-handler';
import { runOnUI, useSharedValue } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { getTableBodyWords, spanishPresentTable2Plural } from '../../../../data/tableData';
import {
  ExerciseClockProvider,
  ExerciseRuntimeProvider,
  TABLE_EXERCISE_STORE_CONFIG,
  useExerciseLayout,
  useExerciseRuntime,
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
import { useFlowerGardenAssetsContext } from './core/providers/FlowerGardenAssetsProvider';
import { generateOrbPetalConfigs } from './orb/generateOrbPetalConfigs';
import { createRng, hashSeedString } from './scenery/BushShaderLayer/helpers/seededRandom';
import { CaptureOrb, getSpeciesImages } from './orb/CaptureOrb';
import { CapturedRoamerCanvas } from './orb/CapturedRoamerCanvas';
import { CaptureOrbCloudLayer } from './orb/CaptureOrbCloudLayer';
import { useOrbAnimation } from './orb/useOrbAnimation';
import {
  ORB_CAPTIVE_DRIFT_RATIO,
  ORB_DIAMETER_RATIO,
  ORB_RING_CONFIGS,
  ORB_ROAMER_TAP_HIT_RADIUS,
} from './orb/orbAnimPresets';
import { BurstIntent } from './orb/orbAnimTypes';
import { useFlowerGardenRoamerTapGesture } from './orb/useFlowerGardenRoamerTapGesture';
import { armRoamerExitFlight } from './roamer/core/exitFlightWorklets';
import { resolveRoamerExitLegs } from './roamer/core/resolveRoamerExitPath';
import type { RoamerRuntimeEntry } from './roamer/core/types';
import { FlightState } from './roamer/core/types';

const WORD_SPRITE_LAYER_Z = 5;
const SCENERY_Z = 1;
const ROAMER_Z = 2;
const ROAMER_GESTURE_Z = 3;
const ORB_CLOUD_Z = 4;
const ORB_Z = 6;
const ORB_TAP_Z = 7;
const ESCAPE_Z = 8;

function RoamerOrbLayer({
  words,
  interactive,
  sim,
  capturedRoamerIndexSv,
  eliminatedRoamerIndices,
}: {
  words: string[];
  interactive: boolean;
  sim: RoamerSimulation;
  capturedRoamerIndexSv: ReturnType<typeof useSharedValue<number>>;
  eliminatedRoamerIndices: number[];
}) {
  const { sounds, images } = useFlowerGardenAssetsContext();
  const { publishCaptureBridge } = useExerciseRuntime();
  const { screenWidth, screenHeight } = useExerciseLayout();
  const cloudPetalAtlasReady = images.cloudPetalAtlas != null;

  const [selection, setSelection] = useState<{
    roamerIndex: number;
    originX: number;
    originY: number;
  } | null>(null);
  const [poolHiddenRoamerIndex, setPoolHiddenRoamerIndex] = useState<number | null>(null);
  const [escapingRoamerIndex, setEscapingRoamerIndex] = useState<number | null>(null);
  const transitionRafRef = useRef<number | null>(null);

  useEffect(() => {
    if (escapingRoamerIndex != null && eliminatedRoamerIndices.includes(escapingRoamerIndex)) {
      setEscapingRoamerIndex(null);
    }
  }, [eliminatedRoamerIndices, escapingRoamerIndex]);

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
    (burstStartRealTimeMs: number, intent: number) => {
      'worklet';
      if (intent !== BurstIntent.Release) {
        return;
      }
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

  const { anim, phase, startBurst } = useOrbAnimation(
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

  const handleMatchSuccess = useCallback(
    (targetX: number, targetY: number, _hitIdx: number) => {
      if (selection == null) {
        return;
      }
      const entry = sim.runtimeEntries[selection.roamerIndex];
      if (entry == null) {
        return;
      }
      const legs = resolveRoamerExitLegs({
        waypointX: targetX,
        waypointY: targetY,
        screenWidth,
        screenHeight,
      });
      setPoolHiddenRoamerIndex(null);
      setEscapingRoamerIndex(selection.roamerIndex);
      setSelection(null);
      runOnUI(armRoamerExitFlight)(
        entry.runtime,
        capturedRoamerIndexSv,
        legs.leg1X,
        legs.leg1Y,
        legs.leg2X,
        legs.leg2Y,
      );
      startBurst(BurstIntent.Escape);
    },
    [
      selection,
      sim.runtimeEntries,
      capturedRoamerIndexSv,
      screenWidth,
      screenHeight,
      startBurst,
    ],
  );

  const roamerTapGesture = useFlowerGardenRoamerTapGesture({
    sharedPositions: sim.sharedPositions,
    roamerCount: sim.runtimeEntries.length,
    hitRadius: ORB_ROAMER_TAP_HIT_RADIUS,
    onRoamerTap: armCapture,
    excludedIndices: escapingRoamerIndex != null ? [escapingRoamerIndex] : [],
  });

  const dismissOrb = useCallback(() => {
    sounds.playOrbPop();
    startBurst(BurstIntent.Release);
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

  useLayoutEffect(() => {
    publishCaptureBridge(
      selection != null && capturedEntry != null
        ? {
            capturedWord: words[selection.roamerIndex] ?? null,
            orbPhase: phase,
            onMatchSuccess: handleMatchSuccess,
            overlay: null,
            escapeOverlayActive: false,
          }
        : null,
    );
  }, [
    capturedEntry,
    handleMatchSuccess,
    phase,
    publishCaptureBridge,
    selection,
    words,
  ]);

  const hiddenIndices = useMemo(() => {
    const list = [...eliminatedRoamerIndices];
    if (poolHiddenRoamerIndex != null && !list.includes(poolHiddenRoamerIndex)) {
      list.push(poolHiddenRoamerIndex);
    }
    if (escapingRoamerIndex != null && !list.includes(escapingRoamerIndex)) {
      list.push(escapingRoamerIndex);
    }
    return list;
  }, [eliminatedRoamerIndices, poolHiddenRoamerIndex, escapingRoamerIndex]);

  const capturedWord =
    capturedEntry != null && selection != null ? words[selection.roamerIndex] ?? null : null;

  const escapingEntry: RoamerRuntimeEntry | null =
    escapingRoamerIndex != null ? sim.runtimeEntries[escapingRoamerIndex] ?? null : null;
  const escapingSpeciesImages =
    escapingEntry != null ? getSpeciesImages(images, escapingEntry) : null;

  return (
    <>
      <View style={[styles.fullLayer, { zIndex: ROAMER_Z }]} pointerEvents="box-none">
        <FlowerGardenRoamerMotionZone
          words={words}
          interactive={interactive}
          sim={sim}
          hiddenIndices={hiddenIndices}
        />
      </View>
      {interactive && selection == null && (
        <GestureDetector gesture={roamerTapGesture}>
          <View style={[styles.fullLayer, { zIndex: ROAMER_GESTURE_Z }]} />
        </GestureDetector>
      )}
      {capturedEntry != null && cloudPetalAtlasReady && (
        <>
          {images.cloudPetalAtlas != null && (
            <View style={[styles.fullLayer, { zIndex: ORB_CLOUD_Z }]} pointerEvents="none">
              <CaptureOrbCloudLayer
                centerX={targetCenterX}
                centerY={targetCenterY}
                diameter={targetDiameter}
                phase={phase}
                atlas={images.cloudPetalAtlas.cloudImage}
                regions={images.cloudPetalAtlas.cloudRegions}
              />
            </View>
          )}
          <View style={[styles.fullLayer, { zIndex: ORB_Z }]} pointerEvents="none">
            <CaptureOrb
              anim={anim}
              capturedEntry={capturedEntry}
              petals={petals}
              centerX={targetCenterX}
              centerY={targetCenterY}
              word={capturedWord}
              targetDiameter={targetDiameter}
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
      {escapingEntry != null &&
        escapingSpeciesImages != null &&
        escapingSpeciesImages.body != null &&
        escapingSpeciesImages.leftWing != null &&
        escapingSpeciesImages.rightWing != null && (
          <View style={[styles.fullLayer, { zIndex: ESCAPE_Z }]} pointerEvents="none">
            <Canvas style={styles.fullCanvas}>
              <CapturedRoamerCanvas
                entry={escapingEntry}
                anim={anim}
                bodyImage={escapingSpeciesImages.body}
                leftWingImage={escapingSpeciesImages.leftWing}
                rightWingImage={escapingSpeciesImages.rightWing}
                centerX={0}
                centerY={0}
                escapeMode
              />
            </Canvas>
          </View>
        )}
    </>
  );
}

function SimAndLayers({
  words,
  interactive,
  onRoamerEscaped,
  eliminatedRoamerIndices,
}: {
  words: string[];
  interactive: boolean;
  onRoamerEscaped: (roamerIndex: number) => void;
  eliminatedRoamerIndices: number[];
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
    onRoamerEscaped,
  });

  return (
    <>
      <RoamerOrbLayer
        words={words}
        interactive={interactive}
        sim={sim}
        capturedRoamerIndexSv={capturedRoamerIndexSv}
        eliminatedRoamerIndices={eliminatedRoamerIndices}
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
  const [eliminatedRoamerIndices, setEliminatedRoamerIndices] = useState<number[]>([]);

  useEffect(() => {
    flowerSwingBoosts.value = new Array(Math.max(fieldFlowerConfigs.length, 1)).fill(0);
  }, [fieldFlowerConfigs.length, flowerSwingBoosts]);

  const handleRoamerEscaped = useCallback((roamerIndex: number) => {
    setEliminatedRoamerIndices(prev =>
      prev.includes(roamerIndex) ? prev : [...prev, roamerIndex],
    );
  }, []);

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
              onRoamerEscaped={handleRoamerEscaped}
              eliminatedRoamerIndices={eliminatedRoamerIndices}
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
  fullCanvas: {
    position: 'absolute',
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
  },
});
