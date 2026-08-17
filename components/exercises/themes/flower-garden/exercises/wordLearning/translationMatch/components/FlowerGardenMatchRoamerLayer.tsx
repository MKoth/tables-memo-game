import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Canvas } from '@shopify/react-native-skia';
import { runOnUI, useAnimatedReaction, useSharedValue } from 'react-native-reanimated';
import type { SharedValue } from 'react-native-reanimated';
import { useExerciseClockQuantized, useExerciseLayout } from '../../../../../../core';
import { useFlowerGardenAssetsContext } from '../../../../core/providers/FlowerGardenAssetsProvider';
import { RoamerLayer } from '../../../../roamer/RoamerLayer';
import { useRoamerSimulation } from '../../../../roamer/core/useRoamerSimulation';
import { hashSeedString } from '../../../../scenery/BushShaderLayer/helpers/seededRandom';
import { CaptureOrb, getSpeciesImages } from '../../../../orb/CaptureOrb';
import { CapturedRoamerCanvas } from '../../../../orb/CapturedRoamerCanvas';
import { OrbPhase, BurstIntent, useOrbAnimation } from '../../../../orb/useOrbAnimation';
import {
  ORB_CAPTIVE_DRIFT_RATIO,
  ORB_DIAMETER_RATIO,
  ORB_IDLE_CLOCK_FPS,
  ORB_ROAMER_TAP_HIT_RADIUS,
} from '../../../../orb/orbAnimPresets';
import { armRoamerExitFlight } from '../../../../roamer/core/exitFlightWorklets';
import { resolveRoamerExitLegs } from '../../../../roamer/core/resolveRoamerExitPath';
import type { ThemeMatchRoamerLayerProps } from '../../../../../../themeContract';
import type { RoamerRuntimeEntry } from '../../../../roamer/core/types';
import { FlightState } from '../../../../roamer/core/types';
import type { KeepOutDisk } from '../../../../../../wordLearning/translationMatch/domain/wordSpriteRoaming';
import type { FlowerGardenMatchRoamerTapData } from '../flowerGarden/useFlowerGardenCombinedMatchGestures';

const MATCH_ROAMER_Z = 3;
const MATCH_ORB_Z = 6;
const MATCH_ESCAPE_Z = 8;

export type FlowerGardenMatchRoamerLayerProps = ThemeMatchRoamerLayerProps & {
  /** Position of the matched rose, read when the correct-match escape fires. */
  escapeWaypointSv?: SharedValue<{ x: number; y: number } | null>;
  /** Override the swim zone rect (defaults to the layout's roamerRect). */
  roamerRect?: import('../../../../../../core/layout/computeExerciseLayout').ZoneRect;
};

