Status: ready-for-agent

# Flower-garden theme performance optimisation

## Problem Statement

The undersea theme is noticeably more performant than the flower-garden theme. A four-axis investigation (assets, scenery layers, clock/animation discipline, shaders) found the flower-garden theme burns GPU and JS budget on:

- **5 full-screen shader passes at native resolution** (undersea: 1 pass at 0.85×): `roseShadows` (64-iter loop), `roseSubstrate` (40-iter + texture eval), `grassHoleMask`, `particleDust` (300-iter loop), plus earth/grass image fills.
- **9 `<Canvas>` mounts in scenery** (undersea: 2).
- **Always-on `useFrameCallback` loops** — 4 kinds, some per-element (per orb, per cloud) → up to 12+ in a word-transformation exercise (undersea: 1).
- **Per-frame long-array allocations** — FieldFlower ~210 arrays/frame, ParticleLayer 2400 floats/frame, `pool.value = pool.value.slice()` at 3 sites (undersea: module-level pre-padded constants).
- **142 runtime GPU textures** (undersea: 33); largest is grass-tilable 800×800 (~2.56 MB).
- **8 `ImageShader`s per table cell** in `CellRoseBud` (undersea: 2).
- **All-or-nothing asset loading** — ~28 sequential await barriers (undersea: progressive, ~3 barriers).
- **Up to 128 `sin`/pixel** in the `roseBudDeform` petal loop.

## Solution

14 tracked issues (plus one optional) under `.scratch/flower-garden-perf/issues/` bring flower-garden up to undersea performance parity by transplanting the undersea counter-patterns:

- **Shader merges (no visual loss)**: bounded per-rose shadow rects (undersea `spriteShadow` pattern), earth+grass+mask merged into one background shader, `ringHash` precomputed on CPU, particle dust bounded to roamer rects, field flowers batched per shader call.
- **Clock discipline (JS-thread win)**: idle-pause all always-on loops, convert orb animation to declarative `withTiming`, share one roamer sim loop, stop per-frame pool `slice()`.
- **Image assets**: one texture atlas for cloud+orb petal textures, grass downscale + 0.85× background resolution, progressive loading (~3 barriers).
- **Canvas consolidation**: merge ground-scatter canvases, consolidate shadow+bush canvases → final scenery canvas count ~4.

**Fidelity tolerance (user decision)**: slight softening is acceptable — 0.85× background resolution, reduced particle counts OK; foreground sprites unchanged. Priority areas are all four axes.

Expected cumulative closure: **~80% of the undersea/flower-garden performance gap** at "slight softening" tolerance.

## Sequencing

Shader merges → clock discipline → remaining shader work → canvas/asset structural → softening/loading last. Suggested implementation start set: issues 01, 03, 07, 08, 10 (see issue dependencies).

## Implementation Decisions

### Z-order constraint (rose substrate)

The rose substrate must sit **between** the rose bushes and the rosebud cells. Render order in `FlowerGardenScenery`: SceneryShadowLayer (below bushes) → BushShaderLayer → RoseSubstrateLayer (above bushes, below rosebuds in carrier). The shadow and substrate passes must **not** be merged into one pass — they occupy different z-positions. See issue 01.

### Optional issue 02

Issue 02 (substrate drawn inside carrier cell rects) is tracked but **optional** — it crosses the scenery/carrier seam and can be deferred or skipped without affecting the rest of the plan.

### Testable seams

Config/generator changes (field-flower batching, particle caps, ground-scatter culling, ring-hash precompute) follow the repo's existing `__tests__` pattern for pure-function generators; uniform-building changes are unit-testable the same way the undersea theme tests its pre-padded constants.

## Out of Scope

- Foreground sprite (jellyfish/rose/koi/bee) fidelity changes — sprites stay unchanged.
- Changes to the `Theme` interface or generic core.
- Changes to the undersea theme.
- Rebuilding any flower-garden shader from scratch (all work is merge/bound/precompute).
- New render-level test harnesses or Skia unit tests (visual verification on simulator, matching repo posture).

## Further Notes

- Root-cause research lives in the handoff conversation only; issue bodies reproduce the specifics needed for each issue.
- Verification gates for every issue: `npx tsc --noEmit`, `npm run lint`, `npm test`.
- When implemented, benchmark before/after per issue (FPS on device, canvas count, frame-loop count, texture count) so each issue's delta is provable.
