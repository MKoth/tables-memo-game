Status: ready-for-agent
Parent: .scratch/flower-garden-perf/PRD.md

## What to build

Convert `useOrbAnimation`'s autostart `useFrameCallback` (one always-on frame loop per orb, up to 12+ in a word-transformation exercise) to **declarative `withTiming` animations**, mirroring the undersea `useBubbleAnimation.ts` pattern (which drives bubble motion with `withTiming` and has 0 frame loops).

The orb's idle motion (bobbing, petal ring rotation, any autostart drift) must be expressed as declarative animated values (`withTiming`/`withRepeat` per the existing `orbAnimWorklets`/`orbAnimPresets`) so no per-orb frame callback runs. Interaction-driven motion (tap, capture) may keep imperative logic but must not add always-on loops.

## Acceptance criteria

- [ ] `useOrbAnimation` contains no always-on `useFrameCallback`; all autostart motion is declarative `withTiming`-based.
- [ ] Orb idle motion looks the same as today (speed, amplitude, easing per `orbAnimPresets`).
- [ ] Tap/capture interactions still work with the same timing behavior as today.
- [ ] With N orbs mounted, always-on frame-callback count scales with N no longer (0 frame loops from orbs).
- [ ] `npx tsc --noEmit`, `npm run lint`, `npm test` all pass.

## Blocked by

None — can start immediately.
