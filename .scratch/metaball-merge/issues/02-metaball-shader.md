Status: ready-for-agent

## What to build

Implement the metaball shader field inside the new merge layer. Feed the shader with the `computeLetterLayout` centers, the shared `mergeProgress`, and the `images.bubble` texture so it sums inverse-distance influence fields and thresholds the result into one unified blob. Keep the existing letter text nodes visible above the shader so glyph rendering remains untouched; fade their opacity as the shader reaches full merge so users never see duplicate letters.

## Acceptance criteria

- [ ] The shader accepts up to the maximum letter count per word, zeros out unused slots, and samples `images.bubble` for consistent bubble visuals.
- [ ] The shader’s aggregated field uses inverse distance (or similar) math to create a metasphere that smoothly blends when the letter centers converge.
- [ ] Letter opacities fade out in sync with the shader’s alpha threshold so that once the blob is complete only the shader-borne bubble remains.

## Blocked by

- [.scratch/metaball-merge/issues/01-replace-merge-layer.md](01-replace-merge-layer.md)
