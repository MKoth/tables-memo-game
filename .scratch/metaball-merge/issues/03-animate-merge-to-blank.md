Status: ready-for-agent

## What to build

Connect the merged blob to the existing resolution animation: drive the shared merge progress until the shader completes, trigger `handleMergeComplete`, then reuse `computeRoundResolutionFlight` and `TransformationRoundResolutionBubble` so the shader-engulfed word flies to the blank slot, plays the current pop sound, and stays through the normal round hold before the row exits.

## Acceptance criteria

- [ ] The merge completion callback fires once the shader reaches its threshold, so the existing round controller transitions into resolve without new hooks.
- [ ] The shader’s merged bubble follows the same flight path as the current resolution bubble and lands in the blank slot to match the round hold duration.
- [ ] After the flight and pop, the solved bubble remains surrounded by the jellyfish row until the row exits, matching today’s audio/visual cues.

## Blocked by

- [.scratch/metaball-merge/issues/02-metaball-shader.md](02-metaball-shader.md)
