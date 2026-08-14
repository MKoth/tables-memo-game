import {
  computeLetterLayout,
  previewCenterForLetter,
  TRANSFORMATION_VARIANT_ROW_Y_RATIO,
  type InsertPreviewLayout,
  type LetterLayout,
} from '../../../../../core/layout/exerciseLayout';
import type { ZoneRect } from '../../../../../core/layout/computeExerciseLayout';
import type { InsertAnimationState, LetterOrbModel } from '../../../../../wordTransformation/domain';
import type {
  WordTransformationSceneLetter,
  WordTransformationScenePickerItem,
  WordTransformationSceneState,
} from '../../../../../wordTransformation/scene/sceneStateTypes';
import type { SentenceTransformationGame } from '../../../../../sentenceTransformation/hooks/useSentenceTransformationGame';

/** Letter gap inside the tight merge cluster (fraction of the orb diameter) — negative means overlap. */
const MERGE_CLUSTER_GAP_RATIO = -0.65;

export type DeriveFlowerGardenSentenceSceneParams = {
  game: SentenceTransformationGame;
  roamerRect: ZoneRect;
};

export function insertPreviewFromAnimation(
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

export type MergeCluster = {
  centerX: number;
  centerY: number;
  spacing: number;
};

/** Midpoint of the letter row — matches `computeRoundResolutionFlight` from-center. */
export function computeMergeCluster(layout: LetterLayout): MergeCluster {
  const first = layout.centers[0] ?? 0;
  const last = layout.centers[layout.centers.length - 1] ?? first;
  return {
    centerX: (first + last) * 0.5,
    centerY: layout.rowY,
    spacing: layout.diameter * (1 + MERGE_CLUSTER_GAP_RATIO),
  };
}

function toSceneLetter(
  letter: LetterOrbModel,
  centerX: number,
  centerY: number,
  diameter: number,
): WordTransformationSceneLetter {
  return {
    position: letter.position,
    char: letter.char,
    centerX,
    centerY,
    diameter,
    popped: letter.popped,
    wrong: letter.wrong,
    skipEnter: letter.skipEnter,
    popDelayMs: letter.popDelayMs ?? null,
    enterDelayMs: letter.enterDelayMs ?? null,
  };
}

export function deriveFlowerGardenSentenceScene({
  game,
  roamerRect,
}: DeriveFlowerGardenSentenceSceneParams): WordTransformationSceneState {
  const letters = game.letters;
  const insertPreview = insertPreviewFromAnimation(game.insertAnimation);
  const previewLayout =
    insertPreview == null
      ? null
      : computeLetterLayout(roamerRect, insertPreview.targetLetterCount);
  const baseLayout = computeLetterLayout(roamerRect, Math.max(letters.length, 1));
  const activeLayout = previewLayout ?? baseLayout;
  const mergeCluster = game.mergeWord != null ? computeMergeCluster(baseLayout) : null;

  const sceneLetters: WordTransformationSceneLetter[] = letters.map((letter, index) => {
    if (mergeCluster != null) {
      const offset = (index - (letters.length - 1) * 0.5) * mergeCluster.spacing;
      return toSceneLetter(letter, mergeCluster.centerX + offset, mergeCluster.centerY, baseLayout.diameter);
    }
    const centerX =
      insertPreview != null && previewLayout != null
        ? previewCenterForLetter(letter.position, insertPreview, previewLayout)
        : baseLayout.centers[letter.position] ?? 0;
    return toSceneLetter(letter, centerX, activeLayout.rowY, activeLayout.diameter);
  });

  const pickerCount = game.variantPickerItems.length;
  const pickerLayout =
    pickerCount > 0
      ? computeLetterLayout(roamerRect, pickerCount, TRANSFORMATION_VARIANT_ROW_Y_RATIO)
      : null;

  const pickerItems: WordTransformationScenePickerItem[] = game.variantPickerItems.map(
    (item, index) => ({
      id: item.id,
      label: item.label,
      centerX: pickerLayout?.centers[index] ?? 0,
      centerY: pickerLayout?.rowY ?? 0,
      diameter: pickerLayout?.diameter ?? 0,
      popped:
        item.popping === true ||
        (game.poppedPickerItemIds?.has(item.id) ?? false),
      wrong: game.wrongItemId === item.id,
      hidden: game.pickerHiddenItemIds.has(item.id),
      popDelayMs: item.popDelayMs ?? null,
    }),
  );

  return {
    wordOrbsVisible: !game.isCompleted,
    lettersInteractive:
      !game.transitioning && game.insertAnimation == null && game.bubbleEnter == null,
    letters: sceneLetters,
    insertAnimation: game.insertAnimation,
    variantPicker: {
      visible:
        (game.mode === 'insert' || game.insertAnimation != null) &&
        !game.transitioning &&
        game.bubbleEnter == null,
      interactive: game.insertAnimation == null,
      items: pickerItems,
    },
  };
}
