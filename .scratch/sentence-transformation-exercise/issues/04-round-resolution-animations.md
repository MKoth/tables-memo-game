Status: ready-for-agent
Blocked by: 03

## Parent

`.scratch/sentence-transformation-exercise/PRD.md`

## What to build

Replace the stub round advance from issue 03 with the full **round resolution** lifecycle. The sentence exercise shell owns a round orchestrator with these phases: Enter → Transform → Merge → Resolve → Hold (~3 s) → Pop → Exit → Advance.

On transformation completion: letter bubbles merge into one word bubble; the merged bubble flies to the blank slot while the `?` jellyfish exits simultaneously; the bubble becomes a word jellyfish in the row. The complete sentence holds for ~3 seconds (configurable constant). The solved word jellyfish pops with success sound. The entire row exits offscreen. The next round begins with a mirror fly-in entrance from the same edge (including the first round of a session), then the new infinitive inflates as letter bubbles.

Round-specific animation state stays in the sentence shell; transformation rules stay in the shared core. Test phase transitions through observable state if a round orchestrator is extracted — use injected timers for hold duration, not pixel-level animation assertions.

## Acceptance criteria

- [ ] Round orchestrator implements phases: Enter, Transform, Merge, Resolve, Hold, Pop, Exit, Advance
- [ ] On solve, letter bubbles merge into one word bubble before flying to the blank slot
- [ ] Merged bubble flies to blank slot while `?` jellyfish exits simultaneously
- [ ] Complete sentence holds for ~3 seconds (configurable constant) before pop
- [ ] Solved word jellyfish pops with success sound; entire row then exits offscreen
- [ ] Next sentence row flies in from the same offscreen edge the previous row exited through
- [ ] First round of a session uses the same fly-in entrance (no special-case opening)
- [ ] New infinitive letter bubbles inflate after the sentence row arrives
- [ ] Transformation core remains unchanged; round animation concerns live only in the sentence shell
- [ ] Phase transitions are testable (unit or integration tests with fake timers for hold duration)

## Blocked by

- `issues/03-playable-sentence-exercise-stub.md`
