import React, { useState } from 'react';
import { StyleSheet } from 'react-native';
import { Canvas } from '@shopify/react-native-skia';
import {
  useAnimatedReaction,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { useExerciseClockQuantized } from '../../../../../core';
import { useFlowerGardenAssetsContext } from '../../../core/providers/FlowerGardenAssetsProvider';
import { FlowerGardenLetterOrb } from './FlowerGardenLetterOrb';
import { ORB_IDLE_CLOCK_FPS } from '../../../orb/orbAnimPresets';
import type { LetterOrbGeometry } from '../../../orb/orbAnimTypes';
import type { InsertAnimationState } from '../../../../../wordTransformation/domain';
import type { WordTransformationSceneState } from '../../../../../wordTransformation/scene/sceneStateTypes';

export type FlowerGardenTransformationInsertFlightProps = {
  sceneStateSv: SharedValue<WordTransformationSceneState>;
};

function buildFlightGeometry(flight: InsertAnimationState): LetterOrbGeometry {
  'worklet';
  const landed = flight.phase === 'dismiss';
  const fromX = flight.fromCenterX;
  const fromY = flight.fromCenterY;
  const fromDiameter = flight.fromDiameter;
  return {
    centerX: flight.toCenterX,
    centerY: flight.toCenterY,
    diameter: flight.toDiameter,
    initialCenterX: landed ? flight.toCenterX : fromX,
    initialCenterY: landed ? flight.toCenterY : fromY,
    initialDiameter: landed ? flight.toDiameter : fromDiameter,
    skipEnter: true,
    moveDurationMs: landed ? 0 : flight.flyDurationMs,
  };
}

/**
 * Canvas stays mounted so picking a variant does not pay Skia surface creation
 * on the click frame — only the FlowerGardenLetterOrb inside toggles. The orb
 * mounts/unmounts once per flight (2 React renders per op); its geometry seeds
 * and fly/dismiss targets are written on the UI thread from the scene shared
 * value, so the flight starts without waiting on the JS thread.
 */
export function FlowerGardenTransformationInsertFlight({
  sceneStateSv,
}: FlowerGardenTransformationInsertFlightProps) {
  const { images } = useFlowerGardenAssetsContext();
  const clock = useExerciseClockQuantized(ORB_IDLE_CLOCK_FPS);
  const flightGeometrySv = useSharedValue<LetterOrbGeometry | null>(null);
  const [flight, setFlight] = useState<{ char: string; key: string } | null>(null);

  useAnimatedReaction(
    () => sceneStateSv.value.insertAnimation,
    (insert, prev) => {
      const mountKey = insert == null ? null : insert.selectedChoiceId ?? insert.char;
      const prevKey = prev == null ? null : prev.selectedChoiceId ?? prev.char;
      if (mountKey !== prevKey) {
        if (insert == null) {
          flightGeometrySv.value = null;
          scheduleOnRN(setFlight, null);
          return;
        }
        flightGeometrySv.value = {
          centerX: insert.fromCenterX,
          centerY: insert.fromCenterY,
          diameter: insert.fromDiameter,
          initialCenterX: insert.fromCenterX,
          initialCenterY: insert.fromCenterY,
          initialDiameter: insert.fromDiameter,
          skipEnter: true,
          moveDurationMs: 0,
        };
        requestAnimationFrame(() => {
          if (flightGeometrySv.value != null) {
            flightGeometrySv.value = buildFlightGeometry(insert);
          }
        });
        scheduleOnRN(setFlight, { char: insert.char, key: mountKey as string });
        return;
      }
      if (insert != null && flightGeometrySv.value != null) {
        flightGeometrySv.value = buildFlightGeometry(insert);
      }
    },
    [flightGeometrySv, sceneStateSv],
  );

  const flightGeometry = flight == null ? null : flightGeometrySv;

  if (images.orbRingSmallImages == null || images.orbBedSmallImages == null) {
    return null;
  }

  return (
    <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
      {flight != null && flightGeometry != null && (
        <FlowerGardenLetterOrb
          key={flight.key}
          char={flight.char}
          status="idle"
          geometry={flightGeometry}
          clock={clock}
          ringVariants={images.orbRingSmallImages}
          bedVariants={images.orbBedSmallImages}
        />
      )}
    </Canvas>
  );
}
