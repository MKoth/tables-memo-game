Status: ready-for-agent

# Single dynamic actors canvas for the flower-garden word transformation scene

## Problem Statement

The flower-garden word-transformation exercise feels buggy and consumes too many resources. When letter orbs move — during insert operations, variant dismissals, and word transitions — the motion stutters or starts late, and the scene burns JS frames continuously.

Investigation of the flower-garden word-transformation scene found the causes:

- **10 stacked full-screen Skia canvases** in one scene (background, ground scatter, bush, field flowers, table layer, particles, roamer layer, word orbs, insert flight, variant picker).
- **A React re-render on every core notify.** The word-transformation core state machine is pure JS with timers; every letter press, wrong flash, insert phase, and operation completion writes its snapshot into React state, re-rendering the whole content subtree.
- **Variant picker surface churn.** The variant picker canvas and its orbs mount and unmount for every insert operation; each mount creates a Skia surface on the JS thread — the same "JS thread saturation" the recent insert-flight fixes were patching around.
- **Letter orbs remount on every word transition.** A new sequence key unmounts all orbs and re-mounts them with staggered cascades.
- **A Pressable hit-circle overlay per orb** (10–14 per scene), each dispatching through the React event system.
- **~180 reanimated shared values** for 10–14 letter orbs (18 shared values + 5 derived values per orb), each orb running its own reaction pipeline.

The core state machine and its tests are healthy; the waste is in the theme's visual layer: per-element React reconciliation, per-operation mount/unmount, and per-orb animation plumbing.

## Solution

Deliver the flower-garden word-transformation scene as **one dynamic actors canvas** driven by a single scene-state shared value, with the static Scenery left in its own canvases. Taps are hit-tested in worklets; letter orbs, variant picker items, and the insert flight are pure data in the scene state, never React elements that mount and unmount.

Delivered in two phases:

**Phase A — remove the React churn (surgical).** Stop syncing core snapshots to React state; write them into a scene-state shared value instead. Keep the variant picker permanently mounted (visibility becomes draw-time state). Reuse letter-orb elements across word transitions with stable keys. Replace the per-orb Pressable overlays with one tap gesture + worklet hit-testing. No canvas consolidation yet; visuals are pixel-identical.

**Phase B — single dynamic actors canvas.** Replace the three orb-related canvases (word orbs, insert flight, variant picker) with one actors canvas. All poses are computed per frame from the scene-state shared value by a single derived value reading one quantized clock. Orb pose math (`computeOrbAnimState` and its worklet helpers) is reused unchanged. Enter/exit cascades and insert flights become time-based fields in the scene state instead of component mounts. Delete the per-layer orb components and their per-orb animation plumbing (~180 shared values collapse into one scene graph).

The dynamic actors canvas renders over the existing Scenery, table-layer, and roamer canvases at the same z-position the orb layer occupies today.

**Fidelity: no visual change.** Letters stay Skia `Glyphs` inside the actors canvas (text rasterization is cached and GPU-composited; rendering text *inside a shader* would require a hand-rolled glyph-atlas font sampler and is explicitly rejected). Orb appearance, idle motion, wrong feedback, cascades, insert flights, and sounds behave exactly as today.

## User Stories

