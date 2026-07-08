Status: ready-for-agent

## What to build

Replace the `TransformationMergeBubbles` component’s stack of individual `LetterBubble` renders with a single canvas layer that can host the shader-driven merge effect while keeping the current round lifecycle intact. The new layer must still expose the per-letter merge progress so that letter spacing, opacity, and lifecycle callbacks (including `handleMergeComplete`) continue to operate as before, proving we can swap the rendering layer without affecting the surrounding state machine.

## Acceptance criteria

- [ ] The new component hosts a canvas/shader layer in place of the existing `LetterBubble` stack without changing the round completion callbacks or timing.
- [ ] A shared merge-progress value is still computed and drives both the letter positions and the new canvas layer’s uniforms.
- [ ] The letter texts, durations, easing curves, and completion callback (`handleMergeComplete`) remain untouched while the new layer is verified to render in the same position as the old merge stack.

## Blocked by

- None - can start immediately
