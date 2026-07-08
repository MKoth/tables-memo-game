Status: ready-for-agent

## Problem Statement

The current sentence transformation exercise resolves a round by collapsing every letter bubble into a single `TransformationMergeBubbles` component and sending a static `LetterBubble` to the blank slot. The learner sees a rigid sequence: multiple letter bubbles animate onto one spot, then a simple bubble flies away with the solved word. We want a richer “metaball merge” that visually melts the letters together, showing each bubble’s influence field blend naturally into one cohesive shape, and then follow the existing round resolution flight into the blank slot. This will make the undersea theme feel more magical while keeping the round timing, audio, and jellyfish context the same.

## Solution

Replace the post-operation merge animation with a shader-driven metaball transition. During the round resolution phase, keep the independent text nodes visible and animate their spacing to shrink toward the computed centers while a single Skia RuntimeEffect fragment shader draws the multi-bubble energy field, sampling the current bubble texture so the goo looks consistent. Once the field threshold embodies a single unified blob, fade the old letter nodes out, park the merged bubble at the blank slot, play the existing pop sound, and let the solved word remain through the round hold before the row exits. All round lifecycle callbacks, durations (`ROUND_MERGE_DURATION_MS`, `ROUND_RESOLVE_FLY_DURATION_MS`), and state transitions stay untouched—the shader simply replaces the visual layer inside `TransformationMergeBubbles` while animating alongside the current resolution bubble path.

## User Stories

1. As a learner, I want to see the letter bubbles merge with a gooey metaball effect after solving the word so that the completion feels like an organic underwater fusion instead of a mechanical animation.
2. As a learner, I want the letters themselves to stay readable throughout the merge and only disappear once the unified blob is formed so that I can confirm the solved word before it flies to the blank.
3. As a learner, I want the merged bubble to fly to the blank slot and stay there for the usual round hold so that the sentence resolution pacing matches other rounds.
4. As a learner, I want the same pop sound and disappearance behavior to trigger once the merged bubble finishes the flight so that the reward cues remain consistent.
5. As a domain expert, I want the metaball merge to reuse `computeLetterLayout` so the shader field aligns perfectly with the letter positions we already supply to other layers.
6. As a renderer, I want the shader to sample `images.bubble` so that the new gooey field keeps the established visual language of the Undersea theme.
7. As a developer, I want the merge animation to keep using `ROUND_MERGE_DURATION_MS` and the existing easing so there are no timing surprises in the round lifecycle.
8. As a developer, I want the shader to share the same merge progress value used by the letter spacing animation so that text and blob stay in sync.
9. As a developer, I want the shader to operate only during the round resolution window so we don’t run expensive GPU work outside `merge`/`resolve`.
10. As a designer, I want the existing `TransformationRoundResolutionBubble` flight path to remain the canonical trajectory so nothing else in the controller needs rewiring.
11. As an engineer updating glossaries, I want “Metaball merge” documented in `CONTEXT.md` so future contributors understand the term.

## Implementation Decisions

- Use `TransformationMergeBubbles` as the host so the new shader sits exactly where the existing per-letter `LetterBubble`s were rendered.
- Animate the per-letter `centerX` offsets by interpolating between `layout.centers` and the merge center while driving a shared `mergeProgress` value that feeds both the shader uniforms and the letter repositioning.
- Replace the `LetterBubble` stack in the shader stage with a Skia RuntimeEffect that sums inverse-distance influence fields (metaball formula) for each letter, thresholds the result, and samples `images.bubble` so the merged blob matches the established visual look.
- Keep the shader layered beneath the letter texts so glyphs remain standard React Native text nodes; fade their opacity out as the shader’s alpha crosses the merge threshold to avoid duplicate letters.
- Once the shader reports merge completion, trigger the existing `game.handleMergeComplete`, reuse `computeRoundResolutionFlight` data, and allow `TransformationRoundResolutionBubble` to handle the actual flight and pop, ensuring the rest of the round controller and state machine are unchanged.
- Retain all existing durations (`ROUND_MERGE_DURATION_MS`, `ROUND_RESOLVE_FLY_DURATION_MS`) and easing curves so the round lifecycle remains a known quantity in `SentenceRoundController`.
- Document the new “Metaball merge” term in `CONTEXT.md` to capture the shader-driven merge semantics for future discussions.
- No CPU fallback will be shipped; the effect assumes Skia RuntimeEffect support on target devices.

## Testing Decisions

- Unit-test the `SentenceRoundController` / `useSentenceTransformationGame` seam by simulating a round, forcing `roundPhase` transitions to `merge` and `resolve`, and asserting that `mergeWord` is populated, `resolutionBubble` is set from `computeRoundResolutionFlight`, and the callback flow (`handleMergeComplete` → `notifyMergeComplete` etc.) is preserved.
- Add a smoke test for `TransformationMergeBubbles` that renders the shader with mocked layout data and verifies the shared `mergeProgress` drives both shader uniforms and letter visibility (use snapshot or behavioral assertion as appropriate for the Skia layer).
- Rely on the existing letter tap / variant picker acceptance tests (if any) to cover the overall sentence transformation flow; this change should not alter their semantics.
- Since the shader only runs during round resolution, instrument the `mergeProgress` state to be deterministic for playback tests, ensuring the shader completes within `ROUND_MERGE_DURATION_MS`.

## Out of Scope

- Implementing a CPU fallback animation—this PR delivers only the Skia RuntimeEffect path.
- Extending the metaball merge to the word transformation exercise; the work is limited to sentence transformation resolution.
- Reworking other exercises’ rendering layers or replacing other bubble textures.

## Further Notes

- The “metaball merge” concept now has a place in the glossary, so future extensions can refer to it unambiguously.
- The shader’s uniforms will likely need an upper bound on letter count (e.g., 10) to keep `RuntimeEffect` manageable; design the uniform layout to zero out unused slots.