export function FlowerGardenMatchRoamerLayer({
  words,
  sounds,
  sessionController,
  triggerEscapeRef,
  tapDataRef,
  interactive = true,
  keepOutDiskSv,
  escapeWaypointSv,
  roamerRect: overrideRect,
}: FlowerGardenMatchRoamerLayerProps) {
  const layout = useExerciseLayout();
  const { roamerRect: layoutRect, screenWidth, screenHeight, layoutKey } = layout;
  const roamerRect = overrideRect ?? layoutRect;
  const { images } = useFlowerGardenAssetsContext();
  const idleClock = useExerciseClockQuantized(ORB_IDLE_CLOCK_FPS);
  const orbReady = images.orbRingImages != null && images.orbBedImages != null;

  const capturedRoamerIndexSv = useSharedValue(-1);

  const orbCaptureCenterX = roamerRect.x + roamerRect.w * 0.5;
  const orbCaptureCenterY = roamerRect.y + roamerRect.h * 0.5;
  const orbCaptureRadius =
    Math.min(roamerRect.w, roamerRect.h) *
    ORB_DIAMETER_RATIO *
    0.5 *
    (1 - ORB_CAPTIVE_DRIFT_RATIO);

  const [eliminatedRoamerIndices, setEliminatedRoamerIndices] = useState<number[]>([]);
  const [escapingRoamerIndex, setEscapingRoamerIndex] = useState<number | null>(null);
  /** Written synchronously when an escape arms, so taps are excluded before any re-render. */
  const departingRoamerIndicesSv = useSharedValue<number[]>([]);

  const handleRoamerEscaped = useCallback(
    (roamerIndex: number) => {
      departingRoamerIndicesSv.value = departingRoamerIndicesSv.value.filter(
        i => i !== roamerIndex,
      );
      setEliminatedRoamerIndices(prev => {
        if (prev.includes(roamerIndex)) {
          return prev;
        }
        return [...prev, roamerIndex];
      });
    },
    [departingRoamerIndicesSv],
  );

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
    onRoamerEscaped: handleRoamerEscaped,
  });

  const orbSeed = useMemo(() => hashSeedString('flower-garden-orb-match'), []);

  const [selection, setSelection] = useState<{
    roamerIndex: number;
    word: string;
    originX: number;
    originY: number;
  } | null>(null);
  const [poolHiddenRoamerIndex, setPoolHiddenRoamerIndex] = useState<number | null>(null);
  const transitionRafRef = useRef<number | null>(null);
  const soundsRef = useRef(sounds);
  soundsRef.current = sounds;

  useEffect(() => {
    if (
      escapingRoamerIndex != null &&
      eliminatedRoamerIndices.includes(escapingRoamerIndex)
    ) {
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

  const targetCenterX = roamerRect.x + roamerRect.w * 0.5;
  const targetCenterY = roamerRect.y + roamerRect.h * 0.5;
  const targetDiameter = Math.min(roamerRect.w, roamerRect.h) * ORB_DIAMETER_RATIO;

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
    sessionController?.release();
    setPoolHiddenRoamerIndex(null);
    transitionRafRef.current = requestAnimationFrame(() => {
      transitionRafRef.current = null;
      setSelection(null);
    });
  }, [cancelTransitionRaf, sessionController]);

  const { anim, phase, startBurst } = useOrbAnimation(
    orbConfig,
    handleDismiss,
    selection != null,
    releaseRoamerFromOrb,
    undefined,
    idleClock,
  );

  useAnimatedReaction(
    () => phase.value,
    (currentPhase, prevPhase) => {
      if (keepOutDiskSv == null) {
        return;
      }
      if (currentPhase === OrbPhase.Idle) {
        keepOutDiskSv.value = {
          centerX: targetCenterX,
          centerY: targetCenterY,
          radius: targetDiameter * 0.5,
        } satisfies KeepOutDisk;
      } else if (
        prevPhase != null &&
        prevPhase === OrbPhase.Idle &&
        currentPhase !== OrbPhase.Idle
      ) {
        keepOutDiskSv.value = null;
      }
    },
    [keepOutDiskSv, targetCenterX, targetCenterY, targetDiameter],
  );

  const armCapture = useCallback(
    (roamerIndex: number, originX: number, originY: number) => {
      if (
        departingRoamerIndicesSv.value.includes(roamerIndex) ||
        escapingRoamerIndex === roamerIndex ||
        eliminatedRoamerIndices.includes(roamerIndex)
      ) {
        return;
      }
      cancelTransitionRaf();
      soundsRef.current?.playOrbInflate();
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
      setSelection({ roamerIndex, word: words[roamerIndex] ?? '', originX, originY });
      setPoolHiddenRoamerIndex(roamerIndex);
    },
    [
      cancelTransitionRaf,
      sim.runtimeEntries,
      capturedRoamerIndexSv,
      words,
      escapingRoamerIndex,
      eliminatedRoamerIndices,
      departingRoamerIndicesSv,
    ],
  );

  useEffect(() => {
    if (!triggerEscapeRef) {
      return;
    }
    const previous = triggerEscapeRef.current;
    triggerEscapeRef.current = () => {
      if (previous) {
        previous();
      }
      if (selection == null) {
        return;
      }
      const entry = sim.runtimeEntries[selection.roamerIndex];
      if (entry == null) {
        return;
      }
      const waypoint = escapeWaypointSv?.value;
      const waypointX = waypoint?.x ?? entry.runtime.x.value;
      const waypointY = waypoint?.y ?? entry.runtime.y.value;
      const legs = resolveRoamerExitLegs({
        waypointX,
        waypointY,
        screenWidth,
        screenHeight,
      });
      const departing = departingRoamerIndicesSv.value;
      if (!departing.includes(selection.roamerIndex)) {
        departingRoamerIndicesSv.value = [...departing, selection.roamerIndex];
      }
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
    };
    return () => {
      triggerEscapeRef.current = previous;
    };
  }, [
    startBurst,
    triggerEscapeRef,
    selection,
    sim.runtimeEntries,
    screenWidth,
    screenHeight,
    escapeWaypointSv,
    capturedRoamerIndexSv,
    departingRoamerIndicesSv,
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

  if (tapDataRef) {
    const data: FlowerGardenMatchRoamerTapData = {
      sharedPositions: sim.sharedPositions,
      roamerCount: sim.runtimeEntries.length,
      hitRadius: ORB_ROAMER_TAP_HIT_RADIUS,
      eliminatedIndices: [...hiddenIndices, ...departingRoamerIndicesSv.value],
      words,
      onRoamerSelect: (roamerIndex: number, originX: number, originY: number) => {
        if (
          departingRoamerIndicesSv.value.includes(roamerIndex) ||
          hiddenIndices.includes(roamerIndex)
        ) {
          return;
        }
        if (sessionController != null) {
          const word = words[roamerIndex] ?? '';
          const captured = sessionController.captureRoamer(roamerIndex, word);
          if (!captured) {
            return;
          }
        }
        armCapture(roamerIndex, originX, originY);
      },
      orbAnim: anim,
      orbPhase: phase,
      startBurst,
    };
    tapDataRef.current = data;
  }

  const capturedEntry: RoamerRuntimeEntry | null =
    selection != null ? sim.runtimeEntries[selection.roamerIndex] ?? null : null;

  const escapingEntry: RoamerRuntimeEntry | null =
    escapingRoamerIndex != null ? sim.runtimeEntries[escapingRoamerIndex] ?? null : null;
  const escapingSpeciesImages =
    escapingEntry != null ? getSpeciesImages(images, escapingEntry) : null;

  if (screenWidth === 0 || screenHeight === 0) {
    return null;
  }

  return (
    <>
      <View
        style={[styles.container, { zIndex: MATCH_ROAMER_Z }]}
        pointerEvents="box-none">
        <RoamerLayer
          words={words}
          interactive={interactive}
          sim={sim}
          hiddenIndices={hiddenIndices}
        />
      </View>
      {capturedEntry != null && orbReady && (
        <View
          style={[styles.container, { zIndex: MATCH_ORB_Z }]}
          pointerEvents="none">
          <CaptureOrb
            anim={anim}
            capturedEntry={capturedEntry}
            centerX={targetCenterX}
            centerY={targetCenterY}
            word={selection?.word ?? null}
            targetDiameter={targetDiameter}
            seed={orbSeed}
          />
        </View>
      )}
      {escapingEntry != null &&
        escapingSpeciesImages != null &&
        escapingSpeciesImages.body != null &&
        escapingSpeciesImages.leftWing != null &&
        escapingSpeciesImages.rightWing != null && (
          <View
            style={[styles.container, { zIndex: MATCH_ESCAPE_Z }]}
            pointerEvents="none">
            <Canvas style={styles.canvas}>
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

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    overflow: 'visible',
  },
  canvas: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
});
