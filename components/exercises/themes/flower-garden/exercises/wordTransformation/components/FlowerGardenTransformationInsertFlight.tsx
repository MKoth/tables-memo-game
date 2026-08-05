import React, { useLayoutEffect, useMemo, useRef } from 'react';
import { StyleSheet } from 'react-native';
import { Canvas } from '@shopify/react-native-skia';
import { makeMutable, type SharedValue } from 'react-native-reanimated';
import { useExerciseClockQuantized } from '../../../../../core';
import { useFlowerGardenAssetsContext } from '../../../core/providers/FlowerGardenAssetsProvider';
import { useRenderTracker } from '../../../core/perf/flowerGardenPerfLogger';
import { FlowerGardenLetterOrb } from './FlowerGardenLetterOrb';
import { ORB_IDLE_CLOCK_FPS } from '../../../orb/orbAnimPresets';
import type { LetterOrbGeometry } from '../../../orb/orbAnimTypes';
import type { InsertAnimationState } from '../../../../../wordTransformation/domain';

export type FlowerGardenTransformationInsertFlightProps = {
  flight: InsertAnimationState | null;
};

function buildFlightGeometry(flight: InsertAnimationState): LetterOrbGeometry {
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
 * on the click frame — only the FlowerGardenLetterOrb inside toggles.
 */
export function FlowerGardenTransformationInsertFlight({
  flight,
}: FlowerGardenTransformationInsertFlightProps) {
  useRenderTracker('FG:InsertFlight');
  const { images } = useFlowerGardenAssetsContext();
  const clock = useExerciseClockQuantized(ORB_IDLE_CLOCK_FPS);
  const geometryRef = useRef<SharedValue<LetterOrbGeometry> | null>(null);

  const flightKey = flight == null ? null : flight.selectedChoiceId ?? flight.char;

  // Seed the geometry at the from-position so the first write animates the fly.
  const flightGeometry = useMemo(() => {
    if (flight == null || flightKey == null) {
      return null;
    }
    if (geometryRef.current == null) {
      const fromGeometry: LetterOrbGeometry = {
        centerX: flight.fromCenterX,
        centerY: flight.fromCenterY,
        diameter: flight.fromDiameter,
        initialCenterX: flight.fromCenterX,
        initialCenterY: flight.fromCenterY,
        initialDiameter: flight.fromDiameter,
        skipEnter: true,
        moveDurationMs: flight.flyDurationMs,
      };
      geometryRef.current = makeMutable<LetterOrbGeometry>(fromGeometry);
      console.log(
        `[FG:Seed] ${Date.now()} char=${flight.char} key=${flightKey} fromX=${flight.fromCenterX.toFixed(0)} fromY=${flight.fromCenterY.toFixed(0)}`,
      );
    }
    return { key: flightKey, geometry: geometryRef.current };
  }, [flight, flightKey]);

  useLayoutEffect(() => {
    if (flight == null) {
      geometryRef.current = null;
      return;
    }
    if (geometryRef.current == null) {
      return;
    }
    geometryRef.current.value = buildFlightGeometry(flight);
    console.log(
      `[FG:Write] ${Date.now()} phase=${flight.phase} key=${flightKey} fromX=${flight.fromCenterX.toFixed(0)} toX=${flight.toCenterX.toFixed(0)} dur=${flight.phase === 'dismiss' ? 0 : flight.flyDurationMs}`,
    );
  }, [flight]);

  if (images.orbRingSmallImages == null || images.orbBedSmallImages == null) {
    return null;
  }

  return (
    <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
      {flight != null && flightGeometry != null && (
        <FlowerGardenLetterOrb
          key={flightGeometry.key}
          char={flight.char}
          status="idle"
          geometry={flightGeometry.geometry}
          initialCenterX={flight.fromCenterX}
          initialCenterY={flight.fromCenterY}
          initialDiameter={flight.fromDiameter}
          moveCenterX={flight.toCenterX}
          moveCenterY={flight.toCenterY}
          moveDiameter={flight.toDiameter}
          moveDurationMs={flight.phase === 'dismiss' ? 0 : flight.flyDurationMs}
          ringVariants={images.orbRingSmallImages}
          bedVariants={images.orbBedSmallImages}
          clock={clock}
        />
      )}
    </Canvas>
  );
}
