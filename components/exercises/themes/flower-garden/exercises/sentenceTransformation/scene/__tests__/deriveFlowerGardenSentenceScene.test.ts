import type { ZoneRect } from '../../../../../../core/layout/computeExerciseLayout';
import { computeLetterLayout } from '../../../../../../core/layout/exerciseLayout';
import type { LetterOrbModel, VariantPickerItem } from '../../../../../../wordTransformation/domain';
import type { SentenceTransformationGame } from '../../../../../../sentenceTransformation/hooks/useSentenceTransformationGame';
import {
  computeMergeCluster,
  deriveFlowerGardenSentenceScene,
} from '../deriveFlowerGardenSentenceScene';

const ROAMER: ZoneRect = { x: 0, y: 0, w: 400, h: 400 };

function makeLetters(word: string): LetterOrbModel[] {
  return word.split('').map((char, position) => ({
    key: `0:${position}`,
    char,
    position,
    popped: false,
    wrong: false,
  }));
}

function makePickerItems(labels: string[]): VariantPickerItem[] {
  return labels.map(label => ({ id: label, label }));
}

function makeGame(overrides: Partial<SentenceTransformationGame> = {}): SentenceTransformationGame {
  return {
    isCompleted: false,
    transitioning: false,
    roundPhase: 'transform',
    blankSlotIndex: 1,
    blankExiting: false,
    poppingSlotIndex: null,
    mergeWord: null,
    insertAnimation: null,
    resolutionOrb: null,
    bubbleEnter: null,
    sequence: null,
    operation: null,
    mode: 'delete',
    letters: makeLetters('hablar'),
    variantPickerItems: [],
    pickerHiddenItemIds: new Set<string>(),
    wrongItemId: null,
    poppedPickerItemIds: undefined,
    instruction: 'Tap a letter to delete it',
    displaySlots: [],
    conjugatedForm: '',
    roundPos: 0,
    motionPaths: [],
    bubbleTranslation: '',
    solvedCount: 0,
    totalCount: 3,
    handleLetterPress: () => {},
    handleVariantPress: () => {},
    handleRowEnterComplete: () => {},
    handleMergeComplete: () => {},
    handleMaterializeComplete: () => {},
    handleResolveComplete: () => {},
    handlePopComplete: () => {},
    handleRowExitComplete: () => {},
    ...overrides,
  };
}

describe('deriveFlowerGardenSentenceScene', () => {
  it('maps letters onto the letter row geometry during transform', () => {
    const layout = computeLetterLayout(ROAMER, 6);
    const scene = deriveFlowerGardenSentenceScene({
      game: makeGame(),
      roamerRect: ROAMER,
    });

    expect(scene.letters).toHaveLength(6);
    expect(scene.letters[0]).toMatchObject({
      position: 0,
      char: 'h',
      centerX: layout.centers[0],
      centerY: layout.rowY,
      diameter: layout.diameter,
      popped: false,
    });
    expect(scene.lettersInteractive).toBe(true);
    expect(scene.variantPicker.visible).toBe(false);
  });

  it('keeps letters hidden while the row is entering (cascade)', () => {
    const game = makeGame({
      roundPhase: 'enter',
      bubbleEnter: {
        revealOrder: [2, 0, 1],
        revealedPositions: new Set<number>(),
      },
      letters: makeLetters('hablar').map((letter, index) => ({
        ...letter,
        enterDelayMs: index * 40,
      })),
    });
    const scene = deriveFlowerGardenSentenceScene({ game, roamerRect: ROAMER });

    expect(scene.lettersInteractive).toBe(false);
    expect(scene.letters.map(letter => letter.enterDelayMs)).toEqual([0, 40, 80, 120, 160, 200]);
  });

  it('shows the variant picker row during insert mode with geometry and flags', () => {
    const pickerLayout = computeLetterLayout(ROAMER, 3, 0.65);
    const game = makeGame({
      mode: 'insert',
      variantPickerItems: makePickerItems(['mos', 'bas', 'nes']),
      pickerHiddenItemIds: new Set(['bas']),
      wrongItemId: 'nes',
    });
    const scene = deriveFlowerGardenSentenceScene({ game, roamerRect: ROAMER });

    expect(scene.variantPicker.visible).toBe(true);
    expect(scene.variantPicker.interactive).toBe(true);
    expect(scene.variantPicker.items).toHaveLength(3);
    expect(scene.variantPicker.items[0]).toMatchObject({
      id: 'mos',
      centerX: pickerLayout.centers[0],
      centerY: pickerLayout.rowY,
      hidden: false,
      popped: false,
    });
    expect(scene.variantPicker.items[1]?.hidden).toBe(true);
    expect(scene.variantPicker.items[2]?.wrong).toBe(true);
  });

  it('converges letters into a tight cluster around the letter-row midpoint during merge', () => {
    const game = makeGame({
      roundPhase: 'merge',
      transitioning: true,
      mergeWord: 'hablar',
    });
    const scene = deriveFlowerGardenSentenceScene({ game, roamerRect: ROAMER });

    const layout = computeLetterLayout(ROAMER, 6);
    const cluster = computeMergeCluster(layout);
    expect(scene.letters).toHaveLength(6);
    expect(scene.letters[0]?.centerY).toBe(cluster.centerY);
    const xs = scene.letters.map(letter => letter.centerX);
    for (let i = 1; i < xs.length; i++) {
      expect(xs[i]! - xs[i - 1]!).toBeCloseTo(cluster.spacing, 6);
    }
    expect(cluster.spacing).toBeLessThan(layout.diameter);
    expect(Math.abs((xs[0]! + xs[xs.length - 1]!) * 0.5 - cluster.centerX)).toBeCloseTo(0, 6);
    expect(scene.lettersInteractive).toBe(false);
  });

  it('empties letters once the resolution orb takes over', () => {
    const game = makeGame({
      roundPhase: 'materialize',
      resolutionOrb: {
        word: 'hablar',
        fromCenterX: 200,
        fromCenterY: 80,
        fromDiameter: 120,
        toCenterX: 100,
        toCenterY: 200,
        toDiameter: 120,
        flyDurationMs: 3000,
      },
      letters: [],
    });
    const scene = deriveFlowerGardenSentenceScene({ game, roamerRect: ROAMER });

    expect(scene.letters).toEqual([]);
  });

  it('hides word orbs when the session is complete', () => {
    const scene = deriveFlowerGardenSentenceScene({
      game: makeGame({ isCompleted: true }),
      roamerRect: ROAMER,
    });

    expect(scene.wordOrbsVisible).toBe(false);
  });
});
