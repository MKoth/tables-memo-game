import React, { useLayoutEffect, useMemo, type RefObject } from 'react';
import { StyleSheet, View } from 'react-native';
import { runOnUI, useSharedValue } from 'react-native-reanimated';
import type { ThemeRoamerMotionZoneProps } from '../../../themeContract';
import { useExerciseLayout } from '../../../core';
import type { RoamerSimulation } from './core/useRoamerSimulation';
import { useRoamerSimulation } from './core/useRoamerSimulation';
import { armRoamerExitFlight } from './core/exitFlightWorklets';
import { resolveRoamerExitLegs } from './core/resolveRoamerExitPath';
import { FlowerGardenParticleLayer } from './particles/FlowerGardenParticleLayer';
import { RoamerLayer } from './RoamerLayer';

export type FlowerGardenRoamerMotionZoneController = {
  /** Roamer runtime index carrying `word`, or -1 when none does. */
  getRoamerIndexForWord: (word: string) => number;
  /**
   * Arm the exit flight for the roamer carrying `word`: fly through the
   * waypoint (the solved cell's rose) and off-screen past the nearest edge.
   * Returns false when no roamer carries the word.
   */
  armEscapeByWord: (word: string, waypointX: number, waypointY: number) => boolean;
};

export type FlowerGardenRoamerMotionZoneProps = ThemeRoamerMotionZoneProps & {
  sim?: RoamerSimulation;
  hiddenIndices?: number[];
  controllerRef?: RefObject<FlowerGardenRoamerMotionZoneController | null>;
};

export function FlowerGardenRoamerMotionZone(props: FlowerGardenRoamerMotionZoneProps) {
  if (props.controllerRef != null) {
    return <EscapableRoamerMotionZone {...props} />;
  }
  return <PlainRoamerMotionZone {...props} />;
}

function PlainRoamerMotionZone({
  words,
  interactive = false,
  sim,
  hiddenIndices = [],
}: FlowerGardenRoamerMotionZoneProps) {
  const { screenWidth, screenHeight } = useExerciseLayout();
  return (
    <View style={styles.container} pointerEvents="box-none">
      {sim != null && (
        <FlowerGardenParticleLayer
          runtimeEntries={sim.runtimeEntries}
          width={screenWidth}
          height={screenHeight}
        />
      )}
      <RoamerLayer
        words={words}
        interactive={interactive}
        sim={sim}
        hiddenIndices={hiddenIndices}
      />
    </View>
  );
}

function EscapableRoamerMotionZone({
  words,
  interactive = false,
  hiddenIndices = [],
  controllerRef,
}: FlowerGardenRoamerMotionZoneProps) {
  const { screenWidth, screenHeight, roamerRect, layoutKey } = useExerciseLayout();
  const capturedRoamerIndexSv = useSharedValue(-1);

  const sim = useRoamerSimulation({
    words,
    width: screenWidth,
    height: screenHeight,
    roamerRect,
    layoutKey,
    sessionId: 'word-transformation-roamers',
    capturedRoamerIndex: capturedRoamerIndexSv,
  });

  const controller = useMemo<FlowerGardenRoamerMotionZoneController>(
    () => ({
      getRoamerIndexForWord(word: string) {
        const index = words.indexOf(word);
        return index >= 0 && index < sim.runtimeEntries.length ? index : -1;
      },
      armEscapeByWord(word: string, waypointX: number, waypointY: number) {
        const index = words.indexOf(word);
        if (index < 0 || index >= sim.runtimeEntries.length) {
          return false;
        }
        const entry = sim.runtimeEntries[index];
        if (entry == null) {
          return false;
        }
        const legs = resolveRoamerExitLegs({
          waypointX,
          waypointY,
          screenWidth,
          screenHeight,
        });
        runOnUI(armRoamerExitFlight)(
          entry.runtime,
          capturedRoamerIndexSv,
          legs.leg1X,
          legs.leg1Y,
          legs.leg2X,
          legs.leg2Y,
        );
        return true;
      },
    }),
    [sim, words, capturedRoamerIndexSv, screenWidth, screenHeight],
  );

  useLayoutEffect(() => {
    if (controllerRef != null) {
      controllerRef.current = controller;
    }
  }, [controller, controllerRef]);

  return (
    <View style={styles.container} pointerEvents="box-none">
      <FlowerGardenParticleLayer
        runtimeEntries={sim.runtimeEntries}
        width={screenWidth}
        height={screenHeight}
      />
      <RoamerLayer
        words={words}
        interactive={interactive}
        sim={sim}
        hiddenIndices={hiddenIndices}
      />
    </View>
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