1. As a learner, I want letter orbs to move smoothly during insert operations, so that the exercise feels responsive.
2. As a learner, I want the variant picker to appear instantly for every insert operation, so that the game never pauses to build the picker.
3. As a learner, I want wrong-letter feedback (red tint and shake) to start immediately when I tap a wrong letter, so that my mistake is unmistakable.
4. As a learner, I want the insert flight to animate without stutter when the pick commit happens, so that the letter visibly travels to its slot.
5. As a learner, I want word transitions (solve → next word) to flow without flicker or blank frames, so that the cascade reads as one continuous animation.
6. As a learner, I want my taps on letter orbs and picker items to register reliably even mid-animation, so that I never feel ignored.
7. As a learner, I want pop, inflate, and wrong sounds to play at the same moments as today, so that audio feedback is preserved.
8. As a learner, I want the scene to render identically to today at rest, so that nothing about the flower-garden look changes.
9. As a learner, I want the exercise to stay responsive on a low-end device, so that the game is playable on the hardware I own.
10. As a learner, I want the scene to remain responsive during an orientation change, so that reflow does not stutter the animation.
11. As a developer, I want zero React re-renders during a letter press, so that the JS thread stays free for the state machine and sounds.
12. As a developer, I want the variant picker canvas to never mount or unmount during play, so that no Skia surface is created mid-operation.
13. As a developer, I want letter orbs to never remount across word transitions, so that sequence changes are pure state changes.
14. As a developer, I want all scene taps hit-tested in worklets against scene state, so that no React view overlay is needed for input.
15. As a developer, I want the word-transformation core state machine untouched, so that its tests remain valid regression protection.
16. As a developer, I want orb pose math reused unchanged, so that the animation behavior is provably identical.
17. As a developer, I want the scene-state derivation (core snapshot → scene state) to be a pure function, so that it is unit-testable like the rest of the domain.
18. As a developer, I want the theme's word-transformation contract to be a single scene visual, so that the dead per-layer letter-orb contract can be deleted.
19. As a developer, I want the scene to use one quantized clock and one draw pass for actors, so that redraw frequency is uniform and predictable.
20. As a developer, I want the exit-flight (sequence solved) flow to keep working unchanged, so that roamers still depart through the matched cell.
21. As a developer, I want the scenery, table-layer, and roamer canvases left as-is, so that this work stays scoped to the word-transformation scene.
22. As a developer, I want a checkpoint after Phase A that measures whether Phase B is still needed, so that effort is spent where the measured win is.
23. As a maintainer, I want the conformance test extended to the new scene visual, so that the theme contract stays machine-checked.
24. As a maintainer, I want `tsc`, lint, and the Jest suite green after each phase, so that regressions surface early.
25. As a maintainer, I want on-device metrics (JS thread %, frame rate, surface creations) recorded before and after each phase, so that the improvement is provable.

## Implementation Decisions

### Phase A — remove the React churn

- **Core snapshot sync becomes shared-value writes.** The core bridge writes the snapshot into a scene-state shared value on every `onStateChange` instead of setting React state. The core runs on the JS thread and its timers already drive the state machine, so `.value =` writes add no re-render and no bridge thread hop. React state survives only for things React truly needs (instruction text, tutorial gating).
- **Variant picker stays mounted.** The picker's canvas and orb elements mount once per exercise and stay mounted; visibility is a draw-time filter in the scene state. Picker item geometry shared values are keyed by item id and reused across insert operations, as today.
- **Letter orbs are stable across word transitions.** Orb elements are keyed by a per-sequence stable identity, not the order position; a word transition retargets the geometry shared values and drives the enter cascade through scene state instead of remounting with new keys.
- **One tap gesture replaces Pressable overlays.** A single tap gesture covers the word-transformation zone; a worklet hit-tests tap points against the letter-orb and picker-item geometry shared values (circle-distance, proven by the existing table-layer and roamer tap hit-tests) and dispatches presses via the established JS-scheduling pattern. Accessibility roles/labels of the removed Pressables are preserved through the gesture layer's accessible elements.

### Phase B — single dynamic actors canvas

