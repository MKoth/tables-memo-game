Status: ready-for-agent
Parent: .scratch/butterfly-roamer/PRD.md

## What to build

A "make the change easy" prefactor that lands the testable core of the butterfly Roamer feature without any visible rendering changes. This slice adds:

- The data types: `FlightState` enum (the 7 states), `ButterflySpawn`, `ButterflyRuntime`, `ButterflyState`, `RoamerButterflyState`, `ButterflyUniforms` (the shape the shader will receive as uniforms), and the supporting types in the new `roamer/butterfly/` folder.
- The **wing-pair allocator** as a pure function: `assignWingPairIndices(n, rng)` returning `number[]` of length `n` with the "shuffle 9, deal, then round-robin from random offset" rule. Validates output: every entry in `[0..9)`, no element appears more than 9 times.
- The **butterfly spawn config generator** as a pure function: `createRandomVisualSpawn(rng)` and `createButterflySpawnsFromWords(words, rng)`. The spawn config includes `xRatio`, `yRatio`, `phase`, `initialAngle`, `wingLeftPhaseOffset`, `wingRightPhaseOffset`, `wingLeftFreq`, `wingRightFreq`, `legPhaseOffsets[6]`, `wingPairIndex` (assigned by `assignWingPairIndices`).
- A `mulberry32` seeded RNG (already exists in `BushShaderLayer/helpers/seededRandom.ts`; reuse via import).
- The `ROAMER_BUTTERFLY_*` constants: `WING_PAIR_COUNT = 9`, `LEG_COUNT = 6`, `WING_PAIR_PICK_BIAS`, `SIT_TRANSITION_MS`, `SIT_ARC_RADIUS`, `SIT_ARC_SPEED`, `SIT_BODY_SCALE`, `WAIT_AT_TAKEN_FLOWER_PATIENCE_MS`, `LIFT_OFF_DURATION_MS`, `FLIGHT_PICK_FLOWER_PROBABILITY = 0.20`, `SITTING_FLOWER_COUNT = 12`, and the state-id constants for the 7 states.
- Asset loading: extend the flower-garden image manifest with the 19 new sources (`lycaenidae_body.png`, `lycaenidae_left_wing{1..9}.png`, `lycaenidae_right_wing{1..9}.png`); extend the `FlowerGardenThemeImages` type with `lycaenidaeBodyImage: SkImage | null`, `lycaenidaeWingLeftImages: SkImage[] | null` (9), `lycaenidaeWingRightImages: SkImage[] | null` (9); extend `useFlowerGardenThemeAssets` to load them; extend `FlowerGardenAssetsProvider` to pass them through.
- The `FieldFlowerConfig.occupant: number | null` field extension on the existing scenery type (no shader change yet).
- Unit tests for `assignWingPairIndices`: every output in `[0..9)`; for `n <= 9` no duplicates; for `n > 9` the first 9 are a permutation of `[0..9)`; for `n > 9` indices 9..n-1 follow `(startOffset + (i-9)) % 9`; same seed → same output; different seed → still valid; boundary cases `n = 1`, `n = 9`, `n = 10`, `n = 18`, `n = 27`.
- Unit tests for `createRandomVisualSpawn` and `createButterflySpawnsFromWords`: every spawn has a `wingPairIndex` in `[0..9)`; for `n <= 9` no two spawns share `wingPairIndex`; for `n > 9` the round-robin is observable; positions are in `[0, 1]`; phases are valid radian values; wing frequencies are positive; same seed → same output; different seed → still valid.
- Unit tests for the `FieldFlowerConfig.occupant` extension: the field defaults to `null` for any new config; an existing config that has no occupant reads as `null` (or `undefined` if that's the chosen default; whichever is consistent with the existing validation).

After this slice, `npm test` exercises all the new pure-function logic in isolation, the loading screen reports ready with the new images included, the `FieldFlowerConfig.occupant` slot is in place, and no butterfly is visible on screen yet. The koi roamer, the bush shader, the field-flower shader, the rose-bud shader, the `Theme` interface, and the word-sprite bridge are all unchanged.

## Acceptance criteria

- [ ] `FlightState` enum is defined with the 7 states (`FLYING_IDLE`, `FLYING_CRUISE`, `FLYING_TURN`, `APPROACH_FLOWER`, `WAIT_AT_TAKEN_FLOWER`, `SITTING`, `LIFTING_OFF`).
- [ ] `ButterflySpawn`, `ButterflyRuntime`, `ButterflyState`, `RoamerButterflyState`, `ButterflyUniforms` types are defined in the butterfly roamer folder.
- [ ] `ROAMER_BUTTERFLY_*` constants are defined in a new `config/butterflySimConfig.ts` (or equivalent) with the `ROAMER_BUTTERFLY_` prefix to avoid collision with the undersea `ROAMER_*` constants.
- [ ] `assignWingPairIndices` is implemented as a pure function with the inputs and outputs described in the PRD, validates its output, and passes its unit tests.
- [ ] `createRandomVisualSpawn` and `createButterflySpawnsFromWords` are implemented as pure functions and pass their unit tests.
- [ ] The flower-garden image manifest declares the 19 new sources and the `FlowerGardenThemeImages` type is extended with the three new image slots.
- [ ] `useFlowerGardenThemeAssets` loads the new images and surfaces them in the ready-assets state.
- [ ] `FlowerGardenAssetsProvider` passes the new images through to the context consumers.
- [ ] `FieldFlowerConfig` gains an `occupant: number | null` field; the existing `validateFieldFlowerConfigs` (or equivalent) is updated to accept the new field; existing tests still pass.
- [ ] `npm test` passes with the new unit tests.
- [ ] `npx tsc --noEmit` passes.
- [ ] `npm run lint` passes.
- [ ] No shader, no `RoamerButterflyInstance`, no `RoamerButterflyLayer`, no Theme-bundle wiring yet — the roamer slot still renders the empty `View`. The koi roamer, koi shader, bush shader, field-flower shader, rose-bud shader, word-sprite bridge, and `Theme` interface are unchanged in their behaviour.

## Blocked by

None — can start immediately.
