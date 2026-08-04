Status: ready-for-agent

# Flower-garden orb movement performance

## Problem Statement

In the flower-garden theme, whenever an orb moves from place to place — petals growing and spiralling into position (capture-orb assemble), cloud patches spawning around a moving orb, letter orbs re-layouting and flying during word-transformation inserts — both UI and JS frames drop significantly. The drop is worst in the word-transformation exercise. Movement spikes land on top of a high ambient per-frame cost: every orb runs continuous 60fps work even when idle.

## Solution

Orb movement becomes cheap enough that moving orbs stop tanking frames, and steady-state idle cost drops so there is headroom left over during spikes. Concretely:

- Idle orb motion (petal ring rotation, cloud patches) steps at 30fps from the shared exercise clock instead of a per-orb 60fps `withTiming` clock — identical visuals at half the work, permanently.
- Each petal and cloud patch draws from one consolidated per-element derived value instead of five or six — roughly a 4× cut in per-frame worklet evaluations and UI-thread allocations.
- The wrong-feedback tint moves from one GPU `ColorMatrix` pass per petal to one per ring, mounted only while wrong feedback is active — tens of shader passes per frame disappear.
- All orb cloud pools share a single stepping loop with in-place mutation instead of one frame callback per orb plus per-frame array copies.
- The three word-transformation canvases merge into one canvas sized to its content; the capture-orb canvas shrinks to the orb's bounding box — pixels redrawn per move-frame drop several-fold.
- Each user press triggers one React render instead of several (batched store updates, memoized table layer).

Expected outcome: 60fps UI/JS at idle and visibly improved (target: no long spikes) frames during orb movements in word transformation, table, and translation-match exercises, with no visible change to animation look, timing, or easing.

## User Stories

1. As a player, I want letter orbs in the word-transformation exercise to move from the variant picker to the word row without dropping frames, so that the exercise feels smooth.
2. As a player, I want the word-row letter orbs to re-layout (shuffle to make room) when a new letter lands without visible stutter, so that the exercise feels responsive.
3. As a player, I want the capture orb's petals to assemble from the spawn point with the same spiral motion as today, so that the visual stays unchanged.
4. As a player, I want the petal burst on a wrong answer to keep the same speed and scatter, so that feedback stays legible.
5. As a player, I want the cloud patches around moving orbs to keep their current look (size, opacity, lifetime, fade), so that the effect is unchanged.
6. As a player, I want wrong-answer feedback to still tint all petals red with the same shake, so that feedback stays legible.
7. As a player, I want petal rings to keep rotating during idle with no visible stepping or jerking, so that the scene stays alive.
8. As a player, I want the undersea theme untouched by this work, so that nothing I already enjoy regresses.
9. As a developer, I want the orb core (animation state, cloud pool) to stay theme-agnostic, so that future themes reuse it.
10. As a developer, I want the idle animation cost to be independent of exercise activity, so that steady-state FPS stays high even when many orbs are mounted.
11. As a developer, I want one cloud stepping loop shared across all orbs rather than one per orb, so that orb count no longer multiplies frame-callback count.
12. As a developer, I want per-frame allocations removed from the orb/cloud hot paths, so that GC pressure does not cause jank.
13. As a developer, I want a word-transformation insert press to batch its state updates, so that the JS thread does one render per press rather than several.
14. As a developer, I want the table layer to not re-render whole-rose markup when only a highlight changes, so that JS work during inserts stays minimal.
15. As a developer, I want the existing orb-core pure-function test seams to cover the new logic, so that the refactor is verified without render-level harnesses.
16. As a developer, I want the move/enter/burst tweens to keep running at full frame rate, so that motion quality is untouched — only idle rate is reduced.

## Implementation Decisions

### 1. Quantized idle clock (orb core)

`useOrbAnimation` gains an optional idle-clock input (a `SharedValue<number>`), wired to the existing shared exercise clock quantized to 30fps (`useExerciseClockQuantized`). When provided, `computeOrbAnimState` reads the idle position/rotation from that clock instead of the current continuous `withTiming` over `MAX_SAFE_INTEGER`; the `withTiming` path remains as a fallback for consumers that pass no clock. Petal ring rotation speeds are 0.14–0.32 rad/s, so 30fps stepping is visually indistinguishable. Enter, burst, and move tweens keep their existing 60fps `withTiming` drivers — the quantized clock only replaces the idle drift clock.

### 2. Consolidated per-element derived values (orb core)

Each petal currently evaluates five derived values per frame (transform, opacity, tint matrix, plus the sprite transform and clip rect). Each cloud patch evaluates six. Consolidate:

