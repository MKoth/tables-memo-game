Status: ready-for-agent
Parent: .scratch/flower-garden-perf/PRD.md

## What to build

Pause the always-on animation loops when the exercise is idle: the FieldFlower 20 Hz clock (`useExerciseClockQuantized(20)`), the orb/cloud loops, and the particle loop currently run every frame regardless of activity.

Follow the undersea self-pause pattern (`useWordSpriteMotionLoop` calls `motionFrameLoopRef.current.setActive(true/false)`; `useSimFrameLoop` gates on `AppState`): gate `autostart=false` on the exercise's active state via `useExerciseRuntime`, and pause/resume the frame callbacks (`frameCallback.setActive(false)`) when the exercise is idle, backgrounded, or waiting on user input. Resume on the same signals the undersea loops use (activity engagement, drag start, roamer interaction, AppState foreground).

## Acceptance criteria

- [ ] FieldFlower 20 Hz clock, orb/cloud frame loops, and particle frame loop are paused when the exercise is idle (no drag, no motion loop, no active interaction) and resumed when activity starts.
- [ ] Pausing is non-janky: no visible freeze or jump on resume (frame timestamps reset on resume, mirroring the existing `lastTimestamp = -1` reset).
- [ ] AppState backgrounding also pauses all loops (matches `useParticleFrameLoop` and `useSimFrameLoop` behavior today).
- [ ] With a word-transformation exercise idle, the always-on frame-callback count drops to the minimum required (target: ~0 while idle).
- [ ] `npx tsc --noEmit`, `npm run lint`, `npm test` all pass.

## Blocked by

None — can start immediately.
