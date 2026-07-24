Status: ready-for-agent
Parent: .scratch/butterfly-roamer/PRD.md

## What to build

A thin vertical slice: the butterflies **move, turn, evade each other, and avoid screen edges**, with **both wings flapping in sync** (the same phase on left and right, with the same frequency). This is a basic steering sim — the koi-style `wanderAngle + boundary + separation` model — and it uses a single wing phase (no asymmetric steering yet). No state machine beyond the `FLYING_IDLE` / `FLYING_CRUISE` toggle, no field-flower interaction, no sitting.

Concretely:
- The `FlightState` enum gains `FLYING_IDLE` and `FLYING_CRUISE` (and `FLYING_TURN` as a placeholder for now). `FLYING_IDLE` is the resting state (roamer flaps in place with a small drift); `FLYING_CRUISE` is the active state (roamer moves toward `wanderAngle`).
- The `createButterflyRuntime(spawn, swimZone)` factory: creates a `ButterflyRuntime` with the shared values the per-frame update will read/write. The runtime is `x`, `y`, `angle`, `speed`, `wingPhase` (a single shared value for this slice — both wings are the same phase), `state` (one of the FlightState values), `stateTimer`, `wanderAngle`, `prevAngle` (for turn-arc feedback), `targetBaseSpeed`.
- The `updateButterfly(butterfly, dt, swimZone, neighbors)` worklet (basic version): each frame,
  - Advances `wingPhase` by `wingFrequency * dt` (single value drives both wings, hence synced).
  - If `state === FLYING_CRUISE`: advances `position` by `(cos(angle), sin(angle)) * speed * dt`, lerps `angle` toward `wanderAngle`, applies the boundary turn offset if the roamer is near a screen edge, applies the spatial-hash separation steer from `neighbors`, lerps `speed` toward `targetBaseSpeed`. Decrements `stateTimer`. On `stateTimer <= 0` transitions to `FLYING_IDLE`.
  - If `state === FLYING_IDLE`: roamer's speed drops to a small drift speed, `wingPhase` continues to advance (flapping in place), `stateTimer` decrements. On `stateTimer <= 0` transitions to `FLYING_CRUISE` and re-picks `wanderAngle` and `targetBaseSpeed`.
- The `useButterflySimulation` hook returning `{ runtimeEntries, sharedPositions, renderProps, hitRadius, swimZoneTop, swimZoneHeight, swimZoneLeft, swimZoneWidth }`.
- The `RoamerButterflyLayer` consumes the runtime entries and feeds `wingPhase` into the per-instance `wingLeftFlap` and `wingRightFlap` uniforms (same value, both wings synced). The `bodyCenterX`, `bodyCenterY` uniforms come from the runtime's `x`, `y` shared values.
- The spatial-hash separation is a small adaptation of the koi's existing helper (reuse or copy with minimal change). The koi's `updateFish` worklet is the prior art.
- The `pickWanderAngle(currentAngle, phase)` pure function: a deterministic-by-phase wander-target picker that adds a deviation in `[-π, +π]` based on `sin(phase * k1)`. The function is the testable seam; the worklet calls it on a wander-target re-pick.
- The `pickTargetBaseSpeed(phase)` pure function: similar deterministic-by-phase speed picker.
- Unit tests for `pickWanderAngle` and `pickTargetBaseSpeed`: same `phase` → same output; different `phase` → different output (within the valid range); output values are within the documented bounds; same seed across the worklet produces the same wander history.

## Acceptance criteria

- [ ] `FlightState` enum has `FLYING_IDLE` and `FLYING_CRUISE` (and `FLYING_TURN` as a placeholder, even if it just aliases to `FLYING_CRUISE` for now).
- [ ] `createButterflyRuntime(spawn, swimZone)` creates a runtime with `x`, `y`, `angle`, `speed`, `wingPhase` (single value), `state`, `stateTimer`, `wanderAngle`, `prevAngle`, `targetBaseSpeed` shared values.
- [ ] `updateButterfly` is a worklet that runs the basic sim and advances wing phase, position, angle, speed, and state.
- [ ] `useButterflySimulation` returns the documented hook output.
- [ ] `RoamerButterflyLayer` feeds `wingPhase` into both `wingLeftFlap` and `wingRightFlap` (synced) and reads `x`, `y` from the runtime.
- [ ] `pickWanderAngle(currentAngle, phase)` is a pure function and passes its unit tests.
- [ ] `pickTargetBaseSpeed(phase)` is a pure function and passes its unit tests.
- [ ] On the simulator, the butterflies move around the roamer zone, turn toward wander targets, avoid screen edges, avoid each other, and flap their wings in sync (left wing and right wing are the same phase at all times).
- [ ] The same seed produces the same wander history (verified by a deterministic position trail).
- [ ] `npm test` passes.
- [ ] `npx tsc --noEmit` passes.
- [ ] `npm run lint` passes.
- [ ] No asymmetric wing phase (this slice's `wingPhase` is single-valued; the next slice splits it). No state machine beyond `FLYING_IDLE` / `FLYING_CRUISE`. No field-flower interaction. No sitting. No `FieldFlowerConfig.occupant` writes. The koi roamer, the field-flower shader, the bush shader, the rose-bud shader, the `Theme` interface, and the word-sprite bridge are unchanged.

## Blocked by

- `.scratch/butterfly-roamer/issues/02-static-images-on-scene.md` (needs the per-instance component and the layer to be in place — the runtime values feed those components' uniforms).
