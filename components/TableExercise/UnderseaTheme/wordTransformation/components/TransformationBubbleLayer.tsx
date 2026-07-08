import React, { useMemo, type ReactNode } from 'react';
import type { InsertPreviewLayout } from '../../core/layout/underseaExerciseLayout';
import type { InsertAnimationState, LetterBubbleModel } from '../domain';
import { TransformationInsertFlight } from './TransformationInsertFlight';
import {
  TransformationVariantPicker,
  type TransformationVariantPickerProps,
  type VariantPickerItem,
  type VariantPickerSourceLayout,
} from './TransformationVariantPicker';
import { TransformationWordBubbles } from './TransformationWordBubbles';

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

export type TransformationBubbleLayerProps = {
  wordBubblesVisible?: boolean;
  mergeWord?: string | null;
  onMergeComplete?: () => void;
  /** Rendered after word bubbles and before insert flight (e.g. sentence resolution). */
  betweenWordBubblesAndInsertFlight?: ReactNode;
  letters: LetterBubbleModel[];
  lettersInteractive: boolean;
  insertAnimation: InsertAnimationState | null;
  variantPickerVisible: boolean;
  variantPickerInteractive: boolean;
  variantPickerItems: VariantPickerItem[];
  wrongItemId?: TransformationVariantPickerProps['wrongItemId'];
  pickerHiddenItemIds?: TransformationVariantPickerProps['hiddenItemIds'];
  poppedPickerItemIds?: TransformationVariantPickerProps['poppedItemIds'];
  onLetterPress: (position: number) => void;
  onVariantSelect: (
    item: VariantPickerItem,
    source: VariantPickerSourceLayout,
  ) => void;
  playPop?: () => void;
  playInflate?: () => void;
};

export function TransformationBubbleLayer({
  wordBubblesVisible = true,
  mergeWord,
  onMergeComplete,
  betweenWordBubblesAndInsertFlight,
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
}: TransformationBubbleLayerProps) {
  const insertPreview = useMemo(
    () => insertPreviewFromAnimation(insertAnimation),
    [insertAnimation],
  );

  return (
    <>
      {wordBubblesVisible && (
        <TransformationWordBubbles
          letters={letters}
          interactive={lettersInteractive}
          insertPreview={insertPreview}
          mergeWord={mergeWord}
          onMergeComplete={onMergeComplete}
          onLetterPress={onLetterPress}
          playPop={playPop}
          playInflate={playInflate}
        />
      )}
      {betweenWordBubblesAndInsertFlight}
      <TransformationInsertFlight flight={insertAnimation} />
      {variantPickerVisible && (
        <TransformationVariantPicker
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
