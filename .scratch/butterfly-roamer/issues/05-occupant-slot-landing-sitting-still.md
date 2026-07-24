Status: ready-for-agent
Parent: .scratch/butterfly-roamer/PRD.md

## What to build

A thin vertical slice: butterflies can **land on a field flower** and **sit on it, motionless, with wings still flapping**. No arc motion, no on-place turning, no legs yet. This introduces the `SITTING` and `LIFTING_OFF` states, the 20% flower-pick probability, the `APPROACH_FLOWER` state, the field-flower `occupant` slot writer, and the **two-draw-pass layer flip** (flying pass and sitting pass, gated by `pickRoamerDrawPass`).

Concretely:
- The `FlightState` enum gains `APPROACH_FLOWER`, `SITTING`, and `LIFTING_OFF` (in addition to the `FLYING_*` states from issue 03/04).
- The 20% wander-target-exhaustion roll: when `FLYING_CRUISE` exhausts a wander target (the `stateTimer` expires), there is a 20% chance the next state is `APPROACH_FLOWER` (with a target field flower picked from the field-flower configs), and an 80% chance the next state stays in `FLYING_CRUISE` with a new wander target.
- The `pickFieldFlowerTarget(roamers, configs, rng)` pure function: implements the 20% trigger, the no-duplicate-target-per-cycle rule (a roamer doesn't pick the same flower twice in a row), and the no-self-target rule. Returns the index of the chosen field-flower config or `null`.
- The `APPROACH_FLOWER` state: the roamer's `wanderAngle` is replaced by an angle pointing at the targeted field-flower anchor; position advances toward the anchor by the standard `(cos, sin) * speed * dt`; on arrival (distance < threshold), transitions to `SITTING`. The wing phase difference still steers, so the approach is slightly wiggly.
- The `SITTING` state: position is the flower anchor (no longer advanced by the speed integral); angle is the angle from the roamer to the anchor; `bodyScale` is `0.6` (smaller than the flight `bodyScale = 1.0`); wing phases continue to advance (wings still flap, in their now-asymmetric pattern); no leg phases advance; no position motion; no angle motion.
- The `LIFTING_OFF` state: position holds at the anchor; `bodyScale` lerps from `0.6` back to `1.0` over `LIFT_OFF_DURATION_MS`; on completion, transitions to `FLYING_CRUISE` with a new wander target. The targeted flower's `occupant` slot is cleared at the start of `LIFTING_OFF`.
- The field-flower `occupant` slot is written on `APPROACH_FLOWER → SITTING` (the sitting roamer's index is set on the targeted flower).
- The state-machine reducer `stepFlightStateMachine(state, ctx, dt) → { nextState, ... }` is the testable seam. It covers the new states in addition to the existing `FLYING_IDLE` / `FLYING_CRUISE` transitions.
- The `RoamerButterflyLayer` renders two `<Rect>`s per butterfly: a flying pass and a sitting pass. Both pass the same `state` shared values. The flying pass is opaque when `pickRoamerDrawPass(state) === 'flying'`; the sitting pass is opaque when `pickRoamerDrawPass(state) === 'sitting'`. Only one is non-zero in any given frame.
- The `bodyScale` shared value is added to the runtime and the shader reads it (the shader already has the `bodyScale` uniform from issue 02; this slice wires the shared value to the per-instance component).
- The `pickRoamerDrawPass(flightState)` pure function returns `'flying'` for `FLYING_IDLE`, `FLYING_CRUISE`, `FLYING_TURN`, `APPROACH_FLOWER`; `'sitting'` for `SITTING`, `LIFTING_OFF`; `'none'` for any unknown state.
- Unit tests for `pickFieldFlowerTarget`: 20% probability honoured over many trials; a target is not picked twice in a row by the same roamer without an intervening change; no roamer picks itself as the target; an empty `configs` array returns `null`; boundary cases (1 roamer, 12 flowers, 0 flowers).
- Unit tests for the state-machine reducer (this slice's portion): the `FLYING_CRUISE → APPROACH_FLOWER` transition fires only on the 20% roll; the `APPROACH_FLOWER → SITTING` transition fires on arrival and writes the roamer index to the flower's `occupant` slot; the `SITTING → LIFTING_OFF` transition fires on the dwell timer; the `LIFTING_OFF` transition clears the occupant slot.
- Unit tests for `pickRoamerDrawPass`: returns the right pass for each of the 7 named states.
- Visual smoke test on the simulator only: launch a flower-garden exercise, verify at least one butterfly lands on a field flower within 10 seconds, sits still (no position motion, no angle motion), wings still flap, the layer transition (flying → sitting → lifting off) does not flicker or jump position, the sitting butterfly is visibly smaller (`bodyScale = 0.6`), and after a few seconds the sitting butterfly lifts off and resumes flying.

## Acceptance criteria

- [ ] `FlightState` enum has `FLYING_IDLE`, `FLYING_CRUISE`, `FLYING_TURN`, `APPROACH_FLOWER`, `SITTING`, `LIFTING_OFF`.
- [ ] `pickFieldFlowerTarget(roamers, configs, rng)` is a pure function and passes its unit tests.
- [ ] `stepFlightStateMachine` covers the new states and passes its unit tests.
- [ ] `pickRoamerDrawPass(flightState)` is a pure function and returns the right pass for each state.
- [ ] `RoamerButterflyLayer` renders two passes per butterfly gated by `pickRoamerDrawPass(state)`.
- [ ] The runtime's `bodyScale` shared value is fed to the per-instance `bodyScale` uniform.
- [ ] The field flower's `occupant` slot is written on land and cleared on lift-off.
- [ ] On the simulator, butterflies land on field flowers, sit still with wings flapping, lift off after a few seconds, and the layer transitions do not flicker.
- [ ] `npm test` passes.
- [ ] `npx tsc --noEmit` passes.
- [ ] `npm run lint` passes.
- [ ] No sitting motion (no arc, no on-place turning), no legs. The koi roamer, the field-flower shader, the bush shader, the rose-bud shader, the `Theme` interface, and the word-sprite bridge are unchanged.

## Blocked by

- `.scratch/butterfly-roamer/issues/04-erratic-movement-wings-out-of-sync.md` (needs the asymmetric wing-phase movement in place before introducing landing).