- `AtlasSprite` accepts static sizes as plain numbers; when sizes are static (petals — size never changes), transform and clip rect are computed once at mount instead of per frame. Dynamic sizes (cloud patches — size fades in/out) keep derived values.
- Each petal evaluates exactly one derived value returning a draw bundle (transform + opacity + tint strength), and each cloud patch one derived value returning its draw bundle (transform + opacity + size + region index).
- Region lookup resolves from the static regions array inside the bundle — no separate derived value for region.

### 3. Ring-level wrong-feedback tint (orb core + flower theme)

The tint matrix is identical for every petal in a frame (uniform tint strength and tint color from `OrbAnimState`). Replace per-petal `ColorMatrix` nodes with one `ColorMatrix` per petal-ring group, mounted only while tint strength is above zero. Visual result is identical (the same matrix applied to the whole ring). This removes 7–36 GPU shader passes per orb per frame.

### 4. Shared cloud pool loop with in-place mutation (orb core)

Replace the per-orb `useFrameCallback` in the orb cloud layer with a single pool manager: one frame callback steps every registered orb's cloud pool in a single pass, at the shared clock rate (~20–30fps; cloud fades are 450–1200ms, so the lower rate is invisible). Pools mutate in place; a version shared value bumps each step so `CloudPatch` derived values re-evaluate without per-frame array copies. Re-slicing happens only when pool membership changes (spawn/despawn), not per frame.

### 5. Canvas consolidation and content-rect sizing (flower theme)

- Word transformation: the three full-screen canvases (word orbs, insert flight, variant picker) merge into one canvas hosted by the transformation orb layer, sized to the union of its content rects (word row + variant row + flight corridor, roughly 60–70% of screen). Pressable hit views stay as plain React Native views, unchanged.
- Capture orb (table + translation-match): the capture canvas shrinks from full screen to the orb's bounding box (center ± ~1.5× diameter, covering idle petal radius plus burst scatter distance).
- Skia canvases redraw fully when any animated value inside them changes, so redraw area is directly proportional to canvas size — this is the primary move-frame win.

### 6. JS re-render reduction (word transformation)

- Inspect and batch the sequential zustand updates fired per insert press (letters, insert animation, picker items, highlight indices) so each press causes one React render.
- Memoize the table layer (and per-cell markup) so highlight/reveal changes do not re-render the whole table.

### Relationship to the existing perf effort

`.scratch/flower-garden-perf/` tracks broader theme-parity work with overlapping issues (07 clock-idle-pause, 08 orb-declarative-animation, 10 in-place-pool-mutation). This PRD is the focused orb-movement pipeline refactor and supersedes those three orb-specific items for the orb core; scenery-side items there stay as-is. This PRD's decisions are the authority for the orb layer.

## Testing Decisions

- Good tests exercise external behavior of pure functions: given (phase, progress, clock value) inputs, the animation state contains the expected petal positions/opacities; given a pool and elapsed time, stepping mutates the expected slots and bumps the version. No implementation-detail assertions (no mock of reanimated internals beyond what the existing tests already do).
- Primary seams (all existing, orb core):
  - Pure animation state computation — the module that `computeOrbAnimState` lives in, extended with the quantized-clock input (prior art: `computeOrbAnimState.test.ts`).
  - Cloud pool stepping/stagger worklets — in-place mutation and version behavior (prior art: `orbCloudWorklets.test.ts`).
  - Orb animation hook — idle-clock wiring, enter/burst behavior unchanged (prior art: `useOrbAnimation.test.tsx`).
- Canvas consolidation and content-rect sizing have no unit-test seam: verified visually on the iOS simulator with the Dev-menu FPS monitor, matching the repo posture (no render-level/Skia test harnesses; the existing perf PRD excludes them too).
- Verification gates for all work: `npx tsc --noEmit`, `npm run lint`, `npm test`.
- Perf verification: Dev-menu JS/UI FPS before/after in word transformation — idle (target steady 60/60), insert press + flight (320ms), picker pop/burst; plus table-exercise capture-orb assemble/burst.

## Out of Scope

- The undersea theme (uses its own bubble system, untouched).
- Scenery-side performance work (shader merges, asset loading) — already tracked in `.scratch/flower-garden-perf/`.
- Changes to animation look, timing, easing, or petal/cloud fidelity.
- Changes to move/enter/burst tween frame rates (only idle rate is quantized).
- New render-level test harnesses or Skia unit tests.
- Changes to the `Theme` interface or generic exercise core.

## Further Notes

- The orb core (`PetalRingLayer`, `CloudPatch`, `AtlasSprite`, orb animation state, cloud pool worklets) is already theme-agnostic in design (receives atlas/regions as props) and stays so — the gains land automatically in all three consuming exercises (table, word transformation, translation match).
- Fidelity tolerance: none required — all decisions are designed to be visually indistinguishable; any visible change should be treated as a defect.
- Suggested implementation order: quantized idle clock → derived-value consolidation → ColorMatrix hoist → shared cloud loop → JS batching → canvas consolidation.
