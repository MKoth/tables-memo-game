Status: ready-for-agent
Parent: .scratch/butterfly-roamer/PRD.md

## What to build

A thin vertical slice: the same movement from issue 03, but made **erratic, butterfly-like**. The two wing phases are split into **independent** left and right values with **independent frequencies and offsets**, and the **difference between the two wing phases becomes the per-frame turn source** (replacing the simple `lerp(angle, wanderAngle)` from issue 03 with a wing-driven steering model). The wander-target picker is also refined to produce a wigglier trajectory.

Concretely:
- The runtime's single `wingPhase` is split into `wingPhaseLeft` and `wingPhaseRight` (two independent shared values, each with its own frequency and starting offset).
- Each spawn config (from issue 01's `createRandomVisualSpawn`) gains `wingLeftFreq` and `wingRightFreq` (jittered around a base frequency with `+/- 5–15%` per butterfly) and `wingLeftPhaseOffset` and `wingRightPhaseOffset` (jittered in `[0, 2π]`). The two are not equal: each butterfly has its own wing-phase asymmetry, which is what makes the steering visible.
- The per-frame turn rate in `updateButterfly` becomes: `omega = (rightPhase - leftPhase) * wingSteeringGain * dt`. The wander angle is updated each frame to be the current angle + this turn delta. The simple `lerp(angle, wanderAngle)` from issue 03 is replaced (or wrapped) by this wing-driven model — wander is still picked occasionally, but the per-frame steering is the wing phase difference.
- The `pickErraticWanderAngle(currentAngle, phase, wingPhaseDiff)` pure function: the wander deviation is now smaller and more frequent, with occasional larger deviations, modulated by the current wing phase difference (so the trajectory wiggles on each wing stroke). Pure function with seeded determinism via the runtime's `phase` field.
- The `RoamerButterflyLayer` feeds `wingPhaseLeft` and `wingPhaseRight` into the per-instance `wingLeftFlap` and `wingRightFlap` uniforms (now distinct values, not the same).
- Unit tests for the asymmetric wing-phase model: `wingPhaseLeft` and `wingPhaseRight` are advanced by their own frequencies (not the same), the per-frame turn rate `omega` is `0` when `leftPhase === rightPhase` and non-zero otherwise, the turn direction reverses when the phase difference reverses, the magnitude of the turn is bounded by `wingSteeringGain * π * dt`.
- Unit tests for `pickErraticWanderAngle`: same `(phase, wingPhaseDiff)` → same output; the deviation is in the documented range; the deviation is sensitive to `wingPhaseDiff` (changing the wing state changes the wander target).

## Acceptance criteria

- [ ] The runtime's `wingPhase` is replaced by `wingPhaseLeft` and `wingPhaseRight` (two independent shared values).
- [ ] Each spawn config gains `wingLeftFreq`, `wingRightFreq`, `wingLeftPhaseOffset`, `wingRightPhaseOffset` (jittered independently).
- [ ] `updateButterfly` computes the per-frame turn rate from `(rightPhase - leftPhase) * wingSteeringGain` and applies it to `angle`.
- [ ] `pickErraticWanderAngle(currentAngle, phase, wingPhaseDiff)` is a pure function and passes its unit tests.
- [ ] `RoamerButterflyLayer` feeds `wingPhaseLeft` and `wingPhaseRight` into distinct `wingLeftFlap` and `wingRightFlap` uniforms.
- [ ] On the simulator, the butterflies fly on a slightly wiggling trajectory, the left and right wings flap out of sync, and the steering is visibly wing-driven (a butterfly with a faster left wing tends to drift right; a butterfly with a faster right wing tends to drift left).
- [ ] `npm test` passes.
- [ ] `npx tsc --noEmit` passes.
- [ ] `npm run lint` passes.
- [ ] No state machine beyond `FLYING_IDLE` / `FLYING_CRUISE`. No field-flower interaction. No sitting. No `FieldFlowerConfig.occupant` writes. The koi roamer, the field-flower shader, the bush shader, the rose-bud shader, the `Theme` interface, and the word-sprite bridge are unchanged.

## Blocked by

- `.scratch/butterfly-roamer/issues/03-movement-synced-wings-edges-evasion.md` (needs the basic movement sim to be in place before introducing the asymmetric wing-phase model).
