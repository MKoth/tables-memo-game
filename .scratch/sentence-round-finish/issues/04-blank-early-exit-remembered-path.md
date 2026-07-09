Status: ready-for-agent

# Blank early exit on remembered path

## Parent

[.scratch/sentence-round-finish/PRD.md](../PRD.md)

## What to build

Finish the resolve choreography: when resolve starts, the blank jellyfish begins exiting early by reversing its remembered entrance path, using the shared row-swim duration (enter/exit family), while the word bubble flies into the blank-slot footprint. Resolve still completes when the word bubble lands; the blank may still be swimming during hold/pop and must not be re-included in row exit.

This replaces any temporary blank leave visual from the word-bubble resolution slice with the real path-based early exit (with travel tilt).

## Acceptance criteria

- [ ] On resolve start, blank jellyfish reverses its remembered entrance path concurrently with word-bubble flight
- [ ] Blank early exit uses the shared row-swim duration, not the resolve fly duration
- [ ] Resolve / hold still complete based on word-bubble land, not blank exit completion
- [ ] Blank may remain visible swimming offscreen through hold/pop without blocking those phases
- [ ] Blank is excluded from row-exit participants (no second exit)
- [ ] Blank tilts toward travel during early exit, same as other path swims
- [ ] Tests cover blank early-exit path + swim-duration behavior at the planner/controller seams as appropriate

## Blocked by

- [02-word-bubble-round-resolution](./02-word-bubble-round-resolution.md)
- [03-per-jellyfish-swim-paths](./03-per-jellyfish-swim-paths.md)
