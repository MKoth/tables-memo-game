import { OrbPhase, type OrbAnimState, type OrbAnimationConfig } from '../orb/orbAnimTypes';

export const ORB_ACTOR_MAX_LETTERS = 16;
export const ORB_ACTOR_MAX_PICKER_ITEMS = 8;
export const ORB_ACTOR_FLIGHT_SLOT_INDEX = ORB_ACTOR_MAX_LETTERS + ORB_ACTOR_MAX_PICKER_ITEMS;
export const ORB_ACTOR_SLOT_COUNT = ORB_ACTOR_FLIGHT_SLOT_INDEX + 1;

export type OrbActorMove = {
  fromX: number;
  fromY: number;
  fromDiameter: number;
  startMs: number;
  durationMs: number;
};

export type OrbActorRuntime = {
  id: string;
  kind: 'letter' | 'picker' | 'flight';
  char: string;
  phase: number;
  visible: boolean;
  targetCenterX: number;
  targetCenterY: number;
  targetDiameter: number;
  move: OrbActorMove | null;
  enterStartMs: number;
  enterDelayMs: number | null;
  enterOriginX: number;
  enterOriginY: number;
  burstStartMs: number;
  popDelayMs: number | null;
  idleStartMs: number;
  wrongStartMs: number;
  popped: boolean;
  skipEnter: boolean;
};

export type OrbActorSoundEvent = {
  kind: 'pop' | 'inflate';
  dueClockMs: number;
};

export function createEmptyOrbActorRuntime(id: string): OrbActorRuntime {
  'worklet';
  return {
    id,
    kind: 'letter',
    char: '',
    phase: OrbPhase.None,
    visible: false,
    targetCenterX: 0,
    targetCenterY: 0,
    targetDiameter: 0,
    move: null,
    enterStartMs: 0,
    enterDelayMs: null,
    enterOriginX: 0,
    enterOriginY: 0,
    burstStartMs: 0,
    popDelayMs: null,
    idleStartMs: 0,
    wrongStartMs: -1,
    popped: false,
    skipEnter: false,
  };
}

export function createEmptyOrbActorRuntimes(): OrbActorRuntime[] {
  'worklet';
  const runtimes: OrbActorRuntime[] = [];
  for (let p = 0; p < ORB_ACTOR_MAX_LETTERS; p++) {
    runtimes.push(createEmptyOrbActorRuntime(`letter:${p}`));
  }
  for (let i = 0; i < ORB_ACTOR_MAX_PICKER_ITEMS; i++) {
    runtimes.push(createEmptyOrbActorRuntime(`picker:${i}`));
  }
  runtimes.push(createEmptyOrbActorRuntime('flight'));
  return runtimes;
}

export function pickerSlotIndex(index: number): number {
  'worklet';
  return ORB_ACTOR_MAX_LETTERS + index;
}

export type { OrbAnimState, OrbAnimationConfig };
