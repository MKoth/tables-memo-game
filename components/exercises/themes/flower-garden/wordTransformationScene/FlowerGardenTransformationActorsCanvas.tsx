import React, { useCallback, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Canvas } from '@shopify/react-native-skia';
import { GestureDetector, useTapGesture } from 'react-native-gesture-handler';
import {
  useAnimatedReaction,
  useDerivedValue,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { useExerciseClockQuantized, useExerciseLayout } from '../../../core';
import { ORB_IDLE_CLOCK_FPS } from '../orb/orbAnimPresets';
import { useFlowerGardenAssetsContext } from '../core/providers/FlowerGardenAssetsProvider';
import { pickSceneHitTarget, type SceneHitTarget } from '../../../wordTransformation/scene/hitTest';
import type {
  VariantPickerItem,
  VariantSourceLayout,
} from '../../../wordTransformation/domain';
import type { WordTransformationSceneState } from '../../../wordTransformation/scene/sceneStateTypes';
import { FlowerGardenTransformationActorElement } from './FlowerGardenTransformationActorElement';
import { computeOrbActorPoses } from './computeOrbActorPose';
import { reconcileOrbActorScene } from './reconcileOrbActorScene';
import {
  createEmptyOrbActorRuntimes,
  ORB_ACTOR_SLOT_COUNT,
  type OrbActorRuntime,
} from './orbActorSceneTypes';

const TAP_MAX_DISTANCE_PX = 10;

type FlowerGardenTransformationActorsCanvasProps = {
  sceneStateSv: SharedValue<WordTransformationSceneState>;
  variantPickerItems: VariantPickerItem[];
  onLetterPress: (position: number) => void;
  onVariantSelect: (item: VariantPickerItem, source: VariantSourceLayout) => void;
  playPop?: () => void;
  playInflate?: () => void;
};

function buildSceneTargetsWorklet(scene: WordTransformationSceneState): SceneHitTarget[] {
  'worklet';
  const targets: SceneHitTarget[] = [];
  if (scene.lettersInteractive) {
    const letters = scene.letters;
    for (let i = 0; i < letters.length; i++) {
      const letter = letters[i];
      if (letter == null || letter.popped) {
        continue;
      }
      targets.push({
        kind: 'letter',
        position: letter.position,
        centerX: letter.centerX,
        centerY: letter.centerY,
        diameter: letter.diameter,
      });
    }
  }
  const picker = scene.variantPicker;
  if (picker.visible && picker.interactive) {
    const items = picker.items;
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item == null || item.popped || item.hidden) {
        continue;
      }
      targets.push({
        kind: 'picker',
        id: item.id,
        centerX: item.centerX,
        centerY: item.centerY,
        diameter: item.diameter,
      });
    }
  }
  return targets;
}

