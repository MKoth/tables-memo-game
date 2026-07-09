Status: ready-for-agent

# Finish sentence transformation round presentation

## Problem Statement

The sentence transformation exercise’s round presentation feels unfinished. Sentence-prompt jellyfish are same-sized (only tint varies), the blank slot is a same-size `?` jellyfish that gets its label replaced rather than yielding space to a real word bubble, metaball merge hands off with a rigid resolution bubble that shrinks/grows into the blank, and round entrance/exit is a single shared-edge row slide instead of per-jellyfish swims with tilt. The learner never gets a continuous “merged word becomes a bubble, lands in a prepared gap, blank swims away” beat.

## Solution

Finish the sentence transformation round so that:

- Token jellyfish in the sentence row have varied sizes (rolled font → bell size); the blank slot reserves a footprint sized to the eventual word bubble, with a smaller `?` jellyfish inside.
- After metaball merge, the field is immediately replaced by a word bubble that materializes (shell grows slightly small → full, letters stay put, inflate sound), then flies at constant diameter into the blank footprint while the blank jellyfish swims off on its remembered path.
- The landed word bubble is what the learner reads during hold; it pops; remaining token jellyfish exit by reversing their entrance paths.
- Round entrance/exit uses per-jellyfish linear paths from orientation-gated offscreen edges, non-crossing, with tilt toward travel while swimming.

## User Stories

