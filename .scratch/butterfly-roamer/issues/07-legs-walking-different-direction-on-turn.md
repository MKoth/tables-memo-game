Status: ready-for-agent
Parent: .scratch/butterfly-roamer/PRD.md

## What to build

A thin vertical slice: the **legs are added** to the butterfly. Six legs (3 per side: front-left, front-right, mid-left, mid-right, back-left, back-right), **hidden while flying**, **visible while sitting**, with a **tripod-gait walking motion** when sitting-arc or sitting-turn, and **opposite-direction stepping** when turning on the spot (left side steps one way, right side steps the other).

Concretely:
- The runtime gains `legPhase[6]` shared values (one per leg, indexed 0-5 in the order `FL, FR, ML, MR, BL, BR`) and a `legVisibility` shared value (lerps from 0 to 1 on `FLYING_* → SITTING` over `LEG_VISIBILITY_FADE_IN_MS`, lerps from 1 to 0 on `LIFTING_OFF` over `LEG_VISIBILITY_FADE_OUT_MS`).
- The spawn config (from issue 01's `createRandomVisualSpawn`) gains `legPhaseOffset[6]` (one per leg, jittered per butterfly). The offsets are chosen so the half-phase offset between opposite legs on the same side (FL/FR antiphase, ML/MR antiphase, BL/BR antiphase) produces a tripod gait. The exact offsets are in `ROAMER_BUTTERFLY_LEG_TRIPOD_OFFSETS` constants (e.g. `0, π, 2π/3, 2π/3 + π, 4π/3, 4π/3 + π` for FL, FR, ML, MR, BL, BR).
- The per-frame update advances `legPhase[i]` by `legFrequency * dt` when the runtime is in `SITTING_ARC` or `SITTING_TURN`; holds `legPhase[i]` at zero otherwise (so the legs are not visible during flight even if `legVisibility` is non-zero — `legVisibility` is also held at 0 in flight, but the per-phase hold is a safety net).
- The `SITTING_TURN` sub-mode advances leg phases in **opposite directions on left vs right side**: `legPhase[FL] -= legFrequency * dt`, `legPhase[ML] -= legFrequency * dt`, `legPhase[BL] -= legFrequency * dt` (left side negative); `legPhase[FR] += legFrequency * dt`, `legPhase[MR] += legFrequency * dt`, `legPhase[BR] += legFrequency * dt` (right side positive). The shader uses `sin(legPhase[i] + legPhaseOffset[i])` to compute the per-leg bend, so the negative direction produces an opposite-direction bend — the right side steps forward, the left side steps backward, producing a pivoting motion.
- The shader's leg-region placeholders from issue 02 are now defined: 6 UV rects in the body image's UV space, one per leg. The shader reveals each leg region by computing a per-region mask from the body's UV space, applying the per-leg bend `sin(legBend[i])` to the mask, and modulating the result by `legVisibility`. The bend amount is `legBendAmount` (a constant), producing a small visible step motion.
- The shader's `renderMode = 0` (flying pass) and `renderMode = 1` (sitting pass) handle leg regions differently: the flying pass sets `legVisibility = 0` (no leg regions visible), the sitting pass uses the runtime's `legVisibility` (so the legs fade in / out as the roamer sits / lifts off).
- The runtime's `legVisibility` is wired to the per-instance `legVisibility` uniform (already in place from issue 02; this slice wires the shared value).
- Unit tests for the leg-phase advancement: `legPhase[i]` advances by `legFrequency * dt` when in `SITTING_ARC`; holds at zero when in `FLYING_*`, `APPROACH_FLOWER`, `SITTING_IDLE`, `LIFTING_OFF`; advances in opposite directions on left vs right side when in `SITTING_TURN`.
- Unit tests for the `legVisibility` lerp: lerps from 0 to 1 on `FLYING_* → SITTING` over `LEG_VISIBILITY_FADE_IN_MS`; lerps from 1 to 0 on `LIFTING_OFF` over `LEG_VISIBILITY_FADE_OUT_MS`; held at 0 in all `FLYING_*` and `APPROACH_FLOWER` states; held at 1 in `SITTING_IDLE`, `SITTING_ARC`, `SITTING_TURN`.
- Unit tests for the tripod-gait phase offsets: `legPhaseOffset[FL] + π = legPhaseOffset[FR]` (mod 2π), and the same for the other two pairs.
- Visual smoke test on the simulator only: launch a flower-garden exercise, observe that flying butterflies have no visible legs, sitting butterflies have visible legs that step (visible bend motion) when in `SITTING_ARC`, the bend direction reverses on left vs right side when the sitting butterfly is in `SITTING_TURN`, and the legs fade in on sit and fade out on lift-off.

## Acceptance criteria

- [ ] The runtime has `legPhase[6]` and `legVisibility` shared values.
- [ ] `legPhase[i]` advances only in `SITTING_ARC` and `SITTING_TURN`; held at zero otherwise.
- [ ] `legPhase[i]` advances in opposite directions on left vs right side when in `SITTING_TURN`.
- [ ] `legVisibility` lerps from 0 to 1 on sit, 1 to 0 on lift-off.
- [ ] The shader reveals 6 leg regions when `legVisibility > 0`; hides them when `legVisibility === 0`.
- [ ] The tripod-gait phase offsets are applied: opposite legs on the same side are antiphase.
- [ ] The runtime's `legVisibility` is wired to the per-instance `legVisibility` uniform.
- [ ] On the simulator, flying butterflies have no visible legs; sitting butterflies have visible stepping legs; the bend direction reverses on turning.
- [ ] `npm test` passes.
- [ ] `npx tsc --noEmit` passes.
- [ ] `npm run lint` passes.
- [ ] The koi roamer, the field-flower shader, the bush shader, the rose-bud shader, the `Theme` interface, and the word-sprite bridge are unchanged. The Theme-bundle wiring and the Theme conformance test extension are a separate integration slice (not part of this issue).

## Blocked by

- `.scratch/butterfly-roamer/issues/06-sitting-motion-arc-and-on-place-turn.md` (needs the sitting sub-modes in place before introducing leg animation that hooks into them).
