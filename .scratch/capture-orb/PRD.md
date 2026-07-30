Status: ready-for-agent

# Capture Orb — flower-garden capture enclosure for the table exercise

## Problem Statement

The flower-garden theme has an empty stub (`FlowerGardenMatchRoamerLayer.tsx`) that renders nothing when a roamer is captured in the table exercise. The undersea theme's capture bubble shows the captured creature inside a wobbling deform-shader bubble with an inflate → travel → idle → pop lifecycle. The flower-garden theme needs its own capture visual — a "capture orb" made of three concentric petal rings — to give visual feedback when the learner taps a roamer.

## Solution

Implement a capture orb component tree under the flower-garden theme's existing structure. The orb is composed of 3 invisible concentric rings (inner / middle / outer) at fractional radii of the orb diameter. Each ring holds N petals distributed around its circumference. Each ring rotates independently (configurable angular speed + direction). Each petal self-spins via a thin↔thick UV stretch oscillation (like the butterfly wing shader) and Brownian-drifts radially within its ring's thickness band.

The orb follows the same three-phase lifecycle as the undersea capture bubble (Enter → Idle → Burst), driven by a shared-value animation hook patterned after `useBubbleAnimation`. The captured roamer sits behind all rings, visible through the gaps between petals. No word label on the orb (added in a later iteration).

## User Stories

1. As a learner, I want to see the orb fly in from the roamer's tap position in spiral-in petal clusters, so that the capture feels visually connected to the creature I tapped.
2. As a learner, I want the orb's petals to continuously rotate and shimmer during idle, so that the orb feels alive while I decide my next move.
3. As a learner, I want to see the captured roamer inside the orb through the gaps between petals, so that I can still identify which creature is captured.
4. As a learner, I want the petals to scatter outward and fade when the orb pops (on correct match or release), so that the release moment feels responsive and satisfying.
5. As a learner using the flower-garden theme, I want the orb to be visually distinct from the undersea bubble, so that each theme has its own capture aesthetic consistent with its visual language.
6. As a developer, I want the orb animation state to be computed by a pure worklet function, so that it is testable without React or Skia mocking.
7. As a developer, I want the petal-per-ring configuration (counts, radii, thickness, speeds) to be driven by a config object with defaults, so that I can tune values without touching the rendering code.
8. As a developer, I want the petal image assignment (which of the 21 PNGs each slot gets) to be decided at orb spawn via seeded RNG, so that the orb look is deterministic per session and reproducible in tests.
9. As a developer, I want the orb to share the same `ThemeMatchRoamerLayerProps` interface as the undersea bubble, so that the theme contract does not change and the exercise framework remains theme-agnostic.
10. As a developer, I want the orb to be the same visual component reused for letter transformation orbs (future work), so that the petal-ring system serves both capture and letter modes from a single code path.

## Implementation Decisions

### Architecture

The orb shares the same phase machine as the undersea capture bubble:

```
BubblePhase.None  →  BubblePhase.Enter  →  BubblePhase.Idle  →  BubblePhase.Burst  →  BubblePhase.None
```

Driven by a hook `useOrbAnimation(config, onDismiss, enabled, onBurstCompleteWorklet)` — structurally identical to `useBubbleAnimation` but producing per-ring and per-petal state instead of a single wobbling circle. The hook is a thin React wrapper over a pure worklet compute function.

### Ring geometry

Three rings at fractional radii of the orb radius R = targetDiameter / 2:

| Ring | Radius center | Thickness band | Petal count | Z-order |
|---|---|---|---|---|
| Inner | 0.15R | 0.08R | 18 | Top (draws last) |
| Middle | 0.35R | 0.14R | 24 | Middle |
| Outer | 0.60R | 0.18R | 36 | Bottom (draws first) |

Each ring's thickness defines the radial band a petal can Brownian-drift within. The drift is a per-petal random-walk with a configurable step size, clamped to the band bounds. Ring rotation is a continuous linear angle advance at the ring's configurable angular speed (rad/s), with sign = direction.

### Petal animation

Each petal has three independent motions composited into its final position and visual state:
1. **Ring rotation** — angular offset = `ring.baseAngle + ring.speed * t` (shared across all petals on that ring)
2. **Radial drift** — `radius += brownianStep * cos(perPetalDriftPhase)` clamped to `[ringCenter - thickness/2, ringCenter + thickness/2]`
3. **Self-spin (thin/thick)** — petal width = `baseWidth * (1 - | sin(petal.phase + petal.phaseSpeed * t) | * stretchGain)` — identical UV stretch pattern to the butterfly wing (`contract = 1 - abs(flap) * WING_STRETCH_GAIN`)

Petal displayed width = `2π * ringRadius / petalCount * widthFraction`, where `widthFraction` is a configurable fraction of the circumferential span. Smaller on inner rings, larger on outer.

