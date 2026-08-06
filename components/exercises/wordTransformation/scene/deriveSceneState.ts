import {
  computeLetterLayout,
  previewCenterForLetter,
  TRANSFORMATION_VARIANT_ROW_Y_RATIO,
  type InsertPreviewLayout,
  type LetterLayout,
} from '../../core/layout/exerciseLayout';
import type { ZoneRect } from '../../core/layout/computeExerciseLayout';
import { mapLettersWithCascade } from '../letterCascade';
import type {
  InsertAnimationState,
  LetterOrbModel,
  WordTransformationCoreSnapshot,
} from '../domain/coreTypes';
import type {
  WordTransformationSceneContext,
  WordTransformationSceneLetter,
  WordTransformationScenePickerItem,
  WordTransformationSceneState,
} from './sceneStateTypes';

export type DeriveSceneStateParams = {
  snapshot: WordTransformationCoreSnapshot;
  context: WordTransformationSceneContext;
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

function letterCenterX(
  position: number,
  layout: LetterLayout,
  insertPreview: InsertPreviewLayout | undefined,
  previewLayout: LetterLayout | null,
): number {
  if (insertPreview != null && previewLayout != null) {
    return previewCenterForLetter(position, insertPreview, previewLayout);
  }
  return layout.centers[position] ?? 0;
}

function deriveSceneLetters(
  snapshot: WordTransformationCoreSnapshot,
  context: WordTransformationSceneContext,
  roamerRect: ZoneRect,
  layout: LetterLayout,
): WordTransformationSceneLetter[] {
  const insertPreview = insertPreviewFromAnimation(snapshot.insertAnimation);
  const previewLayout =
    insertPreview == null
      ? null
      : computeLetterLayout(roamerRect, insertPreview.targetLetterCount);
  const activeLayout = previewLayout ?? layout;

  const geometryFor = (position: number) => ({
    centerX: letterCenterX(position, layout, insertPreview, previewLayout),
    centerY: activeLayout.rowY,
    diameter: activeLayout.diameter,
  });

  const wordTransition = context.wordTransition;
  if (wordTransition != null) {
    const phase = wordTransition.phase;
    return mapLettersWithCascade({
      word: wordTransition.word,
      keyPrefix: 0,
      phase,
      order: wordTransition.order,
      getLetterState:
        phase === 'enter' ? position => snapshot.letters[position] : undefined,
    }).map(letter => {
      const geometry = geometryFor(letter.position);
      return toSceneLetter(letter, geometry.centerX, geometry.centerY, geometry.diameter);
    });
  }

  return snapshot.letters.map(letter => {
    const geometry = geometryFor(letter.position);
    return toSceneLetter(letter, geometry.centerX, geometry.centerY, geometry.diameter);
  });
}

export function deriveSceneState({
  snapshot,
  context,
  roamerRect,
}: DeriveSceneStateParams): WordTransformationSceneState {
  const wordLayout = computeLetterLayout(roamerRect, snapshot.currentWord.length);
  const pickerLayout = computeLetterLayout(
    roamerRect,
    snapshot.variantPickerItems.length,
    TRANSFORMATION_VARIANT_ROW_Y_RATIO,
  );

  const wordOrbsVisible = !context.isCompleted;
  const lettersInteractive =
    !context.transitioning &&
    snapshot.insertAnimation == null &&
    context.wordTransition == null;
  const pickerVisible =
    (snapshot.mode === 'insert' || snapshot.insertAnimation != null) &&
    !context.transitioning &&
    context.wordTransition == null;
  const pickerInteractive = snapshot.insertAnimation == null;

  const pickerItems: WordTransformationScenePickerItem[] =
    snapshot.variantPickerItems.map((item, index) => ({
      id: item.id,
      label: item.label,
      centerX: pickerLayout.centers[index] ?? 0,
      centerY: pickerLayout.rowY,
      diameter: pickerLayout.diameter,
      popped: item.popping === true || snapshot.poppedPickerItemIds?.has(item.id) === true,
      wrong: snapshot.wrongItemId === item.id,
      hidden: snapshot.pickerHiddenItemIds.has(item.id),
      popDelayMs: item.popDelayMs ?? null,
    }));

  return {
    wordOrbsVisible,
    lettersInteractive,
    letters: deriveSceneLetters(snapshot, context, roamerRect, wordLayout),
    insertAnimation: snapshot.insertAnimation,
    variantPicker: {
      visible: pickerVisible,
      interactive: pickerInteractive,
      items: pickerItems,
    },
  };
}
