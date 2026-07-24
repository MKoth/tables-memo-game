# Lang Tables Learn Game

A React Native app for learning Spanish through interactive exercises — verb conjugation tables and individual vocabulary. The exercise framework is theme-agnostic; the current undersea theme supplies the visuals.

## Language

### Generic architecture terms

**WordSprite**:
The generic floating word-display role in the exercise framework. A WordSprite carries a word (a conjugated form, a sentence token, or an option) and renders it as a tappable visual element. The undersea theme realises this role as a jellyfish; another theme could use a rose, a cloud, or any other visual. The name applies to every layer that displays words: table cells, sentence-row tokens, option pickers, and match-field sprites.
_Avoid_: jellyfish (use only when describing the undersea realisation specifically)

**Roamer**:
The generic roaming capturable-creature role in the exercise framework. A Roamer free-roams the screen on a simulation layer, can be tapped or captured, and carries a word (typically in the translation-match exercise). The undersea theme realises this role as a koi fish; the flower-garden theme realises it as a butterfly.
_Avoid_: koi, fish, butterfly (use only when describing a theme's realisation specifically)

**Scenery**:
The generic scene-background role in the exercise framework. Scenery fills the visual background behind the exercises. The undersea theme realises this as a seafloor with stones and seaweed; another theme could use a garden, a sky, or any other scene.
_Avoid_: background, seafloor (use only when describing the undersea realisation specifically)

**Theme**:
A visual adapter that implements the `Theme` interface and supplies all theme-specific visuals to the generic exercise framework. A theme provides: scenery, WordSprite layers, Roamer layers, word-transformation visuals, round-resolution visuals, tutorial overrides, loading-screen backdrop, shaders, layout config, sound controller, and per-mechanic visual layers. The exercise mechanics program to the `Theme` interface; a theme is the only place that names concrete visual creatures. See `docs/theme-structure-guide.md` for the full contract.
_Avoid_: UnderseaTheme

**ExerciseShell**:
The generic top-level wrapper that mounts every exercise. The shell obtains assets through the `Theme` contract, manages the loading screen, tutorial overlay, instruction chrome, and corner controls, and renders the exercise content inside a themed scene. It is theme-agnostic — it never names a concrete visual creature.
_Avoid_: UnderseaThemeShell, exercise wrapper

**Exercise core**:
The generic infrastructure shared by all exercises, living under `exercises/core/`: the clock provider, the zustand store factory and provider, the layout engine (zone splitting by orientation), the runtime and layout providers, the bridge types, the asset interface (load phase, ready gate, progress), and the hooks that connect mechanics to visuals. The exercise core never names a theme entity.
_Avoid_: UnderseaThemeCore

### Flower-garden theme terms

**Bush**:
An invisible organisational unit in the flower-garden theme that groups a small cluster of rose stems (3–5 per bush) around a single bush base point on the ground. A bush is never rendered itself — it exists only as a grouping for stem-base placement. Bush count and rose-to-bush assignment are decided once at exercise-session initialisation from a seeded RNG so the same table always renders the same bushes.
_Avoid_: rose cluster, stem group, plant

**Bush base**:
The point on the ground from which a bush's stems originate. The bush base is uniformly random inside the Scenery's `groundBand` (a fixed band below the rose-grid zone). All stems in a bush share this base plus a small random disk offset (≈30–60 px) so the stems fan out from a common root area rather than a single point.
_Avoid_: bush origin, bush anchor

**Calyx**:
The green sepal cup at the base of a rose, realised as the `rose_base.png` image. The calyx sits behind the rose (rose drawn on top) and moves with the rose as it shifts. The rose stem connects to the bottom of the calyx. The calyx's visible rose-center disc is hidden by the rose itself, so it reads as a green star peeking out around the bloom.
_Avoid_: rose base, sepal cup, base image

**Rose stem**:
A curved tapered band drawn between a fixed bush-base point on the ground and the bottom of the calyx. Narrow at the ground, wider at the calyx (linear taper). The shape is a quadratic bezier; the control point sits on the outer side of the base→top line, away from the bush center, so stems fan outward. The control point is constant per stem; only the top end tracks the rose. The stem is rendered by sampling the `stem.png` texture along the curve.
_Avoid_: stalk, branch, vine

**Rose leaf**:
A leaf image (`leaf1.png`–`leaf4.png`) attached to a rose stem with its stem-end at the stem surface and its tip pointing outward, perpendicular to the stem tangent. Each leaf has a pre-computed `side`: `outer` (in front of the stem band, visible) or `inner` (behind the stem band, occluded by it). Leaves are distributed along the stem from low to high; their movement follows the rose with a parallax weight tied to their position along the stem (low = barely moves, high = moves with the rose).
_Avoid_: petal (reserved for the rose head), foliage

**Leaf side**:
Whether a rose leaf sits on the outer or inner arc of its stem's quadratic bezier curve, determined once at stem initialisation by the sign of the dot product of the leaf's outward direction and the stem's normal at the leaf's `t` parameter. Outer leaves draw in front of the stem band; inner leaves draw behind. Since the stem geometry is constant, this per-leaf pre-computation is equivalent to a per-pixel test in the shader.
_Avoid_: leaf front/behind, leaf z

**Butterfly**:
The flower-garden realisation of a Roamer — the visual creature that free-roams the roamer zone in the flower-garden theme. A butterfly is composed of one body image and two wing images (left and right) drawn from a fixed 9-variant wing-pair set. The undersea theme's koi is the equivalent realisation; the two are interchangeable at the `Roamer` contract level.
_Avoid_: lycaenidae (reserved for the asset family / folder name), moth, pollinator

**Wing pair**:
A single index in `1..9` that selects the matching `lycaenidae_left_wing{i}.png` and `lycaenidae_right_wing{i}.png` images. Each butterfly is assigned one wing pair at spawn time. The assignment policy is: shuffle the 9 pairs, deal one each to the first 9 butterflies in spawn order, then for any overflow use `(startOffset + i) % 9` where `startOffset` is a random integer in `0..8` rolled once per session. Wings never change after spawn.
_Avoid_: wing variant, wing set

**Field flower**:
A small flower-head image drawn as part of the flower-garden Scenery that roamers can land on. Field flowers are not WordSprites — they never carry a word and never appear in the WordSprite zone. Each field flower has a single world position (its anchor) and an `occupant: roamerIndex | null` slot recording which butterfly is sitting on it, or `null` if free. Field flowers live inside the roamer zone (not in a separate band) and are scattered at fixed count (12) per session, with placement seeded so the same session re-renders identically.
_Avoid_: rest flower, landing pad, garden decoration

**Flower anchor**:
The `(x, y)` world position of a field flower's center, used as the sitting target for an approaching butterfly. When a butterfly is in `SITTING` or `WAIT_AT_TAKEN_FLOWER` state, its position is derived from the anchor (with small arc offset for sitting motion) — not from the flight sim.
_Avoid_: flower position, landing point, perch

**Occupant**:
The single roamerIndex (or `null`) recorded on a field flower that names the butterfly currently sitting on it. A field flower is either free (`occupant === null`) or taken (`occupant !== null`). Two butterflies cannot share an occupant slot; an approaching butterfly that finds the slot taken enters `WAIT_AT_TAKEN_FLOWER` and polls the slot each frame for the transition to `null`.
_Avoid_: sitter, owner, holder

**Wing phase**:
The accumulated per-wing flap phase in radians, advanced each frame as `phase += wingFrequency * dt`. Each butterfly carries two wing phases (left and right). The flap itself is a UV-thin / UV-thick stretch of the wing region driven by `sin(wingPhase)`. The phase difference between left and right wings (`leftPhase - rightPhase`) is the source of per-frame turn rate — that difference is the steering input, replacing the koi's wander-angle model for butterflies. Frequencies and the per-side phase offset are jittered per butterfly at spawn.
_Avoid_: flap phase, wing angle

**Flight state**:
One of seven named states a butterfly occupies at a time: `FLYING_IDLE` (flapping in place, small drift on all axes, no target), `FLYING_CRUISE` (wander target + wing-phase steering toward it), `FLYING_TURN` (deliberate heading change to a new wander target), `APPROACH_FLOWER` (locked path to a specific flower anchor, wing phase still steers), `WAIT_AT_TAKEN_FLOWER` (position holds near the anchor, polls `occupant` for `null`), `SITTING` (on anchor, arc micro-motion, on-place turning, legs visible), `LIFTING_OFF` (scale lerps from sitting size to full, position at anchor, then transitions to `FLYING_CRUISE`). One state is active per butterfly; transitions are listed in the `Butterfly state machine` ADR.
_Avoid_: mode, phase (reserved for wave/fin/flap phase), status

**Sitting draw pass**:
The render pass that draws a roamer whose state is in the sitting cluster (`WAIT_AT_TAKEN_FLOWER`, `SITTING`, `LIFTING_OFF`). The sitting pass and the flying pass read from the same roamer runtime and the same shared `positions` array — they are two Skia draw calls selecting the same instance, gated by the runtime's current `flight state`. Position and angle are the same world coordinates across passes; switching which pass renders is a one-frame toggle with no coordinate hand-off. This is the layer-flip pattern that avoids the flicker seen when a koi moves between pool and bubble (where the position would otherwise re-anchor at the wrong coord for one frame).
_Avoid_: lower layer, sit pass, ground pass

**Leg phase**:
A per-leg accumulated phase, advanced each frame as `phase += legFrequency * dt`. Each butterfly carries six leg phases (3 per side). The body image is one PNG with all six legs baked in; the shader reveals each leg by a per-leg region mask whose bend amount is `sin(legPhase + legPhaseOffset)`. Leg phases advance only when the roamer is in `SITTING` and either arc-moving or on-place-turning; leg phases are held at zero (legs hidden) outside the sitting cluster and during the approach. The 6 legs step with a half-phase offset between the leg and its diagonal pair, producing a tripod gait.
_Avoid_: leg cycle, walk phase, stride

### Domain terms

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
An exercise where the learner transforms an infinitive while a full conjugation table is visible as WordSprites (undersea realisation: jellyfish); the solved form fills its matching table cell.
_Avoid_: table exercise, grid exercise, word transformation exercise

**Sentence transformation exercise**:
An exercise where the learner transforms an infinitive while a sentence prompt is visible as a row of WordSprites (undersea realisation: jellyfish); round resolution lands a word bubble in the blank-slot footprint, then the round exits and the next prompt appears.
_Avoid_: sentence exercise, fill-in-the-blank exercise

**Sentence prompt**:
A short contextual sentence tied to one table body cell, made of an ordered list of word tokens with exactly one blank slot where the conjugated form belongs. The blank slot is a position (`blankIndex`), not a token string — sparse tokens omit it.
_Avoid_: sentence, example sentence, fill-in-the-blank

**Blank slot**:
The single token position in a sentence prompt reserved for the conjugated form. Its layout footprint is fixed at round enter — from the word-bubble diameter in sentence transformation, or from the correct option WordSprite bell diameter in variant selection. A smaller highlighted WordSprite marked with `?` (about 70% of the footprint diameter) sits centered inside that footprint until it exits during resolve. After that exit, the sentence row no longer draws a WordSprite there — the landed word bubble or option WordSprite occupies the footprint through hold until it exits with the row.
_Avoid_: gap, placeholder, underline

**Variant selection exercise**:
An exercise where the learner selects the correct conjugated form from three option WordSprites (undersea realisation: jellyfish; one correct answer and two distractors) displayed below a sentence prompt with a blank slot. No letter manipulation — the learner taps a WordSprite to submit their choice. The selected WordSprite then flies to the blank slot position; distractors exit immediately along their remembered swim-in paths.
_Avoid_: multiple choice exercise, picker exercise, quiz

**Option WordSprite**:
A WordSprite that carries a conjugated form in the variant selection exercise. Three are shown per round: the correct form and two distractor forms from the same infinitive but different pronoun rows. They swim in from offscreen at round enter (same swim-path model as sentence token WordSprites) and sit in the option-zone below the sentence row. On correct selection the chosen one flies to the blank slot; on wrong selection it flashes red and the round waits for another tap. The undersea realisation renders these as jellyfish.
_Avoid_: option jellyfish, variant jellyfish, choice bubble, answer jellyfish

**Distractor forms**:
The two incorrect conjugated forms shown as distractors in a variant selection exercise round. Selected randomly from the same infinitive column, excluding the target pronoun row.
_Avoid_: wrong answers, decoys, foils

**Round**:
One cycle of the sentence transformation or variant selection exercise — from a sentence prompt appearing through solving the blank slot to the row leaving the screen before the next prompt.
_Avoid_: level, stage, turn

**Round resolution**:
The animated sequence after the last transformation operation succeeds: metaball merge, immediate swap to a word bubble that materializes (shell grows to full size) at the merge site, that bubble then flies to the blank-slot footprint while the blank WordSprite starts exiting early along its remembered entrance path using the shared row-swim duration (often still leaving after the bubble has landed), resolve completes when the word bubble lands, the landed word bubble holds in the footprint, that bubble pops, then the remaining token WordSprites exit along their remembered paths.
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
How the next round arrives after the previous round exits: each WordSprite (sentence tokens, blank slot, and option WordSprites in variant selection) swims in on its own linear path from an offscreen spawn point to its slot. In sentence transformation, the infinitive letter bubbles then inflate. Allowed spawn edges are orientation-gated — portrait: top/left/right (no bottom); landscape: top/bottom/right (no left) — so paths avoid the word-transformation zone. Spawn points are assigned in row order along those edges so trajectories do not cross; the blank slot gets a path like any other. All WordSprites start together and share one enter duration (different path lengths ⇒ different speeds); enter completes when the last arrives. Row exit mirrors that: remaining WordSprites start together, share one exit duration, and exit completes when the last has left; each retraces its entrance path (blank may reverse early during resolve and is not re-exited with the row). For variant selection, the two distractor option WordSprites that did not get selected exit immediately on correct selection. Paths are remembered for the round — a mid-round orientation change may reflow resting slot positions, but does not replan those paths until the next round. The first round of a session uses the same per-WordSprite swim-in.
_Avoid_: row transition, sentence intro

**Sentence row**:
The horizontal (or wrapped) layout of WordSprites showing one sentence prompt, placed in the WordSprite zone. Token WordSprites use per-slot rolled sizes; the blank slot reserves a footprint sized to the word bubble. One line when the sentence fits; longer sentences wrap to additional lines, with the block centered vertically in the zone.
_Avoid_: sentence bar, word strip, jellyfish line

**Decorative Roamer**:
Background Roamers that swim across the full screen without carrying words, accepting taps, or participating in capture or transformation. The undersea realisation renders these as koi fish.
_Avoid_: decorative koi, ambient koi, swimming decoration

**Word entry**:
A single Spanish–English translation pair (`spanish`, `english`). The atomic unit of vocabulary data, analogous to a body cell in conjugation tables.
_Avoid_: vocabulary item, flashcard, term

**Word list**:
A named collection of word entries (`id`, `title`, `words[]`) that serves as the dataset for word-learning exercises. Analogous to a `TableData` for conjugation exercises.
_Avoid_: vocabulary list, deck, word set

**Translation choice exercise**:
A word-learning exercise where the learner sees an English word as letter bubbles in the Roamer zone and selects the correct Spanish translation from three option WordSprites (undersea realisation: jellyfish) in the WordSprite zone. On correct selection the English bubbles pop and the Spanish word inflates in the same Roamer-zone position (a clean swap); all WordSprites exit simultaneously along their remembered swim-in paths.
_Avoid_: word variant selection, vocabulary quiz, translation picker

**Translation spelling exercise**:
A word-learning exercise where the learner sees an English word as letter bubbles and spells the Spanish translation letter-by-letter by tapping shuffled letter bubbles (including 2–3 distractor letters not present in the target word). Letters must be selected left-to-right; tapping any instance of a repeated letter counts as correct. On completion the remaining distractor letters pop, then the English word pops, then the spelled Spanish word pops.
_Avoid_: word transformation, letter spelling, type the word

**Translation match exercise**:
A word-learning exercise where the learner matches English words (carried by Roamers, undersea realisation: koi) to their Spanish translations (carried by WordSprites, undersea realisation: jellyfish) by capturing a Roamer in a bubble and tapping the corresponding WordSprite. Roamers and WordSprites free-roam the whole screen on separate layers and do not collide across species. Session-based: the field persists across match lifecycles; when the last pair has matched and exited, the fanfare plays and the scene goes empty (no auto-reload of a fresh field).
_Avoid_: match exercise, vocabulary match, pairing exercise, fish match

**Roaming target**:
The WordSprite movement model in the translation match exercise: a WordSprite picks a random target point inside the screen zone, swims toward it linearly, and on arrival picks a new one — a chained sequence of A→B swims. Distinct from the Roamer SWIMMING↔IDLE random-wander sim; gives WordSprites a calm drifting feel that pairs with their cosmetic deform-shader swim cycle. WordSprite-vs-WordSprite separation reuses the Roamer spatial-hash approach (overlap-weighted heading steer) without sharing the Roamer state machine.
_Avoid_: jellyfish wander, jellyfish idle swim, drifting jelly

**Capture bubble**:
The bubble that encloses a captured Roamer in the translation match exercise, showing the Roamer's English word as its label. Inflates at the Roamer's tap position, then travels with the creature inside to the screen center where it settles into idle. On a correct WordSprite match it pops (Escape burst) releasing the creature; on a tap of the bubble itself it pops (Release burst) releasing the creature back to the field. Inverts the table-exercise bubble, which shows the Spanish conjugated form. Renders above WordSprites (high z) so a tap on a spot where the bubble is always pops the bubble, even if a WordSprite is visually under it — the bubble keep-out disk exists to make that case rare.
_Avoid_: koi bubble, word bubble (reserved for round resolution), selection bubble

**Bubble keep-out disk**:
A circular region at the capture bubble's idle position (screen center) that WordSprites avoid while the bubble is active. Activated only when the capture bubble reaches idle — not during its inflate or travel phases. WordSprite roaming-target picking rejects points inside the disk, and separation adds a nudge if a WordSprite drifts in. Ensures WordSprites stay tappable (the bubble does not occlude them) while a Roamer is captured. Deactivates when the bubble pops.
_Avoid_: bubble exclusion zone, jellyfish avoidance area, bubble shield

**Match field**:
The set of Roamers and WordSprites on screen during a translation match exercise session. Strict 1:1 pairing: N Roamers (each carrying one English word) and N matching WordSprites (each carrying the corresponding Spanish word). No distractor WordSprites — every WordSprite on the field matches exactly one Roamer on the field. The field persists across match lifecycles; the session ends (fanfare, empty scene) when the last pair has exited.
_Avoid_: pool, word set, board, scene population

**Match session word pool**:
The source of words for a translation match exercise session: all four word lists (`animals`, `food`, `common-verbs`, `household`) merged into one 24-entry pool. Each session samples 8 distinct entries uniformly at random without replacement, with a guard rejecting any sample where two entries share the same Spanish or English string — so string-based matching (captured English → WordSprite Spanish) stays unambiguous and the 1:1 match field is preserved. Category blending is intentional — a session may mix animals, food, verbs, and household items.
_Avoid_: session deck, match word set, vocabulary pool

**Matched pair**:
The bookkeeping unit in the translation match exercise: a pair index links a Roamer to its matching WordSprite (1:1 per the match field). A pair is marked matched at resolve — the moment a correct WordSprite tap confirms the match — not after exit-pair completes. From that point the pair's Roamer and WordSprite are removed from the sim's movement, collision, and tap hit-tests; their exit animations run as purely cosmetic overlays. The field is cleared when every pair index is matched; the fanfare fires at the resolve of the last pair, before the last exit visuals have finished.
_Avoid_: completed pair, finished pair, resolved pair

**Match lifecycle**:
The per-pair sequence in the translation match exercise: `capture` (tap a Roamer → it is enclosed in a bubble showing its English word) → `select` (tap a WordSprite; correct = green glow, wrong = red glow) → `resolve` (bubble pops, creature and WordSprite released) → `exit-pair` (both leave the screen in a random direction and disappear). Multiple match lifecycles can interleave against the persistent field. Distinct from Round, which names the row-based cycle in round-based exercises.

On a correct match, resolve and exit-pair run as two independent escapes in parallel: the bubble pops (Escape burst, pop sound), the creature swims offscreen from the bubble's center position in its own random direction (directed-escape model), and the WordSprite freezes at its match position, glows green for ~800 ms (reusing the tint-flash preset), then swims offscreen in its own random direction. On a wrong match, the tapped WordSprite flashes red (~800 ms) and the lifecycle waits at `select` for another tap; the bubble stays, the keep-out disk stays active.
_Avoid_: round, turn, pair cycle, match cycle

**Translation choice round controller**:
The round lifecycle for translation choice: enter (English letter bubbles inflate, option WordSprites swim in), transform (user taps a WordSprite; wrong = red flash), resolve (English bubbles pop, Spanish word inflates, all WordSprites exit along remembered paths), hold (~3 s reading pause), exit (Spanish letter bubbles pop in cascade), advance (brief gap before next round).
_Avoid_: translation choice phases, choice lifecycle

**Translation spelling round controller**:
The round lifecycle for translation spelling: enter (English word inflates, shuffled letter bubbles appear), transform (user taps letters left-to-right; wrong = red wiggle; correct letters fly to the row below English), resolve (remaining distractor letters pop, English word pops, Spanish word pops in sequential cascade), exit (screen clears), advance (next round).
_Avoid_: spelling phases, typing lifecycle

**Word learning store config**:
A dedicated zustand store configuration (`WORD_LEARNING_STORE_CONFIG`) for word-learning exercises, separate from the conjugation exercise store configs. Word-learning exercises have no conjugation table or sentence row, so their tutorial flow and initial state differ.
_Avoid_: word transformation store config, shared store

**Translation distractor words**:
The two incorrect Spanish words shown as option WordSprites in translation choice. Drawn from other entries in the same word list, excluding the target entry. The word list must contain at least three entries for a valid round.
_Avoid_: wrong translations, decoy words, foil translations

**Translation direction**:
Word-learning exercises present English as the prompt and Spanish as the answer. The word entry model supports both directions but exercises are English → Spanish only.
_Avoid_: bidirectional translation, reverse translation

**Accented character identity**:
Accented characters (á, é, í, ó, ú, ñ, ü) are distinct letters in translation spelling — 'a' and 'á' do not match each other. The letter pool contains exact characters from the Spanish word and comparison is exact character match.
_Avoid_: accent-insensitive, normalized comparison

**Word prompt row**:
The English word displayed as letter bubbles in the Roamer zone for word-learning exercises. In translation spelling, the Spanish word being constructed appears directly below it in the same zone, both centered vertically. The shuffled letter pool sits in the WordSprite zone below.
_Avoid_: prompt display, English row, source word
