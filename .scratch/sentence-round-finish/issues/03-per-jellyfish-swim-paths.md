Status: ready-for-agent

# Per-jellyfish swim-path entrance/exit with tilt

## Parent

[.scratch/sentence-round-finish/PRD.md](../PRD.md)

## What to build

Replace the shared-row `exitEdge` slide with per-jellyfish round entrance and row exit: a pure swim-path planner assigns each sentence-row jellyfish (including the blank) a linear offscreen→slot path, remembered for the round; exit reverses that path.

Allowed spawn edges are orientation-gated (portrait: top/left/right; landscape: top/bottom/right). Spawn points are assigned in sentence-token order so trajectories do not cross. All participants start together, share one enter/exit duration, and the phase completes when the last arrives/leaves. While swimming, jellyfish tilt toward travel; idle stays upright. Mid-round orientation change may reflow resting positions but does not replan remembered paths until the next round. First round of a session uses the same swim-in.

## Acceptance criteria

- [ ] Pure swim-path planner seam exists and is covered by tests (edge gates, token-order non-crossing, shared-duration model)
- [ ] Portrait spawn edges are only top/left/right; landscape only top/bottom/right
- [ ] Each slot including the blank gets a remembered path; row exit reverses those paths for remaining token jellyfish
- [ ] Enter/exit: all start together, shared duration, complete when the last arrives/leaves
- [ ] Shared-row `exitEdge` slide is no longer the entrance/exit driver for the sentence row
- [ ] Jellyfish tilt toward travel only while swimming; idle upright
- [ ] Mid-round orientation change keeps this round’s paths; next round replans for the new orientation
- [ ] First round of a session uses the same per-jellyfish swim-in as later rounds

## Blocked by

- [01-varied-token-sizes-blank-footprint](./01-varied-token-sizes-blank-footprint.md)
