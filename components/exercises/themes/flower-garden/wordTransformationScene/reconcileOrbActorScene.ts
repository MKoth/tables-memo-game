import { OrbPhase } from '../orb/orbAnimTypes';
import { ORB_ENTER_DURATION_MS, ORB_MOVE_DURATION_MS } from '../orb/orbAnimPresets';
import type { WordTransformationSceneState } from '../../../wordTransformation/scene/sceneStateTypes';
import type { InsertAnimationState } from '../../../wordTransformation/domain';
import {
  ORB_ACTOR_MAX_LETTERS,
  ORB_ACTOR_MAX_PICKER_ITEMS,
  createEmptyOrbActorRuntime,
  type OrbActorRuntime,
  type OrbActorSoundEvent,
} from './orbActorSceneTypes';
import { clamp01, easeInOutCubic, lerp } from './workletMath';

export type ReconcileOrbActorSceneResult = {
  runtimes: OrbActorRuntime[];
  soundEvents: OrbActorSoundEvent[];
};

export function resolveActorTargetGeometry(
  runtime: OrbActorRuntime,
  clockMs: number,
): { x: number; y: number; diameter: number } {
  'worklet';
  const move = runtime.move;
  if (move == null || move.durationMs <= 0) {
    return {
      x: runtime.targetCenterX,
      y: runtime.targetCenterY,
      diameter: runtime.targetDiameter,
    };
  }
  const t = easeInOutCubic(clamp01((clockMs - move.startMs) / move.durationMs));
  return {
    x: lerp(move.fromX, runtime.targetCenterX, t),
    y: lerp(move.fromY, runtime.targetCenterY, t),
    diameter: lerp(move.fromDiameter, runtime.targetDiameter, t),
  };
}

function wrongStartMsFor(prev: OrbActorRuntime | undefined, wrong: boolean, clockMs: number): number {
  'worklet';
  const wasWrong = prev != null && prev.wrongStartMs >= 0;
  if (wrong === wasWrong) {
    return prev?.wrongStartMs ?? -1;
  }
  return wrong ? clockMs : -1;
}

function seedFreshActor(
  id: string,
  kind: OrbActorRuntime['kind'],
  char: string,
  skipEnter: boolean,
  enterDelayMs: number | null,
  popped: boolean,
  targetX: number,
  targetY: number,
  targetDiameter: number,
  visible: boolean,
  clockMs: number,
  soundEvents: OrbActorSoundEvent[],
): OrbActorRuntime {
  'worklet';
  const enters = !skipEnter;
  const phase = popped ? OrbPhase.Burst : enters ? OrbPhase.Enter : OrbPhase.Idle;
  const idleStartMs =
    phase === OrbPhase.Burst || phase === OrbPhase.Idle
      ? clockMs
      : clockMs + (enterDelayMs ?? 0) + ORB_ENTER_DURATION_MS;
  if (enters && enterDelayMs != null) {
    soundEvents.push({ kind: 'inflate', dueClockMs: clockMs + enterDelayMs });
  }
  return {
    id,
    kind,
    char,
    phase,
    visible,
    targetCenterX: targetX,
    targetCenterY: targetY,
    targetDiameter,
    move: null,
    enterStartMs: clockMs,
    enterDelayMs: enterDelayMs ?? null,
    enterOriginX: targetX,
    enterOriginY: targetY,
    burstStartMs: clockMs,
    popDelayMs: null,
    idleStartMs,
    wrongStartMs: -1,
    popped,
    skipEnter,
  };
}

