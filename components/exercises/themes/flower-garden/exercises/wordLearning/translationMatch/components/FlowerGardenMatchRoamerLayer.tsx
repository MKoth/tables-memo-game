import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';
import { useAnimatedReaction, useSharedValue } from 'react-native-reanimated';
import { useExerciseLayout } from '../../../../../../core';
import { useFlowerGardenAssetsContext } from '../../../../core/providers/FlowerGardenAssetsProvider';
import { RoamerLayer } from '../../../../roamer/RoamerLayer';
import { useRoamerSimulation } from '../../../../roamer/core/useRoamerSimulation';
import { generateOrbPetalConfigs } from '../../../../orb/generateOrbPetalConfigs';
import { createRng, hashSeedString } from '../../../../scenery/BushShaderLayer/helpers/seededRandom';
import { CaptureOrb } from '../../../../orb/CaptureOrb';
import { OrbPhase, useOrbAnimation } from '../../../../orb/useOrbAnimation';
import {
  ORB_CAPTIVE_DRIFT_RATIO,
  ORB_DIAMETER_RATIO,
  ORB_RING_CONFIGS,
  ORB_ROAMER_TAP_HIT_RADIUS,
} from '../../../../orb/orbAnimPresets';
import { useFlowerGardenRoamerTapGesture } from '../../../../orb/useFlowerGardenRoamerTapGesture';
import type { ThemeMatchRoamerLayerProps } from '../../../../../../themeContract';
import type { RoamerRuntimeEntry } from '../../../../roamer/core/types';
import { FlightState } from '../../../../roamer/core/types';
import type { KeepOutDisk } from '../../../../../../wordLearning/translationMatch/domain/wordSpriteRoaming';

const MATCH_ROAMER_Z = 3;
const MATCH_ORB_Z = 6;

export function FlowerGardenMatchRoamerLayer({
  words,
  sounds,
  sessionController,
  triggerEscapeRef,
  tapDataRef,
  interactive = true,
  keepOutDiskSv,
}: ThemeMatchRoamerLayerProps) {
  const layout = useExerciseLayout();
  const { roamerRect, screenWidth, screenHeight, layoutKey } = layout;
  const { images } = useFlowerGardenAssetsContext();
  const cloudPetalAtlasReady = images.cloudPetalAtlas != null;

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

  const petalSeed = useMemo(() => hashSeedString('flower-garden-orb-match'), []);
  const petals = useMemo(
    () =>
      generateOrbPetalConfigs({
        rng: createRng(petalSeed),
      }),
    [petalSeed],
  );

  const [selection, setSelection] = useState<{
    roamerIndex: number;
    originX: number;
    originY: number;
  } | null>(null);
  const [poolHiddenRoamerIndex, setPoolHiddenRoamerIndex] = useState<number | null>(null);
  const transitionRafRef = useRef<number | null>(null);
  const soundsRef = useRef(sounds);
  soundsRef.current = sounds;

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
      setSelection({ roamerIndex, originX, originY });
      setPoolHiddenRoamerIndex(roamerIndex);
    },
    [cancelTransitionRaf, sim.runtimeEntries, capturedRoamerIndexSv],
  );

  const roamerTapGesture = useFlowerGardenRoamerTapGesture({
    sharedPositions: sim.sharedPositions,
    roamerCount: sim.runtimeEntries.length,
    hitRadius: ORB_ROAMER_TAP_HIT_RADIUS,
    onRoamerTap: armCapture,
  });

  useEffect(() => {
    if (!triggerEscapeRef) {
      return;
    }
    const previous = triggerEscapeRef.current;
    triggerEscapeRef.current = () => {
      if (previous) {
        previous();
      }
      soundsRef.current?.playOrbPop();
      startBurst();
    };
    return () => {
      triggerEscapeRef.current = previous;
    };
  }, [startBurst, triggerEscapeRef]);

  if (tapDataRef) {
    tapDataRef.current = {
      armCapture: (roamerIndex: number, originX: number, originY: number) => {
        if (sessionController) {
          const ok = sessionController.captureRoamer(roamerIndex, '');
          if (!ok) {
            return;
          }
        }
        armCapture(roamerIndex, originX, originY);
      },
      startBurst,
    };
  }

  const capturedEntry: RoamerRuntimeEntry | null =
    selection != null ? sim.runtimeEntries[selection.roamerIndex] ?? null : null;

  if (screenWidth === 0 || screenHeight === 0) {
    return null;
  }

  return (
    <>
      <View
        style={[styles.container, { zIndex: MATCH_ROAMER_Z }]}
        pointerEvents={interactive ? 'box-none' : 'none'}
      >
        <GestureDetector gesture={roamerTapGesture}>
          <View style={StyleSheet.absoluteFill}>
            <RoamerLayer
              words={words}
              interactive={interactive}
              sim={sim}
              hiddenIndices={poolHiddenRoamerIndex != null ? [poolHiddenRoamerIndex] : []}
            />
          </View>
        </GestureDetector>
      </View>
      {capturedEntry != null && cloudPetalAtlasReady && (
        <View
          style={[styles.container, { zIndex: MATCH_ORB_Z }]}
          pointerEvents="none"
        >
          <CaptureOrb
            anim={anim}
            capturedEntry={capturedEntry}
            petals={petals}
            centerX={targetCenterX}
            centerY={targetCenterY}
          />
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
});
