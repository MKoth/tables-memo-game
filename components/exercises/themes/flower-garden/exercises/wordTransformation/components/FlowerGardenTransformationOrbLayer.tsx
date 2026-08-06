import React, { type ReactNode } from 'react';
import type { SharedValue } from 'react-native-reanimated';
import type {
  VariantPickerItem,
} from '../../../../../wordTransformation/domain';
import type { LetterOrbModel } from '../../../../../wordTransformation/domain';
import type { WordTransformationSceneState } from '../../../../../wordTransformation/scene/sceneStateTypes';
import { FlowerGardenTransformationInsertFlight } from './FlowerGardenTransformationInsertFlight';
import {
  FlowerGardenTransformationVariantPicker,
  type VariantPickerSourceLayout,
} from './FlowerGardenTransformationVariantPicker';
import { FlowerGardenTransformationWordOrbs } from './FlowerGardenTransformationWordOrbs';
import { FlowerGardenTransformationTapLayer } from './FlowerGardenTransformationTapLayer';

export type FlowerGardenTransformationOrbLayerProps = {
  mergeWord?: string | null;
  onMergeComplete?: () => void;
  /** Rendered after word orbs and before insert flight (e.g. sentence resolution). */
  betweenWordOrbsAndInsertFlight?: ReactNode;
  /** React identity for the word orbs — updates only at op/word boundaries. */
  letters: LetterOrbModel[];
  /** React identity for the picker elements (id + label) — op-boundary updates. */
  variantPickerItems: VariantPickerItem[];
  /** Theme scene state — every per-press change flows through this. */
  sceneStateSv: SharedValue<WordTransformationSceneState>;
  onLetterPress: (position: number) => void;
  onVariantSelect: (item: VariantPickerItem, source: VariantPickerSourceLayout) => void;
  playPop?: () => void;
  playInflate?: () => void;
};

/**
 * Word-transformation visual layer: word orbs, picker, and insert flight all
 * read the scene shared value on the UI thread, so presses never re-render
 * React. Input is a single worklet hit-tested tap gesture over the roamer zone.
 */
export function FlowerGardenTransformationOrbLayer({
  mergeWord: _mergeWord,
  onMergeComplete: _onMergeComplete,
  betweenWordOrbsAndInsertFlight,
  letters,
  variantPickerItems,
  sceneStateSv,
  onLetterPress,
  onVariantSelect,
  playPop,
  playInflate,
}: FlowerGardenTransformationOrbLayerProps) {
  return (
    <>
      <FlowerGardenTransformationWordOrbs
        letters={letters}
        sceneStateSv={sceneStateSv}
        playPop={playPop}
        playInflate={playInflate}
      />
      {betweenWordOrbsAndInsertFlight}
      <FlowerGardenTransformationInsertFlight sceneStateSv={sceneStateSv} />
      <FlowerGardenTransformationVariantPicker
        items={variantPickerItems}
        sceneStateSv={sceneStateSv}
        playPop={playPop}
      />
      <FlowerGardenTransformationTapLayer
        sceneStateSv={sceneStateSv}
        variantPickerItems={variantPickerItems}
        onLetterPress={onLetterPress}
        onVariantSelect={onVariantSelect}
      />
    </>
  );
}