function reconcileLetterSlot(
  prev: OrbActorRuntime | undefined,
  position: number,
  letter: WordTransformationSceneState['letters'][number] | null,
  scene: WordTransformationSceneState,
  clockMs: number,
  soundEvents: OrbActorSoundEvent[],
): OrbActorRuntime {
  'worklet';
  const id = `letter:${position}`;
  if (letter == null) {
    return prev == null ? createEmptyOrbActorRuntime(id) : { ...prev, phase: OrbPhase.None };
  }
  const targetX = letter.centerX;
  const targetY = letter.centerY;
  const targetDiameter = letter.diameter;
  const visible = scene.wordOrbsVisible && letter.hidden !== true;
  const wrongStartMs = wrongStartMsFor(prev, letter.wrong, clockMs);

  if (prev == null) {
    const runtime = seedFreshActor(
      id,
      'letter',
      letter.char,
      letter.skipEnter === true,
      letter.enterDelayMs ?? null,
      letter.popped,
      targetX,
      targetY,
      targetDiameter,
      visible,
      clockMs,
      soundEvents,
    );
    runtime.wrongStartMs = wrongStartMs;
    if (letter.popped && letter.popDelayMs != null) {
      runtime.popDelayMs = letter.popDelayMs;
      soundEvents.push({ kind: 'pop', dueClockMs: clockMs + letter.popDelayMs });
    }
    return runtime;
  }

  if (letter.popped && !prev.popped) {
    const runtime: OrbActorRuntime = {
      ...prev,
      char: letter.char,
      popped: true,
      phase: OrbPhase.Burst,
      burstStartMs: clockMs,
      popDelayMs: letter.popDelayMs ?? null,
      targetCenterX: targetX,
      targetCenterY: targetY,
      targetDiameter,
      visible,
      wrongStartMs,
      skipEnter: letter.skipEnter === true,
    };
    if (letter.popDelayMs != null) {
      soundEvents.push({ kind: 'pop', dueClockMs: clockMs + letter.popDelayMs });
    }
    return runtime;
  }

  if (!letter.popped && prev.popped) {
    return seedFreshActor(
      id,
      'letter',
      letter.char,
      letter.skipEnter === true,
      letter.enterDelayMs ?? null,
      false,
      targetX,
      targetY,
      targetDiameter,
      visible,
      clockMs,
      soundEvents,
    );
  }

  const cascadeTrigger =
    letter.enterDelayMs != null &&
    (letter.enterDelayMs !== prev.enterDelayMs ||
      letter.char !== prev.char ||
      letter.skipEnter !== prev.skipEnter);
  if (cascadeTrigger || (letter.char !== prev.char && letter.enterDelayMs == null)) {
    return seedFreshActor(
      id,
      'letter',
      letter.char,
      letter.skipEnter === true,
      letter.enterDelayMs ?? null,
      false,
      targetX,
      targetY,
      targetDiameter,
      visible,
      clockMs,
      soundEvents,
    );
  }

  const moved =
    prev.targetCenterX !== targetX ||
    prev.targetCenterY !== targetY ||
    prev.targetDiameter !== targetDiameter;
  const resolved = resolveActorTargetGeometry(prev, clockMs);
  return {
    ...prev,
    char: letter.char,
    popped: letter.popped,
    visible,
    wrongStartMs,
    targetCenterX: targetX,
    targetCenterY: targetY,
    targetDiameter,
    skipEnter: letter.skipEnter === true,
    move: moved
      ? {
          fromX: resolved.x,
          fromY: resolved.y,
          fromDiameter: resolved.diameter,
          startMs: clockMs,
          durationMs: letter.skipEnter === true ? 0 : ORB_MOVE_DURATION_MS,
        }
      : prev.move,
  };
}

function reconcilePickerSlot(
  prev: OrbActorRuntime | undefined,
  index: number,
  item: WordTransformationSceneState['variantPicker']['items'][number] | null,
  scene: WordTransformationSceneState,
  clockMs: number,
  soundEvents: OrbActorSoundEvent[],
): OrbActorRuntime {
  'worklet';
  const id = `picker:${index}`;
  if (item == null) {
    return prev == null ? createEmptyOrbActorRuntime(id) : { ...prev, phase: OrbPhase.None };
  }
  const targetX = item.centerX;
  const targetY = item.centerY;
  const targetDiameter = item.diameter;
  const visible = scene.variantPicker.visible && !item.hidden;
  const wrongStartMs = wrongStartMsFor(prev, item.wrong, clockMs);

  if (prev == null) {
    const runtime = seedFreshActor(
      id,
      'picker',
      item.label,
      false,
      null,
      item.popped,
      targetX,
      targetY,
      targetDiameter,
      visible,
      clockMs,
      soundEvents,
    );
    runtime.wrongStartMs = wrongStartMs;
    if (item.popped && item.popDelayMs != null) {
      runtime.popDelayMs = item.popDelayMs;
      soundEvents.push({ kind: 'pop', dueClockMs: clockMs + item.popDelayMs });
    }
    return runtime;
  }

  if (item.popped && !prev.popped) {
    const runtime: OrbActorRuntime = {
      ...prev,
      char: item.label,
      popped: true,
      phase: OrbPhase.Burst,
      burstStartMs: clockMs,
      popDelayMs: item.popDelayMs ?? null,
      targetCenterX: targetX,
      targetCenterY: targetY,
      targetDiameter,
      visible,
      wrongStartMs,
    };
    if (item.popDelayMs != null) {
      soundEvents.push({ kind: 'pop', dueClockMs: clockMs + item.popDelayMs });
    }
    return runtime;
  }

  if (!item.popped && prev.popped) {
    return seedFreshActor(
      id,
      'picker',
      item.label,
      false,
      null,
      false,
      targetX,
      targetY,
      targetDiameter,
      visible,
      clockMs,
      soundEvents,
    );
  }

  const moved =
    prev.targetCenterX !== targetX ||
    prev.targetCenterY !== targetY ||
    prev.targetDiameter !== targetDiameter;
  const resolved = resolveActorTargetGeometry(prev, clockMs);
  return {
    ...prev,
    char: item.label,
    popped: item.popped,
    visible,
    wrongStartMs,
    targetCenterX: targetX,
    targetCenterY: targetY,
    targetDiameter,
    move: moved
      ? {
          fromX: resolved.x,
          fromY: resolved.y,
          fromDiameter: resolved.diameter,
          startMs: clockMs,
          durationMs: ORB_MOVE_DURATION_MS,
        }
      : prev.move,
  };
}

