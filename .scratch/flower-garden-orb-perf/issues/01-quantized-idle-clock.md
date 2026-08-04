Status: ready-for-agent
Parent: .scratch/flower-garden-orb-perf/PRD.md

## What to build

Quantize the orb idle clock. Today every orb drives its idle motion (petal ring rotation, idle drift) from a per-orb `withTiming` animation spanning `MAX_SAFE_INTEGER` milliseconds, which re-evaluates the orb animation state and every dependent petal/cloud/label derived value at 60fps forever, even while idle.

Change the orb animation core so idle motion steps at 30fps from the shared exercise clock instead. The orb animation hook accepts an optional idle clock shared value (wired to the existing exercise clock quantized to 30fps); the animation state computation reads the clock value for idle positioning when provided, and keeps the continuous-timing path as a fallback for consumers that pass no clock. Wire the clock from all three consumers: letter orbs (word transformation), capture orb (table exercise), and match capture orbs (translation match).

Enter, burst, and move tweens keep their existing 60fps `withTiming` drivers — only the idle drift clock is quantized. Petal ring rotation speeds are 0.14–0.32 rad/s, so 30fps stepping is visually indistinguishable.

## Acceptance criteria

- [ ] The orb animation hook accepts an optional idle clock and the animation state computation uses it when provided; the `withTiming` path remains for consumers without a clock.
- [ ] All three consumers (letter orbs, table capture orb, match capture orbs) pass the quantized exercise clock.
- [ ] Idle petal ring rotation and cloud motion look identical (no visible stepping or jerking).
- [ ] Enter, burst, and move tweens run at full frame rate and keep their current timing/easing.
- [ ] Idle JS/UI FPS in a word-transformation exercise improves measurably (Dev-menu FPS monitor before/after).
- [ ] `npx tsc --noEmit`, `npm run lint`, `npm test` all pass (existing orb animation state and hook tests updated for the clock input).

## Blocked by

None — can start immediately.