- **Scene architecture.** The theme gains a scene module for the word-transformation mechanic: actor descriptor types (word letter orbs, picker items, insert flight orb), a scene-state shared value holding the current actor list with positions, statuses, and phase timings, and a single actor renderer that maps scene state to Skia draw calls inside one canvas.
- **One clock, one draw pass.** The actors canvas reads the existing quantized scene clock; a single derived value computes all actor poses each tick (using the reused `computeOrbAnimState` worklet math) so the canvas redraws once per tick for all actors.
- **Cascades and flights are scene state.** Enter/exit cascades and insert flights are time-based fields on the scene state (progress, delays, targets) animated on the UI thread; no component mount/unmount participates.
- **Sound triggers** fire through the established UI-thread-to-JS scheduling pattern at the same moments as today (enter, pop, wrong, inflate).
- **Contract replacement.** The theme's dead word-transformation visual contract (word orbs / insert flight / variant picker / letter orb entries) is replaced by a single scene visual receiving the scene-state shared value and the press callbacks. The theme bundle and the conformance test are updated; the old per-layer components are deleted.
- **Letters remain Glyphs**, not shader-rendered text (see Solution — the shader-text route is rejected: SKSL fragment shaders cannot render text without a glyph-atlas texture plus manual metrics/kerning, at worse quality for no measurable gain).
- **Scenery, table-layer, and roamer canvases stay separate** (their redraw frequencies differ; a fully merged single canvas would redraw static content every frame at the actors' clock rate — a net GPU loss).

### Sequencing

Phase A is a prerequisite and a checkpoint: if on-device measurement after A shows the JS thread is idle during play and the perceived jank is gone, Phase B may be deferred or cancelled. Phase B is the architectural payoff (structural leanness) and can land without A only if A's shared-value sync and hit-testing are already in place — they are building blocks of B.

## Testing Decisions

A good test for this work asserts **external behavior**: given a snapshot of the word-transformation core, the scene state derivation produces the expected actor list (which letters, pickers, flights exist; their statuses and phase timings); given a tap point and scene state, the hit-test resolves the expected actor. Tests do not touch React reconciliation, canvas draw order, or per-element mounting — those are covered by visual verification and on-device metrics.

- **Seam 1 (primary): the word-transformation scene composition.** Extended conformance coverage for the new scene visual contract (same shape as the existing theme-contract conformance test) plus on-simulator visual verification against the pre-change build (resting pose, wrong feedback, insert operation, word transition, orientation reflow). This matches repo posture: no render-level test harness is introduced.
- **Seam 2: scene-state derivation (core snapshot → actor scene state).** Pure-function unit tests in the style of the existing word-transformation core and letter-cascade tests.
- **Seam 3: hit-testing worklet math.** Unit tests in the style of the existing orb animation-state tests.
- **Seam 4: pose computation.** `computeOrbAnimState` and its worklet helpers are reused unchanged; their existing tests carry over and require no new coverage.
- **Regression protection:** the word-transformation core state machine is untouched; its existing test suite runs unmodified in every verification gate.

On-device verification per phase: JS thread utilisation (RN Performance Monitor), frame rate during an insert operation and a word transition, and a check that no surface creation happens mid-operation (Phase A) and that actor count in the scene state matches expected orbs (Phase B).

## Out of Scope

- The undersea theme and all other flower-garden exercises (table transformation, sentence transformation, variant selection, word learning).
- The Scenery, table-layer (WordSprite) and roamer canvases, the roamer simulation, and the particle layer.
- The word-transformation core state machine and its domain logic.
- Rendering text inside shaders (rejected; letters remain Skia Glyphs).
- New render-level test harnesses or Skia unit tests (visual verification on simulator, matching repo posture).
- Changes to the generic exercise core beyond the shared-value sync in the core bridge.

## Further Notes

- This work is a continuation of `.scratch/flower-garden-perf/` (issue 08 replaced per-orb frame callbacks with declarative animations; issue 15 consolidated scenery canvases). The scene consolidation here is the word-transformation complement to that effort.
- The word-transformation visual contract being replaced is dead code today — nothing outside the theme consumes it — so the contract change is low-risk and ADR-0003 (theme-agnostic exercise architecture) is respected: the scene visual stays inside the theme; the generic framework only gains the shared-value sync.
- ADR-0001 (shared word-transformation core) is respected: the core is untouched and remains the single source of truth for exercise state.
- Dev verification entry: the exercise dev switch. Verification gates for every change: `npx tsc --noEmit`, `npm run lint`, `npm test`.
- When Phase A lands, record before/after metrics (JS thread %, frame rate, per-operation surface creations) so the checkpoint decision for Phase B is evidence-based.
