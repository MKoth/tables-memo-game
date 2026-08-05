import React, { useMemo, type ReactNode } from 'react';
import type { InsertPreviewLayout } from '../../../../../core/layout/exerciseLayout';
import { useRenderTracker } from '../../../core/perf/flowerGardenPerfLogger';
import type { InsertAnimationState, LetterOrbModel } from '../../../../../wordTransformation/domain';
import { FlowerGardenTransformationInsertFlight } from './FlowerGardenTransformationInsertFlight';
import {
  FlowerGardenTransformationVariantPicker,
  type FlowerGardenTransformationVariantPickerProps,
  type VariantPickerItem,
  type VariantPickerSourceLayout,
} from './FlowerGardenTransformationVariantPicker';
import { FlowerGardenTransformationWordOrbs } from './FlowerGardenTransformationWordOrbs';

function insertPreviewFromAnimation(
  insertAnimation: InsertAnimationState | null,
): InsertPreviewLayout | undefined {
  if (insertAnimation == null || insertAnimation.phase === 'dismiss') {
    return undefined;
  }

  return {
    insertIndex: insertAnimation.insertIndex,
    insertLength: insertAnimation.insertLength,
    targetLetterCount: insertAnimation.nextWord.length,
  };
}

export type FlowerGardenTransformationOrbLayerProps = {
  wordOrbsVisible?: boolean;
  mergeWord?: string | null;
  onMergeComplete?: () => void;
  /** Rendered after word orbs and before insert flight (e.g. sentence resolution). */
  betweenWordOrbsAndInsertFlight?: ReactNode;
  letters: LetterOrbModel[];
  lettersInteractive: boolean;
  insertAnimation: InsertAnimationState | null;
  variantPickerVisible: boolean;
  variantPickerInteractive: boolean;
  variantPickerItems: VariantPickerItem[];
  wrongItemId?: FlowerGardenTransformationVariantPickerProps['wrongItemId'];
  pickerHiddenItemIds?: FlowerGardenTransformationVariantPickerProps['hiddenItemIds'];
  poppedPickerItemIds?: FlowerGardenTransformationVariantPickerProps['poppedItemIds'];
  onLetterPress: (position: number) => void;
  onVariantSelect: (
    item: VariantPickerItem,
    source: VariantPickerSourceLayout,
  ) => void;
  playPop?: () => void;
  playInflate?: () => void;
};

export function FlowerGardenTransformationOrbLayer({
  wordOrbsVisible = true,
  mergeWord: _mergeWord,
  onMergeComplete: _onMergeComplete,
  betweenWordOrbsAndInsertFlight,
  letters,
  lettersInteractive,
  insertAnimation,
  variantPickerVisible,
  variantPickerInteractive,
  variantPickerItems,
  wrongItemId,
  pickerHiddenItemIds,
  poppedPickerItemIds,
  onLetterPress,
  onVariantSelect,
  playPop,
  playInflate,
}: FlowerGardenTransformationOrbLayerProps) {
  useRenderTracker('FG:OrbLayer');
  const insertPreview = useMemo(
    () => insertPreviewFromAnimation(insertAnimation),
    [insertAnimation],
  );

  return (
    <>
      {wordOrbsVisible && (
        <FlowerGardenTransformationWordOrbs
          letters={letters}
          interactive={lettersInteractive}
          insertPreview={insertPreview}
          onLetterPress={onLetterPress}
          playPop={playPop}
          playInflate={playInflate}
        />
      )}
      {betweenWordOrbsAndInsertFlight}
      <FlowerGardenTransformationInsertFlight flight={insertAnimation} />
      {variantPickerVisible && (
        <FlowerGardenTransformationVariantPicker
          items={variantPickerItems}
          wrongItemId={wrongItemId}
          hiddenItemIds={pickerHiddenItemIds}
          poppedItemIds={poppedPickerItemIds}
          interactive={variantPickerInteractive}
          onSelect={onVariantSelect}
          playPop={playPop}
        />
      )}
    </>
  );
}
