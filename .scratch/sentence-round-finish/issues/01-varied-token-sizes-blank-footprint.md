Status: ready-for-agent

# Varied token sizes and blank-slot footprint

## Parent

[.scratch/sentence-round-finish/PRD.md](../PRD.md)

## What to build

Make the sentence row layout match the finished blank-slot waiting-room model end-to-end: token jellyfish use per-slot rolled sizes (stable for the round), and the blank slot reserves a footprint sized to the conjugated form’s word-bubble diameter with a smaller centered `?` jellyfish (~70% of that footprint). Wrapping and gaps must leave room around the footprint so a later word bubble can land without colliding with neighbors or other lines.

Wire this through layout → sentence row rendering so a live round already shows varied tokens and a correctly sized blank waiting room before any resolution animation changes. Word-bubble diameter packing uses the letter-bubble size for the conjugated length (known at enter).

## Acceptance criteria

- [ ] Token jellyfish in a sentence prompt have different rolled sizes; rolls are stable for the round once the prompt appears
- [ ] Blank footprint diameter is fixed at round enter from packing the conjugated form at the letter-bubble size for that conjugated length
- [ ] Blank `?` jellyfish bell is about 70% of the footprint diameter and centered in the footprint
- [ ] Left/right spacing and between-line gaps accommodate the blank footprint (short and long conjugated forms; wrapped prompts)
- [ ] Layout seam tests cover per-token rolls, blank footprint sizing, and wrapping/gap behavior
- [ ] Shared word-transformation core is not forked; only letter-layout metrics are consumed

## Blocked by

None - can start immediately
