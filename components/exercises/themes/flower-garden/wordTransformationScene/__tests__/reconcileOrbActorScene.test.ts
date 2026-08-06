import { OrbPhase } from '../../orb/orbAnimTypes';
import { ORB_ENTER_DURATION_MS, ORB_MOVE_DURATION_MS } from '../../orb/orbAnimPresets';
import type {
  InsertAnimationState,
} from '../../../../wordTransformation/domain';
import type {
  WordTransformationSceneLetter,
  WordTransformationScenePickerItem,
  WordTransformationSceneState,
} from '../../../../wordTransformation/scene/sceneStateTypes';
import { reconcileOrbActorScene } from '../reconcileOrbActorScene';
import {
  ORB_ACTOR_FLIGHT_SLOT_INDEX,
  ORB_ACTOR_MAX_LETTERS,
  ORB_ACTOR_MAX_PICKER_ITEMS,
  pickerSlotIndex,
} from '../orbActorSceneTypes';

const CLOCK_MS = 10_000;

function makeLetter(overrides: Partial<WordTransformationSceneLetter> = {}): WordTransformationSceneLetter {
  return {
    position: 0,
    char: 'a',
    centerX: 100,
    centerY: 200,
    diameter: 50,
    popped: false,
    wrong: false,
    popDelayMs: null,
    enterDelayMs: null,
    ...overrides,
  };
}

function makePickerItem(overrides: Partial<WordTransformationScenePickerItem> = {}): WordTransformationScenePickerItem {
  return {
    id: 'p0',
    label: 'a',
    centerX: 300,
    centerY: 400,
    diameter: 50,
    popped: false,
    wrong: false,
    hidden: false,
    popDelayMs: null,
    ...overrides,
  };
}

function makeScene(overrides: Partial<WordTransformationSceneState> = {}): WordTransformationSceneState {
  return {
    wordOrbsVisible: true,
    lettersInteractive: true,
    letters: [],
    insertAnimation: null,
    variantPicker: { visible: true, interactive: true, items: [] },
    ...overrides,
  };
}

function makeFlight(overrides: Partial<InsertAnimationState> = {}): InsertAnimationState {
  return {
    phase: 'fly',
    selectedVariant: 'm',
    allVariants: ['m'],
    wrongVariants: [],
    poppedWrongVariants: new Set(),
    dismissPopOrder: [],
    char: 'm',
    fromCenterX: 300,
    fromCenterY: 400,
    fromDiameter: 50,
    toCenterX: 150,
    toCenterY: 200,
    toDiameter: 50,
    flyDurationMs: 480,
    nextWord: 'hablamos',
    insertIndex: 6,
    insertLength: 3,
    ...overrides,
  };
}

