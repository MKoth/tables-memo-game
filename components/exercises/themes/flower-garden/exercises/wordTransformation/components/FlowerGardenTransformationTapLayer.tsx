import React, { useCallback, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { GestureDetector, useTapGesture } from 'react-native-gesture-handler';
import { scheduleOnRN } from 'react-native-worklets';
import type { SharedValue } from 'react-native-reanimated';
import { useExerciseLayout } from '../../../../../core';
import { pickSceneHitTarget, type SceneHitTarget } from '../../../../../wordTransformation/scene/hitTest';
import type {
  VariantPickerItem,
  VariantSourceLayout,
} from '../../../../../wordTransformation/domain';
import type { WordTransformationSceneState } from '../../../../../wordTransformation/scene/sceneStateTypes';

const TAP_MAX_DISTANCE_PX = 10;

type FlowerGardenTransformationTapLayerProps = {
  sceneStateSv: SharedValue<WordTransformationSceneState>;
  variantPickerItems: VariantPickerItem[];
  onLetterPress: (position: number) => void;
  onVariantSelect: (item: VariantPickerItem, source: VariantSourceLayout) => void;
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

/**
 * Single worklet hit-tested gesture over the word-transformation zone. Reads
 * the scene state at tap time, so interactivity and targets stay fresh without
 * any React re-render per press. Gesture coordinates are zone-local; scene
 * geometry is screen-absolute, so the tap point is translated by the zone
 * origin before hit-testing. Accessible elements reproduce the roles and
 * labels the removed Pressables provided; they re-render at op boundaries and
 * read positions from the scene state at render time.
 */
export function FlowerGardenTransformationTapLayer({
  sceneStateSv,
  variantPickerItems,
  onLetterPress,
  onVariantSelect,
}: FlowerGardenTransformationTapLayerProps) {
  const { roamerRect } = useExerciseLayout();
  const itemsRef = useRef(variantPickerItems);
  itemsRef.current = variantPickerItems;

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

  return (
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
            onAccessibilityTap={() => handleVariantTap(item.id, item.centerX, item.centerY, item.diameter)}
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
  );
}

const styles = StyleSheet.create({
  zone: {
    position: 'absolute',
  },
  hit: {
    position: 'absolute',
  },
});