### Enter animation

When the roamer is tapped, all 3 rings' petals fly in from the tap point as spiral-in clusters. Each petal's position is interpolated between:
- **Start**: petal offset from tap origin with random initial angle (each petal spreads slightly from the origin)
- **End**: petal's ring-assigned orbital position (radius × ring center + angular offset on ring)

The interpolation uses a spiral curve instead of a straight line: `progress` goes 0→1 over `ORB_ENTER_DURATION_MS` (configurable, default 500ms), and petal position is `lerp(start, end, progress)` with a perpendicular offset `sin(progress * π) * spiralAmplitude` applied perpendicular to the start→end direction, forming an S-curve for each petal. Cluster formation means all petals of a ring arrive simultaneously — they maintain their formation offset relative to the group center.

### Burst animation

On burst, each petal computes an outward scatter vector: the vector from the orb center to the petal's current idle position, with random angular jitter (configurable cone angle, default ±30°), and a random speed multiplier (configurable range). Petal position is `idlePos + scatterVector * (burstProgress ^ 0.7) * burstDistance`. Petal opacity ramps from 1 to 0 over `burstProgress` 0.5→1.0. Total burst duration configurable, default 400ms.

### Petal image assignment

At orb spawn, a seeded RNG assigns each petal slot one of the 21 `orb/pettel*.png` images. Random pick with replacement. The assignment is one-time for the orb's lifetime (fixed look until burst). Uses the same `createRng(seed)` pattern as `generateBushConfigs`.

### Roamer rendering inside the orb