1. As a learner, I want sentence-prompt token jellyfish to be different sizes, so the row feels alive rather than a uniform strip.
2. As a learner, I want the blank slot to look like a waiting room sized for the answer bubble, so I can anticipate where the conjugated form will land.
3. As a learner, I want the blank `?` jellyfish to be clearly smaller than that waiting room, so the gap around it reads as reserved space.
4. As a learner, I want extra space left/right of the blank footprint and between wrapped lines, so the arriving word bubble does not collide with neighbors.
5. As a learner, I want metaball merge to end with letters already in the final word layout, so the handoff to the word bubble feels continuous.
6. As a learner, I want the merged field to be replaced immediately by a word bubble (not a delayed morph phase with no shell), so the answer reads as a finished object.
7. As a learner, I want that word bubble’s shell to start a little small and quickly reach full size while letters stay fixed, so materialize feels like a shell settling rather than text jumping.
8. As a learner, I want to hear the inflate sound during that shell grow, so materialize matches other bubble appears.
9. As a learner, I want materialize to finish at the merge site before the bubble flies, so I see “it became a word” before it travels.
10. As a learner, I want the word bubble to keep one diameter while flying, so it does not shrink or grow mid-flight.
11. As a learner, I want the word bubble to fly into the blank-slot footprint while the blank jellyfish leaves, so the answer takes the place the `?` vacated.
12. As a learner, I want the blank jellyfish to leave along the same path it used to enter, so exit motion feels intentional and consistent.
13. As a learner, I want hold to begin when the word bubble lands even if the blank is still swimming away, so I am not waiting on the blank’s longer swim.
14. As a learner, I want the blank to keep swimming out on its own through hold/pop if needed, so the sentence is not blocked by that exit.
15. As a learner, I want the sentence row to stop drawing a jellyfish in the blank slot after the blank has left (or started leaving), so I do not see a filled token jellyfish under/beside the word bubble.
16. As a learner, I want the landed word bubble to stay in the footprint during hold, so I can read the complete sentence with the answer as a bubble.
17. As a learner, I want that word bubble to pop after hold, so the answer clears the same way other success pops do.
18. As a learner, I want the remaining token jellyfish to then swim out by reversing their entrance paths, so the round exits the way it entered.
19. As a learner, I want all sentence jellyfish to spawn offscreen and swim in on linear paths at round entrance, so the prompt arrives as a school rather than a sliding bar.
20. As a learner, I want portrait rounds to spawn only from top/left/right (never bottom), so entrance paths do not cross the word-transformation area.
21. As a learner, I want landscape rounds to spawn only from top/bottom/right (never left), so entrance paths do not cross the word-transformation area.
22. As a learner, I want spawn points assigned in sentence-token order along allowed edges so paths do not cross, so the swim-in stays readable.
23. As a learner, I want the blank slot to get an entrance path like any other slot, so it is part of the same school.
24. As a learner, I want all jellyfish to start enter together and share one enter duration, so the row feels coordinated even when path lengths differ.
25. As a learner, I want enter to complete only when the last jellyfish has arrived, so letter-bubble inflate does not start early.
26. As a learner, I want row exit to mirror enter (shared duration, start together, complete on last), so timing stays symmetric.
27. As a learner, I want jellyfish to tilt toward their travel direction while swimming (enter, blank early exit, row exit), so motion matches the table jellyfish lean language.
28. As a learner, I want idle sentence jellyfish to stay upright, so the prompt stays readable during transform.
29. As a learner, I want token size rolls to be stable for the round once the prompt appears, so entrance and exit use the same sizes.
30. As a learner, I want the blank footprint diameter to be known at enter from the conjugated form, so the waiting room is correct before I transform.
31. As a learner, I want word-bubble diameter to come from packing the conjugated form at the letter-bubble size for that conjugated length, so merge and materialize share glyph metrics.
32. As a learner, I want mid-round orientation change to keep this round’s remembered paths (resting slots may reflow), so exit still reverses how they entered.
33. As a learner, I want the next round to replan paths for the new orientation, so spawn edges stay valid after rotate.
34. As a developer, I want a `materialize` phase on the round controller between merge and resolve, so shell-grow completion is explicit phase truth.
35. As a developer, I want resolve to mean flight + blank early-exit start, completing when the word bubble lands, so hold scheduling does not wait on blank swim duration.
36. As a developer, I want blank early exit to use the shared row-swim duration (enter/exit family), so “still leaving during hold” is intentional.
37. As a developer, I want a pure swim-path planner as the seam for entrance/exit geometry, so non-crossing and edge rules are testable without UI.
38. As a developer, I want sentence row layout to take conjugated-form metrics for the blank footprint and per-token rolls for tokens, so wrapping/gaps are deterministic in tests.
39. As a developer, I want merge end-layout to equal the word-bubble letter layout, so continuity is by construction.
40. As a developer, I want the shared word-transformation core left alone except for consuming its letter layout metrics, so table and sentence exercises stay on the shared-core ADR.
41. As a developer, I want inflate sound reserved for letter-bubble appear and word-bubble materialize shell grow, without naming the round phase “inflate,” so glossary and controller stay unambiguous.
42. As a developer, I want the old shared-row `exitEdge` entrance/exit model removed from sentence round behavior, so per-jellyfish paths are the only entrance/exit truth.
43. As a developer, I want `blankFilled` / display-slot morph-to-solved-token behavior removed from the hold path, so the word bubble is the only blank occupant after resolve.
44. As a QA engineer, I want short and long conjugated forms to reserve correctly sized blank footprints, so layout does not clip or leave a tiny gap.
45. As a QA engineer, I want wrapped multi-line sentence prompts to keep line gaps that fit the blank footprint, so the word bubble can land without overlapping another line.
46. As a QA engineer, I want portrait and landscape entrance fans to avoid the koi/transform zone, so jellyfish never swim through letter bubbles on the way in.
47. As a learner, I want the first round of a session to use the same per-jellyfish swim-in as later rounds, so the session opens consistently.

## Implementation Decisions

