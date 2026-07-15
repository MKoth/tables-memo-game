Status: ready-for-agent
Parent: .scratch/theme-agnostic-exercise-architecture/PRD.md

## What to build

Generalise the seam vocabulary that sits between the exercise mechanics and the theme visuals. Rename the bridge types to generic role names: `JellyfishLayoutBridge` → `WordSpriteLayoutBridge`, `KoiSimBridge` → `RoamerSimBridge`, `KoiCaptureBridge` → `RoamerCaptureBridge`, `KoiFishRuntimePosition` → `RoamerRuntimePosition`. Generalise the tutorial step values: `fish` → `roamer`, `jellyfish` → `wordSprite` (`idle` and `translate` unchanged). This is a pure rename of identifiers and enum values across the whole codebase — no type shapes or behaviour change.

After this step the bridges and tutorial state speak in generic role names, and the build is green. (The visual layers that adapt to these bridges — the jellyfish and koi components — are themselves renamed to WordSprite/Roamer in the next slice.)

## Acceptance criteria

- [ ] Bridge types use generic names: `WordSpriteLayoutBridge`, `RoamerSimBridge`, `RoamerCaptureBridge`, `RoamerRuntimePosition`.
- [ ] `TutorialStep` values are `idle` | `roamer` | `wordSprite` | `translate`.
- [ ] Every reference to the old bridge and tutorial-step names across the codebase is updated.
- [ ] No type shape or behaviour changes — identifier and enum-value rename only.
- [ ] `npx tsc --noEmit` passes.
- [ ] `npm run lint` passes.
- [ ] `npm test` passes (any test asserting a `TutorialStep` value is a naming-only expectation update).

## Blocked by

- `.scratch/theme-agnostic-exercise-architecture/issues/04-lift-seven-exercise-mechanics.md`