export function FlowerGardenTransformationActorsCanvas({
  sceneStateSv,
  variantPickerItems,
  onLetterPress,
  onVariantSelect,
  playPop,
  playInflate,
}: FlowerGardenTransformationActorsCanvasProps) {
  const { roamerRect } = useExerciseLayout();
  const { images } = useFlowerGardenAssetsContext();
  const ringVariants = images.orbRingSmallImages;
  const bedVariants = images.orbBedSmallImages;

  const clock = useExerciseClockQuantized(ORB_IDLE_CLOCK_FPS);
  const runtimes = useSharedValue<OrbActorRuntime[]>(createEmptyOrbActorRuntimes());

  const poses = useDerivedValue(() => computeOrbActorPoses(runtimes.value, clock.value));

  const itemsRef = useRef(variantPickerItems);
  itemsRef.current = variantPickerItems;

  const [labels, setLabels] = useState<string[]>(() =>
    runtimes.value.map(runtime => runtime.char),
  );

  const dispatchSoundEvent = useCallback(
    (kind: 'pop' | 'inflate', delayMs: number) => {
      const play = kind === 'pop' ? playPop : playInflate;
      if (play == null) {
        return;
      }
      if (delayMs <= 0) {
        play();
        return;
      }
      setTimeout(() => {
        play();
      }, delayMs);
    },
    [playInflate, playPop],
  );

  const syncLabels = useCallback((nextLabels: string[]) => {
    setLabels(previous => {
      let changed = previous.length !== nextLabels.length;
      for (let i = 0; !changed && i < previous.length; i++) {
        changed = previous[i] !== nextLabels[i];
      }
      return changed ? nextLabels : previous;
    });
  }, []);

  useAnimatedReaction(
    () => sceneStateSv.value,
    (scene, _previous) => {
      const now = clock.value;
      const result = reconcileOrbActorScene(runtimes.value, scene, now);
      runtimes.value = result.runtimes;
      const events = result.soundEvents;
      for (let i = 0; i < events.length; i++) {
        const event = events[i]!;
        scheduleOnRN(dispatchSoundEvent, event.kind, Math.max(0, event.dueClockMs - now));
      }
      const nextLabels: string[] = [];
      const runtimesResult = result.runtimes;
      for (let i = 0; i < runtimesResult.length; i++) {
        nextLabels.push(runtimesResult[i]!.char);
      }
      scheduleOnRN(syncLabels, nextLabels);
    },
    [clock, dispatchSoundEvent, runtimes, syncLabels],
  );

  const handleVariantTap = useCallback(
    (id: string, centerX: number, centerY: number, diameter: number) => {
      const item = itemsRef.current.find(candidate => candidate.id === id);
      if (item != null) {
        onVariantSelect(item, { centerX, centerY, diameter });
      }
    },
    [onVariantSelect],
  );

  const gesture = useTapGesture({
    maxDistance: TAP_MAX_DISTANCE_PX,
    onDeactivate: e => {
      'worklet';
      const scene = sceneStateSv.value;
      if (
        !scene.lettersInteractive &&
        !(scene.variantPicker.visible && scene.variantPicker.interactive)
      ) {
        return;
      }
      const hit = pickSceneHitTarget(
        e.x + roamerRect.x,
        e.y + roamerRect.y,
        buildSceneTargetsWorklet(scene),
      );
      if (hit == null) {
        return;
      }
      if (hit.kind === 'letter') {
        scheduleOnRN(onLetterPress, hit.position);
        return;
      }
      scheduleOnRN(handleVariantTap, hit.id, hit.centerX, hit.centerY, hit.diameter);
    },
  });

  const scene = sceneStateSv.value;
  const accessibleLetters =
    scene.lettersInteractive && scene.wordOrbsVisible
      ? scene.letters.filter(letter => !letter.popped)
      : [];
  const accessiblePickerItems =
    scene.variantPicker.visible && scene.variantPicker.interactive
      ? scene.variantPicker.items.filter(item => !item.popped && !item.hidden)
      : [];

  const elements: React.ReactElement[] = [];
  for (let slot = 0; slot < ORB_ACTOR_SLOT_COUNT; slot++) {
    elements.push(
      <FlowerGardenTransformationActorElement
        key={slot}
        slot={slot}
        poses={poses}
        label={labels[slot] ?? ''}
        ringVariants={ringVariants}
        bedVariants={bedVariants}
      />,
    );
  }

  return (
    <>
      <Canvas style={styles.canvas} pointerEvents="none">
        {elements}
      </Canvas>
      <GestureDetector gesture={gesture}>
        <View
          style={[
            styles.zone,
            {
              left: roamerRect.x,
              top: roamerRect.y,
              width: roamerRect.w,
              height: roamerRect.h,
            },
          ]}>
          {accessibleLetters.map(letter => (
            <View
              key={`a11y-letter-${letter.position}`}
              accessible
              accessibilityRole="button"
              accessibilityLabel={`Delete ${letter.char}`}
              onAccessibilityTap={() => onLetterPress(letter.position)}
              style={[
                styles.hit,
                {
                  left: letter.centerX - letter.diameter * 0.5,
                  top: letter.centerY - letter.diameter * 0.5,
                  width: letter.diameter,
                  height: letter.diameter,
                },
              ]}
            />
          ))}
          {accessiblePickerItems.map(item => (
            <View
              key={`a11y-picker-${item.id}`}
              accessible
              accessibilityRole="button"
              accessibilityLabel={`Insert ${item.label}`}
              onAccessibilityTap={() =>
                handleVariantTap(item.id, item.centerX, item.centerY, item.diameter)
              }
              style={[
                styles.hit,
                {
                  left: item.centerX - item.diameter * 0.5,
                  top: item.centerY - item.diameter * 0.5,
                  width: item.diameter,
                  height: item.diameter,
                },
              ]}
            />
          ))}
        </View>
      </GestureDetector>
    </>
  );
}

const styles = StyleSheet.create({
  canvas: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  zone: {
    position: 'absolute',
  },
  hit: {
    position: 'absolute',
  },
});