The captured roamer is rendered by the existing roamer drawing infrastructure (ButterflyInstance / BeeInstance / BumblebeeInstance) inside a Skia `Group` behind all petal rings. The roamer sits at the orb center position, at its normal size scaled by a configurable factor (default 1.22×, matching the undersea bubble's fish scale). The roamer's shadow offset is proportionally scaled by the same factor.

### Reuse for letter transformation orbs

The petal-ring system is designed to work in two modes:
- **Capture mode** (this PRD): roamer inside, no label
- **Letter mode** (future): a letter glyph at center instead of roamer

The `useOrbAnimation` hook and rendering component accept an optional `centerContent` ReactNode slot — when `null` (capture mode), nothing renders there; when a text glyph is provided (letter mode), it renders at center.

### Orb diameter

Default orb diameter = `min(roamerZoneW, roamerZoneH) * 0.65` (matching `BUBBLE_DIAMETER_RATIO`). Configurable via the same `orbTarget.diameter` override on `ThemeRoamerMotionZoneProps`.

### Modules to build

Under `components/exercises/themes/flower-garden/exercises/wordLearning/translationMatch/components/`:

- **`CaptureOrb.tsx`** — Top-level comp. Accepts `ThemeMatchRoamerLayerProps`. Conditionally renders the orb (when a selection exists) or nothing. Composes the roamer canvas + the petal ring layers.

New directory `components/exercises/themes/flower-garden/orb/`:

- **`orbAnimTypes.ts`** — `OrbPhase` (inherits BubblePhase), `PetalRingConfig` (radius, thickness, petalCount, rotationSpeed, direction), `PetalAnimState` (x, y, angle, scaleX, opacity, imageIndex), `OrbAnimState` (petals[]), `OrbAnimationConfig` (origin, targetCenter, targetDiameter, rings[]), `PetalSpawnConfig` (per-petal: imageIndex, ringIndex, initialAngle, phaseSpeed, brownianStep)

- **`orbAnimPresets.ts`** — Default ring configs (center radii, thicknesses, petal counts, rotation speeds), enter/burst durations, drift parameters, stretch gain

- **`orbAnimWorklets.ts`** — `computeOrbAnimState(phase, enterProgress, burstProgress, config, petalSpawns)` → `OrbAnimState`. Pure worklet function.

- **`useOrbAnimation.ts`** — Hook wrapping `useBubbleAnimation`'s phase machine but calling `computeOrbAnimState` instead of `computeBubbleAnimState`. Returns per-petal shared values for the rendering layer.

- **`PetalRingLayer.tsx`** — Skia `Canvas` child that renders one ring's petals: for each petal, draws the petal image at its computed position with its current scale/opacity.

- **`generateOrbPetalConfigs.ts`** — `generateOrbPetalConfigs(input: OrbConfigInput, rng: SeededRng)` → `PetalSpawnConfig[]`. Pure function.

### Modules to modify

- **`FlowerGardenMatchRoamerLayer.tsx`** — Replace empty `<View>` with the capture orb composition
- **`flowerGardenThemeAssets.ts`** — Add `ORB_PETAL_SOURCES` (21 imports) and `orbPetalImages` to `FlowerGardenThemeImages`
- **`useFlowerGardenThemeAssets.ts`** — Load the 21 orb petal images as `SkImage[]`
- **`FlowerGardenMatchRoamerLayer.tsx`** — Wired into the existing capture flow (sessionController, triggerEscapeRef, keepOutDiskSv)

### What does NOT change

- The `Theme` interface — `ThemeMatchRoamerLayerProps` stays the same
- The match exercise lifecycle (`MatchSessionController` state machine)
- The gesture handling (`useFlowerGardenCombinedMatchGestures`)
- The keep-out disk logic (it's in the WordSprite roaming, not the roamer layer)
- The escape flow (the roamer escape after burst follows the same path)

## Testing Decisions

### What makes a good test

Test external behavior, not implementation details. For the capture orb, the "external behavior" is the computed animation state: given a phase, progress, and config, the orb should produce deterministic petal positions, scales, and opacities conforming to the geometric invariants of the ring model.

### Test seams

Two pure-function test suites, following existing patterns:

**1. `computeOrbAnimState`** (counterpart of undersea's `computeBubbleAnimState`, which currently has no tests — we test this one from the start)

Tests:
- Phase `None` returns all-zero state
- Phase `Enter` at t=0: petals at origin (spiral-in start position), diameter at minimum
- Phase `Enter` at t=1: petals at their ring positions, full diameter, full opacity
- Phase `Enter` intermediate t values: petals follow spiral path (not straight-line)
- Phase `Idle`: petals at correct ring radii within thickness tolerances
- Phase `Idle` ring rotation: petal angles advance linearly with ring speed
- Phase `Idle` radial drift: petal radii stay within ring band bounds over many frames
- Phase `Idle` petal self-spin: scaleX oscillates between thin and thick per phase
- Phase `Burst` at t=0: petals at idle positions
- Phase `Burst` at t=1: petals beyond orb radius, opacity at 0
- Phase `Burst` scatter vectors are outward (dot product with radial direction > 0)
- Determinism: same config + same progress → identical output
- Ring rotation: inner and middle rotate in opposite directions, inner at different speed

**Prior art**: `stepFlightStateMachine.test.ts`, `pickRoamerDrawPass.test.ts` — pure function, no mocking.

**2. `generateOrbPetalConfigs`** (counterpart of `generateBushConfigs`, which has 16 tests)

Tests:
- Total petal count equals sum of per-ring counts (18+24+36=78)
- Each petal has valid `imageIndex` in [0, 20]
- Each petal has valid `ringIndex` in [0, 2] matching the count distribution
- Per-ring initial angles are evenly spaced around the circle (spacing = 2π / ringCount ± tolerance)
- Determinism: same seed → identical JSON
- Different seed → different but still valid assignment
- `phaseSpeed` values fall within the configured min/max range
- `brownianStep` values fall within the configured min/max range

**Prior art**: `generateBushConfigs.test.ts` — `buildInput(overrides)` factory, `createRng(seed)` seeded RNG, collect helpers, `JSON.stringify` equality.

### What is NOT tested

- Rendering (Skia Canvas) — heavily mocked, low value
- Hook integration (`useOrbAnimation`) — covered indirectly by the pure function tests; the hook is a thin wrapper
- Gestures — unchanged, already tested through the match exercise

## Out of Scope

- Word labels on the orb (added in a later iteration)
- The keep-out disk logic (already exists in WordSprite roaming)
- Letter transformation orbs (separate stubs, future work)
- Sound assets for orb enter/pop (uses `playOrbInflate` / `playOrbPop` from the existing `ThemeSoundController`)
- The translation match exercise (match lifecycle is unchanged; this PRD only touches the roamer capture layer)
- The decorative roamer layer (unchanged)
- The sentence transformation or variant selection exercises (unchanged)
- Migration of the undersea theme (unchanged)
- Animation config presets beyond sensible defaults (tuning deferred to visual QA)
- Accessibility / reduced-motion preferences (follows existing patterns if any)

## Further Notes

### Assets

There are 21 petal images at `assets/images/flower_garden_theme/orb/pettel1-21.png` that are not yet referenced in the asset manifest. The filenames contain a typo ("pettel" instead of "petal") — it is acceptable to keep the filenames as-is and correct the spelling in code exports only, or to rename the files. The code exports should use the correct spelling (`ORB_PETAL_{I}_SOURCE`).

### Sounds

The `ThemeSoundController` already has `playOrbInflate()` and `playOrbPop()` methods. The flower-garden theme's sound controller (`createFlowerGardenSoundController`) currently returns no-op stubs. If sounds are desired, they should be added via a separate effort — this PRD uses the existing sound contract without changes.

### ADR 0006

The architectural decision for the three-ring concentric petal model is documented in `docs/adr/0006-flower-garden-capture-orb-architecture.md`.
