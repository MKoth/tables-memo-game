# Lang Tables Learn Game

A React Native app for learning verb conjugation tables through undersea-themed interactive exercises.

## Language

**Table**:
A conjugation grid: row headers (pronouns), column headers (infinitives), and body cells (conjugated forms).
_Avoid_: grid, matrix, chart

**Infinitive**:
The unconjugated verb form listed as a column header; the starting word the learner transforms.
_Avoid_: base verb, root verb, column word

**Conjugated form**:
The correctly inflected verb for a pronoun–infinitive pair, stored in a table body cell.
_Avoid_: answer, cell value, target string

**Word transformation**:
The shared mechanic of turning an infinitive into a conjugated form through letter-level delete and insert operations on bubbles.
_Avoid_: spelling game, letter puzzle

**Table transformation exercise**:
An exercise where the learner transforms an infinitive while a full conjugation table is visible as jellyfish; the solved form fills its matching table cell.
_Avoid_: table exercise, grid exercise, word transformation exercise

**Sentence transformation exercise**:
An exercise where the learner transforms an infinitive while a sentence prompt is visible as a row of jellyfish; round resolution lands a word bubble in the blank-slot footprint, then the round exits and the next prompt appears.
_Avoid_: sentence exercise, fill-in-the-blank exercise

**Sentence prompt**:
A short contextual sentence tied to one table body cell, made of an ordered list of word tokens with exactly one blank slot where the conjugated form belongs. The blank slot is a position (`blankIndex`), not a token string — sparse tokens omit it.
_Avoid_: sentence, example sentence, fill-in-the-blank

**Blank slot**:
The single token position in a sentence prompt reserved for the conjugated form. Its layout footprint is fixed at round enter from the conjugated form’s word-bubble diameter; a smaller highlighted jellyfish marked with `?` (about 70% of the footprint diameter) sits centered inside that footprint until it exits during resolve. After that exit, the sentence row no longer draws a jellyfish there — only the landed word bubble occupies the footprint through hold until it pops.
_Avoid_: gap, placeholder, underline

**Round**:
One cycle of the sentence transformation exercise — from a sentence prompt appearing through solving the blank slot to the row leaving the screen before the next prompt.
_Avoid_: level, stage, turn

**Round resolution**:
The animated sequence after the last transformation operation succeeds: metaball merge, immediate swap to a word bubble that materializes (shell grows to full size) at the merge site, that bubble then flies to the blank-slot footprint while the blank jellyfish starts exiting early along its remembered entrance path using the shared row-swim duration (often still leaving after the bubble has landed), resolve completes when the word bubble lands, the landed word bubble holds in the footprint, that bubble pops, then the remaining token jellyfish exit along their remembered paths.
_Avoid_: completion animation, success sequence

**Metaball merge**:
The shader-driven round resolution animation where each letter bubble’s influence field blends into one unified shape that ends in the same letter layout the word bubble will use, so the immediate shell swap stays visually continuous before flight to the blank slot.
_Avoid_: bubble fusion effect, gooey merge

**Word bubble**:
The single bubble that replaces the metaball field after merge and carries the conjugated form into the blank-slot footprint at constant diameter (translation only during resolve); it remains there through round hold until it pops. Its diameter is fixed at round enter by packing the conjugated form at the letter-bubble size for that conjugated length; merge ends in that same layout. On materialize, its shell starts slightly undersized and quickly reaches full size while letter glyphs stay at final size and position; inflate sound plays with that shell grow.
_Avoid_: resolution bubble, merged bubble, solved bubble

**Round hold**:
The pause after the word bubble lands in the blank-slot footprint and before that bubble pops — time for the learner to read the complete sentence (~3 seconds).
_Avoid_: display delay, success pause

**Round controller**:
The module that owns round lifecycle phase truth and scheduling for the sentence transformation exercise — enter, transform, merge, materialize, resolve, hold, pop, exit, and advance. Distinct from **round resolution**, which names only the post-transform animation sequence.
_Avoid_: round orchestrator, phase manager

**Materialize**:
The brief round phase after metaball merge where the word bubble replaces the merged field and its shell grows from slightly undersized to full size at the merge site before resolve flight begins.
_Avoid_: inflate (reserved for letter-bubble appear), appear, bubble enter

**Round entrance**:
How the next sentence row arrives after the previous round exits: each jellyfish swims in on its own linear path from an offscreen spawn point to its slot, then the infinitive letter bubbles inflate. Allowed spawn edges are orientation-gated — portrait: top/left/right (no bottom); landscape: top/bottom/right (no left) — so paths avoid the word-transformation zone. Spawn points are assigned in sentence-token order along those edges so trajectories do not cross; the blank slot gets a path like any other. All jellyfish start together and share one enter duration (different path lengths ⇒ different speeds); enter completes when the last arrives. Row exit mirrors that: remaining token jellyfish start together, share one exit duration, and exit completes when the last has left; each retraces its entrance path (blank may reverse early during resolve and is not re-exited with the row). Paths are remembered for the round — a mid-round orientation change may reflow resting slot positions, but does not replan those paths until the next round. The first round of a session uses the same per-jellyfish swim-in.
_Avoid_: row transition, sentence intro

**Sentence row**:
The horizontal (or wrapped) layout of jellyfish showing one sentence prompt, placed in the jelly zone. Token jellyfish use per-slot rolled sizes; the blank slot reserves a footprint sized to the word bubble. One line when the sentence fits; longer sentences wrap to additional lines, with the block centered vertically in the zone.
_Avoid_: sentence bar, word strip, jellyfish line

**Decorative koi**:
Background fish that swim across the full screen without carrying words, accepting taps, or participating in capture or transformation.
_Avoid_: ambient koi, swimming decoration
