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
An exercise where the learner transforms an infinitive while a sentence prompt is visible as a row of jellyfish; the solved form fills the blank slot, then the round exits and the next prompt appears.
_Avoid_: sentence exercise, fill-in-the-blank exercise

**Sentence prompt**:
A short contextual sentence tied to one table body cell, made of an ordered list of word tokens with exactly one blank slot where the conjugated form belongs. The blank slot is a position (`blankIndex`), not a token string — sparse tokens omit it.
_Avoid_: sentence, example sentence, fill-in-the-blank

**Blank slot**:
The single token position in a sentence prompt reserved for the conjugated form; shown to the learner as a highlighted jellyfish marked with `?`.
_Avoid_: gap, placeholder, underline

**Round**:
One cycle of the sentence transformation exercise — from a sentence prompt appearing through solving the blank slot to the row leaving the screen before the next prompt.
_Avoid_: level, stage, turn

**Round resolution**:
The animated sequence after the last transformation operation succeeds: merged bubble flies to the blank slot, the blank jellyfish leaves, the complete sentence holds on screen, the solved word pops, then the row exits.
_Avoid_: completion animation, success sequence

**Round hold**:
The pause after round resolution lands and before the solved word pops — time for the learner to read the complete sentence (~3 seconds).
_Avoid_: display delay, success pause

**Round entrance**:
How the next sentence row arrives after the previous round exits: jellyfish fly in from the same offscreen edge the prior row left through, then the infinitive letter bubbles inflate. The first round of a session uses the same fly-in.
_Avoid_: row transition, sentence intro

**Sentence row**:
The horizontal (or wrapped) layout of jellyfish showing one sentence prompt, placed in the jelly zone. One line when the sentence fits; longer sentences wrap to additional lines, with the block centered vertically in the zone.
_Avoid_: sentence bar, word strip, jellyfish line

**Decorative koi**:
Background fish that swim across the full screen without carrying words, accepting taps, or participating in capture or transformation.
_Avoid_: ambient koi, swimming decoration
