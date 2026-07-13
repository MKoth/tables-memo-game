# Lang Tables Learn Game

A React Native app for learning Spanish through undersea-themed interactive exercises — verb conjugation tables and individual vocabulary.

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
The single token position in a sentence prompt reserved for the conjugated form. Its layout footprint is fixed at round enter — from the word-bubble diameter in sentence transformation, or from the correct option jellyfish bell diameter in variant selection. A smaller highlighted jellyfish marked with `?` (about 70% of the footprint diameter) sits centered inside that footprint until it exits during resolve. After that exit, the sentence row no longer draws a jellyfish there — the landed word bubble or option jellyfish occupies the footprint through hold until it exits with the row.
_Avoid_: gap, placeholder, underline

**Variant selection exercise**:
An exercise where the learner selects the correct conjugated form from three option jellyfish (one correct answer and two distractors) displayed below a sentence prompt with a blank slot. No letter manipulation — the learner taps a jellyfish to submit their choice. The selected jellyfish then flies to the blank slot position; distractors exit immediately along their remembered swim-in paths.
_Avoid_: multiple choice exercise, picker exercise, quiz

**Option jellyfish**:
A jellyfish that carries a conjugated form in the variant selection exercise. Three are shown per round: the correct form and two distractor forms from the same infinitive but different pronoun rows. They swim in from offscreen at round enter (same swim-path model as sentence token jellyfish) and sit in the option-zone below the sentence row. On correct selection the chosen one flies to the blank slot; on wrong selection it flashes red and the round waits for another tap.
_Avoid_: variant jellyfish, choice bubble, answer jellyfish

**Distractor forms**:
The two incorrect conjugated forms shown as distractors in a variant selection exercise round. Selected randomly from the same infinitive column, excluding the target pronoun row.
_Avoid_: wrong answers, decoys, foils

**Round**:
One cycle of the sentence transformation or variant selection exercise — from a sentence prompt appearing through solving the blank slot to the row leaving the screen before the next prompt.
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
The module that owns round lifecycle phase truth and scheduling. Two variants: **sentence transformation** (enter, transform, merge, materialize, resolve, hold, pop, exit, advance) and **variant selection** (enter, transform, resolve, hold, exit, advance). Distinct from **round resolution**, which names only the post-transform animation sequence.
_Avoid_: round orchestrator, phase manager

**Materialize**:
The brief round phase after metaball merge where the word bubble replaces the merged field and its shell grows from slightly undersized to full size at the merge site before resolve flight begins.
_Avoid_: inflate (reserved for letter-bubble appear), appear, bubble enter

**Round entrance**:
How the next round arrives after the previous round exits: each jellyfish (sentence tokens, blank slot, and option jellyfish in variant selection) swims in on its own linear path from an offscreen spawn point to its slot. In sentence transformation, the infinitive letter bubbles then inflate. Allowed spawn edges are orientation-gated — portrait: top/left/right (no bottom); landscape: top/bottom/right (no left) — so paths avoid the word-transformation zone. Spawn points are assigned in row order along those edges so trajectories do not cross; the blank slot gets a path like any other. All jellyfish start together and share one enter duration (different path lengths ⇒ different speeds); enter completes when the last arrives. Row exit mirrors that: remaining jellyfish start together, share one exit duration, and exit completes when the last has left; each retraces its entrance path (blank may reverse early during resolve and is not re-exited with the row). For variant selection, the two distractor option jellyfish that did not get selected exit immediately on correct selection. Paths are remembered for the round — a mid-round orientation change may reflow resting slot positions, but does not replan those paths until the next round. The first round of a session uses the same per-jellyfish swim-in.
_Avoid_: row transition, sentence intro

**Sentence row**:
The horizontal (or wrapped) layout of jellyfish showing one sentence prompt, placed in the jelly zone. Token jellyfish use per-slot rolled sizes; the blank slot reserves a footprint sized to the word bubble. One line when the sentence fits; longer sentences wrap to additional lines, with the block centered vertically in the zone.
_Avoid_: sentence bar, word strip, jellyfish line

**Decorative koi**:
Background fish that swim across the full screen without carrying words, accepting taps, or participating in capture or transformation.
_Avoid_: ambient koi, swimming decoration

**Word entry**:
A single Spanish–English translation pair (`spanish`, `english`). The atomic unit of vocabulary data, analogous to a body cell in conjugation tables.
_Avoid_: vocabulary item, flashcard, term

**Word list**:
A named collection of word entries (`id`, `title`, `words[]`) that serves as the dataset for word-learning exercises. Analogous to a `TableData` for conjugation exercises.
_Avoid_: vocabulary list, deck, word set

**Translation choice exercise**:
A word-learning exercise where the learner sees an English word as letter bubbles in the koi zone and selects the correct Spanish translation from three option jellyfish in the jelly zone. On correct selection the English bubbles pop and the Spanish word inflates in the same koi-zone position (a clean swap); all jellyfish exit simultaneously along their remembered swim-in paths.
_Avoid_: word variant selection, vocabulary quiz, translation picker

**Translation spelling exercise**:
A word-learning exercise where the learner sees an English word as letter bubbles and spells the Spanish translation letter-by-letter by tapping shuffled letter bubbles (including 2–3 distractor letters not present in the target word). Letters must be selected left-to-right; tapping any instance of a repeated letter counts as correct. On completion the remaining distractor letters pop, then the English word pops, then the spelled Spanish word pops.
_Avoid_: word transformation, letter spelling, type the word

**Translation choice round controller**:
The round lifecycle for translation choice: enter (English letter bubbles inflate, option jellyfish swim in), transform (user taps a jellyfish; wrong = red flash), resolve (English bubbles pop, Spanish word inflates, all jellyfish exit along remembered paths), hold (~3 s reading pause), exit (Spanish letter bubbles pop in cascade), advance (brief gap before next round).
_Avoid_: translation choice phases, choice lifecycle

**Translation spelling round controller**:
The round lifecycle for translation spelling: enter (English word inflates, shuffled letter bubbles appear), transform (user taps letters left-to-right; wrong = red wiggle; correct letters fly to the row below English), resolve (remaining distractor letters pop, English word pops, Spanish word pops in sequential cascade), exit (screen clears), advance (next round).
_Avoid_: spelling phases, typing lifecycle

**Word learning store config**:
A dedicated zustand store configuration (`WORD_LEARNING_STORE_CONFIG`) for word-learning exercises, separate from the conjugation exercise store configs. Word-learning exercises have no conjugation table or sentence row, so their tutorial flow and initial state differ.
_Avoid_: word transformation store config, shared store

**Translation distractor words**:
The two incorrect Spanish words shown as option jellyfish in translation choice. Drawn from other entries in the same word list, excluding the target entry. The word list must contain at least three entries for a valid round.
_Avoid_: wrong translations, decoy words, foil translations

**Translation direction**:
Word-learning exercises present English as the prompt and Spanish as the answer. The word entry model supports both directions but exercises are English → Spanish only.
_Avoid_: bidirectional translation, reverse translation

**Accented character identity**:
Accented characters (á, é, í, ó, ú, ñ, ü) are distinct letters in translation spelling — 'a' and 'á' do not match each other. The letter pool contains exact characters from the Spanish word and comparison is exact character match.
_Avoid_: accent-insensitive, normalized comparison

**Word prompt row**:
The English word displayed as letter bubbles in the koi zone for word-learning exercises. In translation spelling, the Spanish word being constructed appears directly below it in the same zone, both centered vertically. The shuffled letter pool sits in the jelly zone below.
_Avoid_: prompt display, English row, source word