- **Domain vocabulary** (already updated in `CONTEXT.md`): blank slot footprint, word bubble, materialize phase, revised round resolution / round entrance / sentence row / round controller. Prefer these terms in code names and comments.
- **Round controller phases**: `enter → transform → merge → materialize → resolve → hold → pop → exit → advance`. Add `notifyMaterializeComplete` (or equivalent) between merge and resolve. Resolve completes on word-bubble land (`notifyResolveComplete`); do not gate hold on blank exit completion.
- **Remove / replace snapshot concepts**: drop shared-row `exitEdge` as the entrance/exit driver; stop using `blankFilled` to morph the blank display slot into a conjugated-form token jellyfish for hold. Blank occupancy after resolve is the word bubble layer only.
- **Word bubble component**: new presentation for the post-merge object (not the current single-string resolution bubble that scales from/to different diameters). Materialize = shell slightly undersized → full size, glyphs fixed at final size/position, inflate sound; then resolve flight is translation only at constant diameter.
- **Geometry at enter**: compute word-bubble diameter by packing the conjugated form at `computeLetterLayout(koiRect, conjugatedLength).diameter` (plus the packing/padding rules needed for one enclosing bubble). Blank footprint diameter equals that word-bubble diameter; blank jellyfish bell ≈ 70% of footprint, centered. Token jellyfish: per-slot rolled font/bell sizes, stable for the round; blank does not participate in the size lottery.
- **Merge end state**: constrain metaball merge final letter layout to the same layout the word bubble will use (shared geometry helper). Continuity at merge→materialize is by construction.
- **Swim-path planner (new pure module)**: inputs = orientation, screen/jelly bounds, slot resting centers, slot count (including blank). Outputs = per-slot spawn point + linear path. Allowed edges: portrait top/left/right; landscape top/bottom/right. Assign spawn points in sentence-token order along allowed edges so linear trajectories do not cross. Remember paths for the round; reverse for exit; blank early exit uses the same path with shared row-swim duration (enter/exit family), not resolve-fly duration.
- **Enter/exit timing**: all participants start together; shared duration; phase completes when the last arrives/leaves. Blank is excluded from row-exit participants (already leaving or gone). Mid-round orientation change may reflow resting positions; do not replan remembered paths until the next round.
- **Tilt**: drive sentence-row jellyfish `motionAngle` / `motionAmp` (or equivalent) only while translating on a path (enter, blank early exit, row exit); idle upright.
- **Modules to touch (conceptual)**: round controller + timing constants; sentence row layout; swim-path planner; merge layout / resolution flight helpers; sentence game hook wiring; sentence row jellyfish layer (per-path motion + tilt); word-bubble view replacing current resolution-bubble flight behavior. Do not fork the shared word-transformation core (ADR 0001); only consume letter-layout metrics from it.
- **Decorative koi leave-scene logic** may be referenced for “swim offscreen until gone” inspiration, but sentence jellyfish paths are planned/remembered linear paths, not koi escape simulation.

## Testing Decisions

- Prefer **external behavior** of pure domain/layout modules over React/Skia rendering details.
- **Seams** (agreed):
  1. `createSentenceRoundController` — phase order including `materialize`; resolve completes on land; no blank-exit gate for hold; snapshot contract without shared-row exit-edge / blank-as-filled-token semantics.
  2. Sentence row layout pure functions — per-token rolls; blank footprint from conjugated word-bubble diameter at enter; `?` ~70% inside; wrapping/gaps respect footprint.
  3. Swim-path planner (new) — orientation edge gates; token-order non-crossing paths; enter/exit shared-duration model; blank early-exit path + swim duration.
  4. Merge end-layout / word-bubble geometry helpers — shared final letter layout; constant diameter; flight translation-only geometry.
- **Prior art**: `sentenceRoundController` tests, `underseaExerciseLayout` tests, `mergeLayout` tests, `sentenceTransformationDomain` tests.
- Do not require UI snapshot tests for tilt/shader visuals; assert planner outputs and controller transitions instead.

## Out of Scope

- Changing the shared word-transformation mechanic (delete/insert/variant picker) or table transformation exercise presentation.
- Redesigning decorative koi behavior or reusing koi escape physics for sentence jellyfish.
- New sentence prompt content / table data authoring.
- Ambient idle motion/tilt for sentence jellyfish while resting.
- Replanning swim paths mid-round on orientation change (next round only).
- Tuning exact ms durations beyond wiring existing timing constants / a dedicated materialize duration — visual polish passes after behavior is correct.
- Accessibility / reduced-motion variants.

## Further Notes

- Glossary terms **Round resolution**, **Round entrance**, **Blank slot**, **Word bubble**, **Materialize**, and **Round controller** were updated during grilling to match this PRD; implement against those definitions.
- “Inflate” remains the letter-bubble appear / materialize **sound and shell motion** language; the round **phase** name is **materialize**.
- Blank early exit often outlasts resolve flight by design (shared swim duration vs shorter fly duration); hold/pop must tolerate a still-visible blank swimming offscreen without re-including it in row exit.
