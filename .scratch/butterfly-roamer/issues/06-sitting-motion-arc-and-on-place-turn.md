Status: ready-for-agent
Parent: .scratch/butterfly-roamer/PRD.md

## What to build

A thin vertical slice: the **sitting state gets motion**. The sitting butterfly can be in one of three local sub-modes (not separate `FlightState` values — they're a sub-mode flag in the runtime, per the grilling decision that "Internal 'sitting sub-modes' are local, not a state"):
- `SITTING_IDLE` — still, no motion.
- `SITTING_ARC` — walks a small arc around the flower anchor.
- `SITTING_TURN` — turns on the spot (angle lerps directly to the desired target, no arc).

Sub-modes transition on a timer. The `FLYING_TURN` state (deliberate heading change to a new wander target) is also added to the `FlightState` enum, often elided into `FLYING_CRUISE` for small heading deltas. Still no leg animation.

Concretely:
- The runtime gains a `sittingSubMode: 'idle' | 'arc' | 'turn'` shared value and a `sitPhase` shared value (advanced each frame when in `SITTING_ARC`).
- The `SITTING_IDLE` sub-mode: position holds at the anchor, angle holds; `sitPhase` does not advance; no per-frame motion.
- The `SITTING_ARC` sub-mode: position walks a small arc around the anchor. `positionX = anchorX + cos(sitPhase) * sitArcRadius`; `positionY = anchorY + sin(sitPhase) * sitArcRadius * 0.5` (squashed vertically to look like a flat surface). `sitPhase += sitArcSpeed * dt` (very slow, one full arc every ~8 seconds). Angle holds.
- The `SITTING_TURN` sub-mode: angle lerps directly to the desired on-place turn target without an arc (immediate, like a top turning). Position holds at the anchor. The turn target is a small random angle delta.
- Sub-mode transitions on a timer: `SITTING_IDLE → SITTING_ARC` after `SITTING_IDLE_DURATION_MS`; `SITTING_ARC → SITTING_TURN` after `SITTING_ARC_DURATION_MS`; `SITTING_TURN → SITTING_IDLE` after `SITTING_TURN_DURATION_MS`. Timers and durations are in the new `ROAMER_BUTTERFLY_*` constants.
- The `FLYING_TURN` state is added to the `FlightState` enum (even if, for small heading deltas, it is elided into `FLYING_CRUISE` at the worklet level — the state exists for art direction and for the future case of large heading changes that need a deliberate turn).
- The state-machine reducer `stepFlightStateMachine` covers the sub-mode transitions and the `FLYING_TURN` state.
- The `RoamerButterflyLayer` feeds `positionX`, `positionY`, `angle` from the runtime's shared values into the per-instance `bodyCenterX`, `bodyCenterY`, `bodyAngle` uniforms (already in place from issue 02; this slice wires the shared values to the per-instance component for sitting sub-modes).
- Unit tests for the sub-mode transition: the sub-mode cycles through `SITTING_IDLE → SITTING_ARC → SITTING_TURN → SITTING_IDLE` on the documented timers; the timers are honoured (over many trials, the average sub-mode duration matches the constants within tolerance); the sub-mode does not change on every frame (only on timer expiry).
- Unit tests for the sit arc motion: `sitPhase` advances by `sitArcSpeed * dt` per frame when in `SITTING_ARC`; `sitPhase` does not advance in `SITTING_IDLE` or `SITTING_TURN`; the position is the anchor + the arc offset, with the vertical squash factor of 0.5.
- Unit tests for the on-place turning: `angle` lerps directly to the turn target (no arc) when in `SITTING_TURN`; the turn target is a small random delta on entry; the angle is clamped to `[-π, π]`.
- Visual smoke test on the simulator only: launch a flower-garden exercise, wait for at least one butterfly to land on a field flower, observe that the sitting butterfly cycles through the sub-modes (still, walking arc, turning on the spot), with the arc walking a visible small circle around the flower and the on-place turn visibly changing the angle without the body arcing.

## Acceptance criteria

- [ ] The runtime has a `sittingSubMode` shared value and a `sitPhase` shared value.
- [ ] `SITTING_IDLE` holds position and angle; `sitPhase` does not advance.
- [ ] `SITTING_ARC` walks the position on the small arc around the anchor; `sitPhase` advances.
- [ ] `SITTING_TURN` lerps the angle directly to the turn target; position holds.
- [ ] Sub-modes transition on the documented timers.
- [ ] `FLYING_TURN` is in the `FlightState` enum.
- [ ] `stepFlightStateMachine` covers the sub-mode transitions and the `FLYING_TURN` state.
- [ ] The `RoamerButterflyLayer` wires the runtime's `x`, `y`, `angle` to the per-instance `bodyCenterX`, `bodyCenterY`, `bodyAngle` uniforms.
- [ ] On the simulator, sitting butterflies cycle through idle / arc / turn sub-modes visibly.
- [ ] `npm test` passes.
- [ ] `npx tsc --noEmit` passes.
- [ ] `npm run lint` passes.
- [ ] No leg animation. The koi roamer, the field-flower shader, the bush shader, the rose-bud shader, the `Theme` interface, and the word-sprite bridge are unchanged.

## Blocked by

- `.scratch/butterfly-roamer/issues/05-occupant-slot-landing-sitting-still.md` (needs the basic landing and the two-draw-pass layer flip in place before introducing sitting motion).