describe('reconcileOrbActorScene', () => {
  it('seeds letters with staggered enter cascades and inflate sounds', () => {
    const scene = makeScene({
      letters: [
        makeLetter({ position: 0, char: 'h', enterDelayMs: 0 }),
        makeLetter({ position: 1, char: 'a', enterDelayMs: 300 }),
        makeLetter({ position: 2, char: 'b', enterDelayMs: 600 }),
      ],
    });

    const { runtimes, soundEvents } = reconcileOrbActorScene([], scene, CLOCK_MS);

    expect(runtimes[0].phase).toBe(OrbPhase.Enter);
    expect(runtimes[0].enterStartMs).toBe(CLOCK_MS);
    expect(runtimes[0].enterDelayMs).toBe(0);
    expect(runtimes[0].idleStartMs).toBe(CLOCK_MS + ORB_ENTER_DURATION_MS);
    expect(runtimes[2].idleStartMs).toBe(CLOCK_MS + 600 + ORB_ENTER_DURATION_MS);
    expect(runtimes[2].targetCenterX).toBe(100);
    expect(runtimes[2].targetCenterY).toBe(200);
    expect(runtimes[2].visible).toBe(true);
    expect(soundEvents).toEqual([
      { kind: 'inflate', dueClockMs: CLOCK_MS },
      { kind: 'inflate', dueClockMs: CLOCK_MS + 300 },
      { kind: 'inflate', dueClockMs: CLOCK_MS + 600 },
    ]);
  });

  it('seeds skipEnter letters directly idle without a sound', () => {
    const scene = makeScene({
      letters: [makeLetter({ position: 0, char: 'm', skipEnter: true })],
    });

    const { runtimes, soundEvents } = reconcileOrbActorScene([], scene, CLOCK_MS);

    expect(runtimes[0].phase).toBe(OrbPhase.Idle);
    expect(runtimes[0].idleStartMs).toBe(CLOCK_MS);
    expect(soundEvents).toEqual([]);
  });

  it('seeds already-popped letters as bursts with pop sounds', () => {
    const scene = makeScene({
      letters: [
        makeLetter({ position: 0, char: 'h', popped: true, popDelayMs: 320 }),
      ],
    });

    const { runtimes, soundEvents } = reconcileOrbActorScene([], scene, CLOCK_MS);

    expect(runtimes[0].phase).toBe(OrbPhase.Burst);
    expect(runtimes[0].burstStartMs).toBe(CLOCK_MS);
    expect(runtimes[0].popDelayMs).toBe(320);
    expect(soundEvents).toEqual([{ kind: 'pop', dueClockMs: CLOCK_MS + 320 }]);
  });

  it('flips a live letter to burst on the popped transition with a pop sound', () => {
    const first = makeScene({ letters: [makeLetter({ position: 0 })] });
    const { runtimes } = reconcileOrbActorScene([], first, CLOCK_MS);

    const second = makeScene({
      letters: [makeLetter({ position: 0, popped: true, popDelayMs: 320 })],
    });
    const result = reconcileOrbActorScene(runtimes, second, CLOCK_MS + 100);

    expect(result.runtimes[0].phase).toBe(OrbPhase.Burst);
    expect(result.runtimes[0].burstStartMs).toBe(CLOCK_MS + 100);
    expect(result.runtimes[0].popped).toBe(true);
    expect(result.soundEvents).toEqual([{ kind: 'pop', dueClockMs: CLOCK_MS + 100 + 320 }]);
  });

  it('re-enters a recovered letter with its cascade delay', () => {
    const popped = makeScene({ letters: [makeLetter({ position: 0, popped: true })] });
    const { runtimes } = reconcileOrbActorScene([], popped, CLOCK_MS);

    const recovered = makeScene({
      letters: [makeLetter({ position: 0, char: 'b', enterDelayMs: 600 })],
    });
    const result = reconcileOrbActorScene(runtimes, recovered, CLOCK_MS + 500);

    expect(result.runtimes[0].phase).toBe(OrbPhase.Enter);
    expect(result.runtimes[0].enterStartMs).toBe(CLOCK_MS + 500);
    expect(result.runtimes[0].enterDelayMs).toBe(600);
    expect(result.runtimes[0].char).toBe('b');
    expect(result.soundEvents).toEqual([{ kind: 'inflate', dueClockMs: CLOCK_MS + 500 + 600 }]);
  });

  it('re-enters a recovered letter with the same char and delay', () => {
    const popped = makeScene({
      letters: [makeLetter({ position: 0, char: 'a', enterDelayMs: 300, popped: true })],
    });
    const { runtimes } = reconcileOrbActorScene([], popped, CLOCK_MS);

    const recovered = makeScene({
      letters: [makeLetter({ position: 0, char: 'a', enterDelayMs: 300 })],
    });
    const result = reconcileOrbActorScene(runtimes, recovered, CLOCK_MS + 500);

    expect(result.runtimes[0].phase).toBe(OrbPhase.Enter);
    expect(result.runtimes[0].enterStartMs).toBe(CLOCK_MS + 500);
  });

  it('reassembles a letter instantly when skipEnter flips on', () => {
    const idle = makeScene({ letters: [makeLetter({ position: 0, char: 'a', enterDelayMs: 300 })] });
    const { runtimes } = reconcileOrbActorScene([], idle, CLOCK_MS);

    const revealed = makeScene({
      letters: [makeLetter({ position: 0, char: 'a', enterDelayMs: 300, skipEnter: true })],
    });
    const result = reconcileOrbActorScene(runtimes, revealed, CLOCK_MS + 500);

    expect(result.runtimes[0].phase).toBe(OrbPhase.Idle);
    expect(result.runtimes[0].enterStartMs).toBe(CLOCK_MS + 500);
  });

  it('re-enters letters on a word-transition cascade (char change + delay)', () => {
    const idle = makeScene({ letters: [makeLetter({ position: 0, char: 'a' })] });
    const { runtimes } = reconcileOrbActorScene([], idle, CLOCK_MS);

    const nextWord = makeScene({
      letters: [makeLetter({ position: 0, char: 'b', enterDelayMs: 300 })],
    });
    const result = reconcileOrbActorScene(runtimes, nextWord, CLOCK_MS + 100);

    expect(result.runtimes[0].phase).toBe(OrbPhase.Enter);
    expect(result.runtimes[0].char).toBe('b');
  });

  it('keeps a letter entering when only the cascade delay changed', () => {
    const idle = makeScene({ letters: [makeLetter({ position: 0, char: 'a' })] });
    const { runtimes } = reconcileOrbActorScene([], idle, CLOCK_MS);

    const cascaded = makeScene({
      letters: [makeLetter({ position: 0, char: 'a', enterDelayMs: 300 })],
    });
    const result = reconcileOrbActorScene(runtimes, cascaded, CLOCK_MS + 100);

    expect(result.runtimes[0].phase).toBe(OrbPhase.Enter);
  });

  it('tweens geometry moves at ORB_MOVE_DURATION_MS with the resolved position as origin', () => {
    const idle = makeScene({ letters: [makeLetter({ position: 0, centerX: 100 })] });
    const { runtimes } = reconcileOrbActorScene([], idle, CLOCK_MS);

    const shifted = makeScene({
      letters: [makeLetter({ position: 0, centerX: 150 })],
    });
    const result = reconcileOrbActorScene(runtimes, shifted, CLOCK_MS + 200);

    expect(result.runtimes[0].move).toEqual({
      fromX: 100,
      fromY: 200,
      fromDiameter: 50,
      startMs: CLOCK_MS + 200,
      durationMs: ORB_MOVE_DURATION_MS,
    });
    expect(result.runtimes[0].targetCenterX).toBe(150);
  });

  it('snaps geometry moves immediately when the letter has skipEnter', () => {
    const idle = makeScene({ letters: [makeLetter({ position: 0, centerX: 100 })] });
    const { runtimes } = reconcileOrbActorScene([], idle, CLOCK_MS);

    const shifted = makeScene({
      letters: [makeLetter({ position: 0, centerX: 150, skipEnter: true })],
    });
    const result = reconcileOrbActorScene(runtimes, shifted, CLOCK_MS + 200);

    expect(result.runtimes[0].move?.durationMs).toBe(0);
  });

  it('starts and clears the wrong envelope', () => {
    const idle = makeScene({ letters: [makeLetter({ position: 0 })] });
    const { runtimes } = reconcileOrbActorScene([], idle, CLOCK_MS);

    const wrong = makeScene({ letters: [makeLetter({ position: 0, wrong: true })] });
    const wrongResult = reconcileOrbActorScene(runtimes, wrong, CLOCK_MS + 100);
    expect(wrongResult.runtimes[0].wrongStartMs).toBe(CLOCK_MS + 100);

    const cleared = makeScene({ letters: [makeLetter({ position: 0 })] });
    const clearedResult = reconcileOrbActorScene(wrongResult.runtimes, cleared, CLOCK_MS + 1100);
    expect(clearedResult.runtimes[0].wrongStartMs).toBe(-1);
  });

  it('hides letter orbs when wordOrbs are not visible', () => {
    const hidden = makeScene({
      wordOrbsVisible: false,
      letters: [makeLetter({ position: 0 })],
    });
    const { runtimes } = reconcileOrbActorScene([], hidden, CLOCK_MS);

    expect(runtimes[0].visible).toBe(false);
  });

  it('seeds picker items into their slot band', () => {
    const scene = makeScene({
      variantPicker: {
        visible: true,
        interactive: true,
        items: [
          makePickerItem({ id: 'p0', label: 'm' }),
          makePickerItem({ id: 'p1', label: 'o' }),
        ],
      },
    });

    const { runtimes } = reconcileOrbActorScene([], scene, CLOCK_MS);

    expect(runtimes[pickerSlotIndex(0)].kind).toBe('picker');
    expect(runtimes[pickerSlotIndex(0)].char).toBe('m');
    expect(runtimes[pickerSlotIndex(0)].phase).toBe(OrbPhase.Enter);
    expect(runtimes[pickerSlotIndex(1)].char).toBe('o');
    expect(runtimes[ORB_ACTOR_MAX_LETTERS]).toBe(runtimes[pickerSlotIndex(0)]);
  });

  it('swaps picker labels in place without restarting the animation', () => {
    const scene = makeScene({
      variantPicker: {
        visible: true,
        interactive: true,
        items: [makePickerItem({ id: 'p0', label: 'm' })],
      },
    });
    const { runtimes } = reconcileOrbActorScene([], scene, CLOCK_MS);

    const relabeled = makeScene({
      variantPicker: {
        visible: true,
        interactive: true,
        items: [makePickerItem({ id: 'p1', label: 'o' })],
      },
    });
    const result = reconcileOrbActorScene(runtimes, relabeled, CLOCK_MS + 5_000);

    expect(result.runtimes[pickerSlotIndex(0)].phase).toBe(OrbPhase.Enter);
    expect(result.runtimes[pickerSlotIndex(0)].enterStartMs).toBe(CLOCK_MS);
    expect(result.runtimes[pickerSlotIndex(0)].char).toBe('o');
    expect(result.runtimes[pickerSlotIndex(0)].id).toBe('picker:0');
  });

  it('hides picker items that are hidden or when the picker is invisible', () => {
    const scene = makeScene({
      variantPicker: {
        visible: true,
        interactive: true,
        items: [makePickerItem({ id: 'p0', hidden: true })],
      },
    });
    const { runtimes } = reconcileOrbActorScene([], scene, CLOCK_MS);
    expect(runtimes[pickerSlotIndex(0)].visible).toBe(false);

    const invisible = makeScene({
      variantPicker: {
        visible: false,
        interactive: false,
        items: [makePickerItem({ id: 'p0' })],
      },
    });
    const hiddenResult = reconcileOrbActorScene([], invisible, CLOCK_MS);
    expect(hiddenResult.runtimes[pickerSlotIndex(0)].visible).toBe(false);
  });

  it('bursts picker items during dismiss with staggered pop sounds', () => {
    const scene = makeScene({
      variantPicker: {
        visible: true,
        interactive: true,
        items: [
          makePickerItem({ id: 'p0', label: 's' }),
          makePickerItem({ id: 'p1', label: 'r' }),
        ],
      },
    });
    const { runtimes } = reconcileOrbActorScene([], scene, CLOCK_MS);

    const dismissing = makeScene({
      variantPicker: {
        visible: true,
        interactive: true,
        items: [
          makePickerItem({ id: 'p0', label: 's', popped: true, popDelayMs: 0 }),
          makePickerItem({ id: 'p1', label: 'r', popped: true, popDelayMs: 320 }),
        ],
      },
    });
    const result = reconcileOrbActorScene(runtimes, dismissing, CLOCK_MS + 1_000);

    expect(result.runtimes[pickerSlotIndex(0)].phase).toBe(OrbPhase.Burst);
    expect(result.runtimes[pickerSlotIndex(1)].phase).toBe(OrbPhase.Burst);
    expect(result.soundEvents).toEqual([
      { kind: 'pop', dueClockMs: CLOCK_MS + 1_000 },
      { kind: 'pop', dueClockMs: CLOCK_MS + 1_320 },
    ]);
  });

  it('seeds the insert flight at the from position while reserving', () => {
    const scene = makeScene({ insertAnimation: makeFlight({ phase: 'reserve' }) });

    const { runtimes } = reconcileOrbActorScene([], scene, CLOCK_MS);

    const flight = runtimes[ORB_ACTOR_FLIGHT_SLOT_INDEX];
    expect(flight.kind).toBe('flight');
    expect(flight.phase).toBe(OrbPhase.Idle);
    expect(flight.targetCenterX).toBe(300);
    expect(flight.targetCenterY).toBe(400);
    expect(flight.targetDiameter).toBe(50);
    expect(flight.move).toBeNull();
  });

  it('flies the insert flight to the target over flyDurationMs', () => {
    const scene = makeScene({ insertAnimation: makeFlight({ phase: 'fly' }) });

    const { runtimes } = reconcileOrbActorScene([], scene, CLOCK_MS);

    const flight = runtimes[ORB_ACTOR_FLIGHT_SLOT_INDEX];
    expect(flight.targetCenterX).toBe(150);
    expect(flight.targetCenterY).toBe(200);
    expect(flight.move).toEqual({
      fromX: 300,
      fromY: 400,
      fromDiameter: 50,
      startMs: CLOCK_MS,
      durationMs: 480,
    });
  });

  it('retargets the flight when the fly scene updates after a reserve', () => {
    const reserving = makeScene({ insertAnimation: makeFlight({ phase: 'reserve' }) });
    const { runtimes } = reconcileOrbActorScene([], reserving, CLOCK_MS);

    const flying = makeScene({ insertAnimation: makeFlight({ phase: 'fly' }) });
    const result = reconcileOrbActorScene(runtimes, flying, CLOCK_MS + 50);

    const flight = result.runtimes[ORB_ACTOR_FLIGHT_SLOT_INDEX];
    expect(flight.targetCenterX).toBe(150);
    expect(flight.move).toEqual({
      fromX: 300,
      fromY: 400,
      fromDiameter: 50,
      startMs: CLOCK_MS + 50,
      durationMs: 480,
    });
  });

  it('snaps the flight to the target on dismiss and clears it when the animation ends', () => {
    const flying = makeScene({ insertAnimation: makeFlight({ phase: 'fly' }) });
    const { runtimes } = reconcileOrbActorScene([], flying, CLOCK_MS);

    const dismissing = makeScene({
      insertAnimation: makeFlight({ phase: 'dismiss', toCenterX: 160, toCenterY: 210 }),
    });
    const dismissed = reconcileOrbActorScene(runtimes, dismissing, CLOCK_MS + 480);
    const flight = dismissed.runtimes[ORB_ACTOR_FLIGHT_SLOT_INDEX];
    expect(flight.targetCenterX).toBe(160);
    expect(flight.move).toBeNull();
    expect(flight.phase).toBe(OrbPhase.Idle);

    const cleared = makeScene({ insertAnimation: null });
    const done = reconcileOrbActorScene(dismissed.runtimes, cleared, CLOCK_MS + 560);
    expect(done.runtimes[ORB_ACTOR_FLIGHT_SLOT_INDEX].phase).toBe(OrbPhase.None);
  });

  it('keeps empty slots in the None phase and returns a fixed-size array', () => {
    const scene = makeScene();
    const { runtimes } = reconcileOrbActorScene([], scene, CLOCK_MS);

    expect(runtimes).toHaveLength(ORB_ACTOR_MAX_LETTERS + ORB_ACTOR_MAX_PICKER_ITEMS + 1);
    for (const runtime of runtimes) {
      expect(runtime.phase).toBe(OrbPhase.None);
    }
  });

  it('carries forward runtime state across reconciles by slot id', () => {
    const scene = makeScene({
      letters: [makeLetter({ position: 0, char: 'a' })],
    });
    const { runtimes } = reconcileOrbActorScene([], scene, CLOCK_MS);
    expect(runtimes[0].phase).toBe(OrbPhase.Enter);
    expect(runtimes[0].enterStartMs).toBe(CLOCK_MS);

    const idleLater = reconcileOrbActorScene(runtimes, scene, CLOCK_MS + 5_000);
    expect(idleLater.runtimes[0].phase).toBe(OrbPhase.Enter);
    expect(idleLater.runtimes[0].enterStartMs).toBe(CLOCK_MS);
    expect(idleLater.soundEvents).toEqual([]);
  });

  it('treats a vanished and reappeared letter as fresh', () => {
    const present = makeScene({ letters: [makeLetter({ position: 0, char: 'a' })] });
    const { runtimes } = reconcileOrbActorScene([], present, CLOCK_MS);

    const gone = makeScene({ letters: [] });
    const empty = reconcileOrbActorScene(runtimes, gone, CLOCK_MS + 1_000);
    expect(empty.runtimes[0].phase).toBe(OrbPhase.None);

    const back = makeScene({
      letters: [makeLetter({ position: 0, char: 'b', enterDelayMs: 300 })],
    });
    const revived = reconcileOrbActorScene(empty.runtimes, back, CLOCK_MS + 2_000);
    expect(revived.runtimes[0].phase).toBe(OrbPhase.Enter);
  });
});
