Status: ready-for-agent

# Word-bubble round resolution (materialize → fly → hold → pop)

## Parent

[.scratch/sentence-round-finish/PRD.md](../PRD.md)

## What to build

Replace today’s merge→resolution-bubble→filled-blank-token path with the word-bubble round resolution sequence, wired through controller, geometry, and UI.

After metaball merge, immediately swap to a word bubble that **materializes** at the merge site (shell slightly undersized → full size, letter glyphs stay at the shared final size/position, inflate sound), then flies at **constant diameter** into the blank-slot footprint. Resolve completes when the word bubble lands; hold shows that landed bubble (no blank morph into a conjugated-form token jellyfish); after hold the word bubble pops.

Round controller gains an explicit `materialize` phase between `merge` and `resolve`. Merge end-layout equals the word-bubble letter layout by construction. Blank jellyfish may still use a temporary leave visual (e.g. scale-away) until the blank early-exit slice; do not gate hold on blank exit completion.

## Acceptance criteria

- [ ] Round controller phases are `enter → transform → merge → materialize → resolve → hold → pop → exit → advance`
- [ ] Materialize completes at the merge site before resolve flight starts; inflate sound plays with shell grow
- [ ] Metaball merge ends in the same letter layout the word bubble uses (shared geometry)
- [ ] Word bubble flies at constant diameter (translation only) into the blank-slot footprint
- [ ] Resolve completes when the word bubble lands; hold is not gated on blank exit
- [ ] During hold/pop, the sentence row does not draw a filled conjugated-form token jellyfish in the blank slot — only the word bubble occupies the footprint
- [ ] After hold, the word bubble pops (not a solved-token jellyfish pop)
- [ ] Controller and merge/word-bubble geometry seam tests cover the new phase order and constant-diameter flight geometry
- [ ] Snapshot/API no longer drives hold via blank-as-filled-token morph semantics

## Blocked by

- [01-varied-token-sizes-blank-footprint](./01-varied-token-sizes-blank-footprint.md)
