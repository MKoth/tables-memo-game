Status: ready-for-agent
Parent: .scratch/flower-garden-single-canvas/PRD.md

## What to build

Make the flower-garden word-transformation scene stop re-rendering React during play. The pure-JS word-transformation core state machine and its snapshot are the single source of truth; today every core notify writes the snapshot into React state, re-rendering the whole content subtree on each letter press, wrong flash, insert-phase change, and operation completion. Additionally the variant picker canvas and its orbs mount/unmount for every insert operation (a Skia surface creation on the JS thread), all letter orbs remount on every word transition, and each orb is covered by a Pressable hit-circle.

This slice removes that churn end-to-end: core snapshots flow to the visuals through a scene-state shared value instead of React state; the variant picker and its orb elements stay mounted for the whole exercise (visibility becomes draw-time state); letter orbs are keyed by a stable per-sequence identity so word transitions retarget geometry instead of remounting; all word-transformation taps (word orbs and picker items) are handled by one tap gesture with worklet hit-testing against the orb geometry shared values, preserving the accessibility roles and labels the Pressables provided.

The word-transformation core, the Scenery/table-layer/roamer canvases, and the undersea theme are untouched. Visual output and sounds are pixel-identical to before the change.

## Acceptance criteria

- [ ] No React state update fires on letter press, wrong flash, insert-phase change, or operation completion; core snapshots reach the visuals via a shared value with zero re-renders.
- [ ] The variant picker canvas and orb elements stay mounted across insert operations; no Skia surface is created mid-operation (verifiable on device via absence of mount effects / profiling).
- [ ] Letter orbs do not remount across word transitions; enter/exit cascades run as state-driven phases with stable element identity.
- [ ] All word-transformation taps are resolved by one gesture with worklet hit-testing; accessibility roles/labels are preserved; taps register reliably mid-animation.
- [ ] Visual output and sounds are identical to before the change, at rest and during interaction (simulator comparison).
- [ ] Before/after on-device metrics recorded: JS thread utilisation (RN Performance Monitor), frame rate during an insert operation and a word transition, and per-operation surface creations — this is the checkpoint evidence for the Phase B decision.
- [ ] `npx tsc --noEmit`, `npm run lint`, `npm test` all pass.

## Blocked by

None — can start immediately.