function reconcileFlightSlot(
  prev: OrbActorRuntime | undefined,
  flight: InsertAnimationState | null,
  clockMs: number,
): OrbActorRuntime {
  'worklet';
  const id = 'flight';
  if (flight == null) {
    return prev == null || prev.phase === OrbPhase.None
      ? prev ?? createEmptyOrbActorRuntime(id)
      : { ...prev, phase: OrbPhase.None };
  }
  const targetX = flight.toCenterX;
  const targetY = flight.toCenterY;
  const targetDiameter = flight.toDiameter;

  if (prev == null || prev.phase === OrbPhase.None || prev.char !== flight.char) {
    const reserving = flight.phase === 'reserve';
    const flying = flight.phase === 'fly';
    return {
      id,
      kind: 'flight',
      char: flight.char,
      phase: OrbPhase.Idle,
      visible: true,
      targetCenterX: reserving ? flight.fromCenterX : targetX,
      targetCenterY: reserving ? flight.fromCenterY : targetY,
      targetDiameter: reserving ? flight.fromDiameter : targetDiameter,
      move:
        reserving || !flying
          ? null
          : {
              fromX: flight.fromCenterX,
              fromY: flight.fromCenterY,
              fromDiameter: flight.fromDiameter,
              startMs: clockMs,
              durationMs: flight.flyDurationMs,
            },
      enterStartMs: clockMs,
      enterDelayMs: null,
      enterOriginX: flight.fromCenterX,
      enterOriginY: flight.fromCenterY,
      burstStartMs: clockMs,
      popDelayMs: null,
      idleStartMs: clockMs,
      wrongStartMs: -1,
      popped: false,
      skipEnter: false,
    };
  }

  if (flight.phase === 'dismiss') {
    return {
      ...prev,
      targetCenterX: targetX,
      targetCenterY: targetY,
      targetDiameter,
      move: null,
    };
  }

  const resolved = resolveActorTargetGeometry(prev, clockMs);
  return {
    ...prev,
    targetCenterX: targetX,
    targetCenterY: targetY,
    targetDiameter,
    move: {
      fromX: resolved.x,
      fromY: resolved.y,
      fromDiameter: resolved.diameter,
      startMs: clockMs,
      durationMs: flight.flyDurationMs,
    },
  };
}

export function reconcileOrbActorScene(
  prevRuntimes: readonly OrbActorRuntime[],
  scene: WordTransformationSceneState,
  clockMs: number,
): ReconcileOrbActorSceneResult {
  'worklet';
  const runtimes: OrbActorRuntime[] = [];
  const soundEvents: OrbActorSoundEvent[] = [];

  const prevById = new Map<string, OrbActorRuntime>();
  for (let i = 0; i < prevRuntimes.length; i++) {
    const runtime = prevRuntimes[i];
    if (runtime != null && runtime.phase !== OrbPhase.None) {
      prevById.set(runtime.id, runtime);
    }
  }

  for (let p = 0; p < ORB_ACTOR_MAX_LETTERS; p++) {
    runtimes.push(
      reconcileLetterSlot(
        prevById.get(`letter:${p}`),
        p,
        p < scene.letters.length ? scene.letters[p] ?? null : null,
        scene,
        clockMs,
        soundEvents,
      ),
    );
  }
  for (let i = 0; i < ORB_ACTOR_MAX_PICKER_ITEMS; i++) {
    runtimes.push(
      reconcilePickerSlot(
        prevById.get(`picker:${i}`),
        i,
        i < scene.variantPicker.items.length ? scene.variantPicker.items[i] ?? null : null,
        scene,
        clockMs,
        soundEvents,
      ),
    );
  }
  runtimes.push(reconcileFlightSlot(prevById.get('flight'), scene.insertAnimation, clockMs));

  return { runtimes, soundEvents };
}
