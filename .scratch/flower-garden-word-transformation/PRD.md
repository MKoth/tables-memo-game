Status: ready-for-agent

# Flower-garden word transformation exercise

## Problem Statement

The flower-garden theme can only run the table exercise today. Its word-transformation visuals are empty stubs (`FlowerGardenLetterOrb`, `FlowerGardenTransformationWordOrbs`, `FlowerGardenTransformationOrbLayer` render nothing), and its escape coordinator (`useFlowerGardenRoamerEscapeCoordinator`) is a no-op. The undersea theme has a complete table word transformation exercise — rose table, decorative roamers, letter bubbles — and the flower-garden theme needs the same mechanic with its own visual language.

## Solution

Build the flower-garden table word transformation exercise, mirroring the undersea one: the rose table shows the conjugation grid, non-interactive roamers (butterflies, bees, bumblebees) carry the table's conjugated forms and fly off through the solved cell when a transformation sequence succeeds, and letter bubbles are replaced by **letter orbs** — mini petal circles built from the existing capture-orb machinery (petal rings, enter/idle/burst lifecycle) reduced by config: one ring, 7 petals, smaller petals, letter-slot diameter.

Supporting changes: a `ringCount` parameter on the orb config (default 3, clamped to 1–3) so the word-transformation exercise can specify a single ring; a red-tint + shake wrong-feedback on orbs (mirroring the undersea bubble's wrong state); the variant picker and insert flight reuse the same petal-orb visual; the rose table layer gains `extraRevealedBodyIndices` so solved cells stay revealed. A new public entry component is registered in the app menu. All sounds are wired to the existing no-op flower-garden sound controller; real sound assets are added later.

## User Stories

1. As a learner, I want to transform an infinitive into a conjugated form in the flower-garden theme, so that I can practice the same conjugation mechanic with the garden aesthetic.
2. As a learner, I want each letter of the current word displayed as a small petal circle (one ring, 7 petals) with the letter at the center, so that the transformation mechanic matches the garden visual language.
3. As a learner, I want a letter orb's petals to spiral in as it appears, so that letters entering the word row feel alive and consistent with the capture orb.
4. As a learner, I want letter orbs' petals to keep rotating and drifting while idle, so that the word row stays visually alive during play.
5. As a learner, I want a letter orb's petals to scatter and fade when a letter is deleted, so that removal feels responsive and satisfying.
6. As a learner, I want a wrong tap to tint the letter orb red and shake it briefly (about one second, same timing as the undersea bubble), then return to normal, so that wrong feedback is consistent across themes.
7. As a learner, I want the letter glyph at the orb center to turn red while a wrong tap is showing, so that the wrong letter is unambiguous.
8. As a learner, I want the insert variant picker options to appear as the same petal-circle orbs, so that every interactive element in the exercise shares one visual language.
9. As a learner, I want a mis-tap on a variant picker option to flash red and shake like a letter orb, so that picker mistakes read the same as word-row mistakes.
10. As a learner, I want an inserted letter to fly from the picker to its slot as a petal-circle orb, so that the insert motion follows the same visual language.
11. As a learner, I want roamers swimming through the garden during the exercise (non-interactive), so that the scene feels alive while I transform words.
12. As a learner, I want the roamer carrying the word I just solved to fly through that cell's rose and leave the screen shortly after success, so that success produces a clear reward moment.
13. As a learner, I want a solved cell to stay revealed as I continue transforming other cells, so that I can see my progress across the whole table.
14. As a developer, I want the flower-garden word transformation to mirror the undersea exercise's structure (shell, scenery, roamers, table, orb layer, instruction bar), so that the theme pair stays maintainable.
15. As a developer, I want the letter orb to reuse the capture orb's animation machinery and petal rendering via a config preset, so that no new visual system is invented for this exercise.
16. As a developer, I want a `ringCount` parameter (default 3, max 3) on the orb config input, so that exercises can request fewer petal rings without changing the orb code.
17. As a developer, I want the ring selection helper shared between petal generation and ring rotation, so that petal count and rotation config can never disagree.
18. As a developer, I want wrong-feedback tint strength carried in the orb animation state, so that tinting works for any orb user without special-casing.
19. As a developer, I want the rose table layer to accept extra revealed body indices, so that game-driven reveal works exactly like the undersea layer.
20. As a developer, I want the flower-garden escape coordinator to be a pure, testable factory mirroring the undersea one, so that the escape behavior is verified without React.
21. As a developer, I want a new public entry component and app-menu registration for the flower-garden word transformation exercise, so that I can launch it from the menu.
22. As a developer, I want all sound callbacks wired to the existing (no-op) flower-garden sound controller, so that adding real sounds later requires only filling in one file.

## Implementation Decisions

### Exercise structure

New `FlowerGardenThemeTableWordTransformationExercise` mirroring `UnderseaThemeTableWordTransformationExercise`: `ExerciseShell` with the existing `WORD_TRANSFORMATION_STORE_CONFIG`, scenery, a non-interactive roamer layer, the rose table layer, a transformation orb layer, the generic `TransformationInstructionBar`, and corner controls with `helpVisible={false}` (no tutorial — the flower-garden tutorial copy is capture-specific). Z-order: scenery bottom, roamers above it, table above that, orb layer top — matching the undersea exercise's layering.

New public entry `FlowerGardenWordTransformationExercise` (ThemeProvider + flower-garden theme, like `FlowerGardenTableExercise`), registered in the app menu as `flowerGardenWordTransformation`.

### Ring-count parameter

`OrbConfigInput` gains `ringCount?: number` — default 3, silently clamped to [1, 3]. A shared `sliceOrbRings(rings, ringCount)` helper selects the first N ring configs; both `generateOrbPetalConfigs` and the `useOrbAnimation` call site use it, so petal spawn config and ring rotation config always come from the same sliced set. A clamped value degrades to the nearest valid orb rather than throwing.

### Letter orb preset

A `LETTER_ORB_PRESET` (or equivalent constant set) next to the capture presets:

| Parameter | Value |
|---|---|
| ringCount | 1 |
| petalCount | 7 |
| ring centerRadius | 0.4 (of orb diameter) |
| ring thickness | 0.14 |
| ring widthFraction | 0.5 |
| ring rotationSpeed | 0.35 |
| petal size factor | 0.6 (≈17 px petals vs the capture orb's ≈25 px inner-ring petals) |

The orb diameter is the generic letter-slot diameter from `computeLetterLayout` (the same call the undersea layer uses) — the letter orbs are small because the slots are small, not because of an extra knob. Petal images come from the existing 21 `pettel{i}.png` set via the existing seeded-RNG assignment.

### Letter orb lifecycle

The letter orb runs the capture orb's Enter → Idle → Burst lifecycle, phase-mapped to the letter status:
- **enter** = petals spiral in and assemble, letter glyph materializes (`enterDelayMs` honored)
- **idle** = ring rotation + petal self-spin + radial drift
- **burst** = on `popped` (`popDelayMs` honored) petals scatter and fade, `onPopComplete` fires

Driven by the existing `useOrbAnimation` hook (per letter), with `enabled` tied to the letter appearing and `startBurst` triggered by the status transition to `popped`.

### Wrong feedback

Mirror the undersea bubble exactly so behavior is identical across themes:
- `tintR`/`tintG`/`tintB` + `tintStrength` added to the petal animation state; the petal draw applies a Skia color matrix tint (strength 0.82) when the strength is non-zero
- shake at 11 Hz, amplitude `max(2, diameter * 0.05)`, applied to the orb center position
- total feedback 1000 ms (180 ms ramp up, hold, 180 ms ramp down)
- the letter glyph at the orb center turns `#ff5a5a` while wrong

The existing `wrongTintColor` prop on the letter-orb contract is the only input — the game hook needs no changes.

### Variant picker and insert flight

Picker options render as the same letter-orb petal circles (smaller, same single-ring preset), with the wrong flash reusing the red-tint + shake. The insert flight renders the flying letter as a letter orb along the existing flight geometry from `InsertAnimationState` — no new visual.

### Roamers and escape

The roamer layer runs 21 non-interactive roamers carrying the table's conjugated forms (same word set as the undersea exercise). On sequence-solved, the escape coordinator looks up the roamer by target word, waits 700 ms (same as undersea), then arms the flower-garden exit flight through the solved cell's rose position to the off-screen edge nearest that rose (existing `armRoamerExitFlight` + `resolveRoamerExitLegs` machinery). Requires a controller on the roamer layer exposing `armEscapeByWord(word, waypointX, waypointY): boolean` — the layer currently has none (the table exercise drives escapes inline), and a real `useFlowerGardenRoamerEscapeCoordinator` wrapping a pure coordinator factory mirroring the undersea `createRoamerEscapeCoordinator`.

### Rose table layer

`extraRevealedBodyIndices` is added to the flower-garden table layer props (types + inner component), merged as a union with the layer's internal revealed set — exactly the undersea layer's behavior. The word transformation exercise passes the game's `revealedCellIndices` through it.

### Sounds

All callbacks plumbed through to the existing no-op `createFlowerGardenSoundController`: inflate → `playOrbInflate`, pop → `playOrbPop`, wrong → `playWrongClick`, word-sprite feedback → success/wrong/primary clicks, plus ambient start/stop and mute. Real sound bodies are out of scope.

### What does NOT change

- The `Theme` interface and theme contract (all visuals fit existing slots)
- The word transformation mechanic (`useWordTransformationGame` and domain) — theme-agnostic, unchanged
- The capture orb's own preset (3 rings / 12-12-12 petals / 0.65 diameter) — only the new `ringCount` parameter is added to the shared machinery
- The undersea theme
- The sentence transformation, variant selection, and word-learning exercises

## Testing Decisions

### What makes a good test

Test external behavior, not implementation details. For the orb config work, external behavior is the generated petal/spawn config and the computed animation state given phase, progress, and config. For the escape coordinator, external behavior is: given a solved sequence and a controller state, the right roamer is selected, the delay is scheduled, and the escape is dispatched with the correct target — or nothing happens when no roamer carries the word.

### Test seams

**1. `generateOrbPetalConfigs`** (existing suite — extend)

- `ringCount: 1` produces petals for exactly one ring; `ringCount: 3` (default) unchanged
- ringCount clamped: 0 → 1 ring, 4 → 3 rings
- letter preset produces exactly 7 petals, all on one ring, valid `imageIndex` in [0, 20]
- determinism: same seed + same preset → identical output
- existing invariants (counts, ranges, spacing) still hold for the capture preset

**Prior art**: `generateOrbPetalConfigs.test.ts`, `generateBushConfigs.test.ts` (`buildInput` factory, `createRng` seeded RNG, `JSON.stringify` equality).

**2. Escape coordinator factory** (new pure module mirroring undersea's `createRoamerEscapeCoordinator` — new suite)

- sequence solved with a roamer carrying the target word → capture armed + escape scheduled after the delay
- sequence solved with no matching roamer → no-op
- a second solved sequence cancels the pending escape of the first
- dispatch resolves the exit legs through the cell position (target = solved cell's rose position)
- dispose cancels pending escapes

**Prior art**: `roamerEscapeCoordinator.test.ts` (undersea), `resolveRoamerExitPath.test.ts` (flower-garden legs).

**3. `computeOrbAnimState`** (existing suite — extend)

- tint strength 0 → petals draw untinted (state carries zero strength)
- tint strength 1 → full strength carried through per-petal state
- wrong-tint fields do not disturb existing idle/burst invariants

**Prior art**: `computeOrbAnimState.test.ts`.

### What is NOT tested

- Skia rendering (petal draw, tint color matrix) — heavily mocked, low value (same precedent as the capture-orb PRD)
- The letter-orb components, orb-layer composition, and hook wiring — thin wrappers over the tested pure functions
- The word transformation mechanic — already covered by existing domain tests, unchanged

## Out of Scope

- Real sound assets — the no-op controller bodies are filled in later (`useFlowerGardenThemeSounds.ts`)
- Tutorial flow for this exercise — mirroring undersea, `helpVisible={false}`
- Changes to the word transformation mechanic or store config
- Changes to the capture orb's existing preset values
- The sentence transformation, variant selection, or word-learning exercises
- The undersea theme
- Animation tuning beyond the agreed letter-orb preset numbers
- Accessibility / reduced-motion preferences (follows existing patterns)

## Further Notes

### Glossary

Two CONTEXT.md updates already made during design:
- **Letter orb** — new generic term (single-letter display role in word transformation; undersea realises as bubble, flower-garden as mini petal circle)
- **Exit flight** — extended to cover the word transformation departure (roamer flies through the solved cell's rose and off-screen)

### No ADR

The decisions here are contained within the flower-garden theme and easily reversible — none meet the ADR bar (hard to reverse, surprising, real trade-off).

### Prior art

The capture-orb PRD (`.scratch/capture-orb/PRD.md`) already anticipated letter-mode orbs reusing the petal-ring system; this PRD is that follow-up. The 21 petal images and all orb machinery ship from that effort.
