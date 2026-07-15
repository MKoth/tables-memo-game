Status: ready-for-agent

# Theme-agnostic exercise architecture

## Problem Statement

Every exercise visual today lives under a single `UnderseaTheme` bundle, and the whole feature folder is named `TableExercise`. The names bake the undersea metaphor into the architecture: `Jellyfish*`, `Koi*`, `UnderseaTheme*`, `seafloor`, `seaweed`. But the undersea cast is just one realisation of a set of roles — a floating word display, a roaming capturable creature, a scene background — that a different theme would recast (a rose for the word display, a bird for the roamer, a garden for the scenery). Because the generic roles have no names and no interface, there is no seam between the exercise *mechanics* (which are already theme-agnostic) and the theme *visuals*: the mechanics reach past a missing interface straight into undersea-named modules. Adding a second theme would mean duplicating the mechanics or threading undersea names through them.

From the maintainer's perspective: the folder is misnamed (`TableExercise` holds seven non-table exercises), the visual vocabulary is misnamed (no generic terms exist), and there is no contract stating what a theme must provide — so a future theme has nothing to extend and an agent has nothing to build against.

## Solution

Reorganise the feature into a **generic exercise framework** plus a **theme implementation** behind a `Theme` contract:

- Rename the `TableExercise` folder to `exercises` (it holds seven exercises, not just the table transformation exercise).
- Lift the already-theme-agnostic pieces out of `UnderseaTheme/` into the generic framework: the core (layout, clock, providers, store, bridge types, hooks), the shared exercise shell, the generic UI chrome (corner controls, instruction tooltip, instruction bar, drop panel, capture overlay host), and the **domains and hooks** of the seven exercise mechanics (word transformation, sentence transformation, variant selection, and the three word-learning exercises). The theme-specific UI — the tutorial (spotlight targets, spotlight rendering, copy) and the loading-screen backdrop — and each mechanic's **visual layers** (WordSprite/Roamer/bubble/merge rendering) stay under the theme and are supplied through the `Theme` contract.
- Introduce a `Theme` **interface** that lives **outside** the themes folder. The generic exercises program to this interface; a theme is an adapter that implements it.
- Move the undersea-specific visuals under `exercises/themes/undersea/`, renaming the role entities to generic names: the jellyfish becomes the **WordSprite**, the koi becomes the **Roamer**, the background becomes the **Scenery**. The undersea realisations (koi shaders, seafloor, seaweed, stones) stay undersea-specific inside that theme.
- Strip the `UnderseaTheme` prefix from every generic-framework symbol (clock provider, layout, store, providers, shell) so the framework speaks in `Exercise*` terms; the `Undersea` prefix survives only on the theme's own concrete pieces.
- Rename the bridge types — the existing seam between mechanics and visuals — to generic names (`WordSpriteLayoutBridge`, `RoamerSimBridge`, `RoamerCaptureBridge`). The theme's visual layers adapt to these bridges.
- Update the domain glossary (`CONTEXT.md`) with the generic vocabulary and reframe the undersea terms as the concrete realisation of the generic roles.
- Write a **theme-structure guide** that codifies the `Theme` contract and what a theme must provide, so a future theme (or an agent) can be built against it.
- Record the decision as an ADR.

No exercise behaviour, animation, or timing changes. This is a structural rename-and-move plus one new interface.

## User Stories

1. As a maintainer, I want the feature folder renamed from `TableExercise` to `exercises`, so that the name reflects that it holds seven exercises and not only the table transformation exercise.
2. As a maintainer, I want the seven public exercise entry components to keep their mechanic names and live under `exercises/`, so that the public API stays stable and recognisable.
3. As a maintainer, I want the app's dev switch and entry wiring updated to import from the new `exercises/` location, so that the app still builds and runs after the rename.
4. As a maintainer, I want the generic core (layout, clock, providers, store, bridge types, hooks) lifted out of the theme folder into the generic framework, so that the framework no longer lives underneath a single theme.
4a. As a maintainer, I want theme-specific core pieces (concrete asset loaders, image manifests, sound assets, theme image/sound types, theme-specific layout vocabulary) to stay under the theme in a theme `core/` folder, so that the generic core never names a theme entity.
4b. As an implementer, I want pointers in the plan for how to decide what is generic versus theme-specific in today's mixed `core/`, so that I can split it without forcing theme names into the generic core.
5. As a maintainer, I want the `UnderseaTheme` prefix stripped from every generic-framework symbol, so that the framework speaks in `Exercise*` terms and does not name a theme it does not depend on.
6. As a maintainer, I want the layout module renamed to a generic exercise layout (`computeExerciseLayout`, `ExerciseLayout`, `ExerciseOrientation`), so that layout is theme-agnostic.
7. As a maintainer, I want the clock module renamed to a generic exercise clock (`ExerciseClockProvider`, `useExerciseClock`, `EXERCISE_SCENE_CLOCK_FPS`), so that the scene clock is theme-agnostic.
8. As a maintainer, I want the store module renamed to a generic exercise store (`createExerciseStore`, `ExerciseStoreProvider`, `useExerciseStore`, `ExerciseStoreConfig`, `ExerciseState`), so that state management is theme-agnostic.
9. As a maintainer, I want the providers renamed to generic exercise providers (`ExerciseLayoutProvider`, `ExerciseRuntimeProvider`, `ExerciseAssetsProvider`), so that the provider tree is theme-agnostic.
10. As a maintainer, I want the shared shell renamed to a generic `ExerciseShell`, so that every exercise is mounted through a theme-agnostic shell.
11. As a maintainer, I want the exercise shell to obtain its assets through the `Theme` contract rather than importing the undersea asset loader directly, so that a different theme can supply its own assets.
12. As a maintainer, I want the loading screen to become a generic exercise loading screen that takes theme-provided placeholder visuals, so that the loading state is theme-agnostic.
13. As a maintainer, I want the instruction chrome (instruction bar, corner controls, tutorial spotlight) to be generic exercise UI, so that tutorials are theme-agnostic.
13a. As a maintainer, I want the generic UI chrome (drop panel, instruction tooltip, help/sound buttons, corner controls, instruction bar, capture overlay host) lifted to the generic framework, so that the reusable chrome does not live under a single theme.
13b. As a maintainer, I want the theme-specific tutorial (spotlight targets, spotlight rendering, tutorial copy) to stay under the theme and be supplied through the Theme contract, so that the generic UI never names a theme creature or ships theme copy.
13c. As a maintainer, I want the loading-screen backdrop to stay theme-specific while the progress bar and layout math stay generic, so that the loading skeleton is reusable but each theme shows its own scene.
13d. As a maintainer, I want the generic chrome to accept theme style overrides (palette, spotlight scales), so that a theme can restyle the chrome without owning it.
13e. As a maintainer, I want the tutorial to follow a generic-skeleton-plus-overrides model (generic step state, tooltip shell, dim overlay; theme-supplied spotlights, targets, copy), so that tutorial behaviour is reusable while tutorial look is per-theme.
14. As a maintainer, I want a `Theme` interface defined outside the themes folder, so that the generic exercises depend on an interface and not on a concrete theme.
15. As a maintainer, I want the `Theme` interface to declare the visual members a theme must provide (scenery, word-sprite layers, roamer layer, capture overlay, asset hook, shaders, layout config, sound controller), so that a theme is a complete, self-describing adapter.
16. As a maintainer, I want the undersea visuals moved under `exercises/themes/undersea/` and organised into `carrier/`, `roamer/`, `scenery/`, `shaders/`, and `assets/`, so that the undersea theme is one implementation among possible many.
17. As a maintainer, I want the jellyfish role renamed to **WordSprite** across the theme and all references, so that the floating word-display role has a generic name (a rose in another theme is also a WordSprite).
18. As a maintainer, I want the koi role renamed to **Roamer** across the theme and all references, so that the roaming capturable-creature role has a generic name (a bird in another theme is also a Roamer).
19. As a maintainer, I want the background role renamed to **Scenery** as a folder and contract member, so that the scene-background role has a generic name.
20. As a maintainer, I want the bridge types renamed to `WordSpriteLayoutBridge`, `RoamerSimBridge`, `RoamerCaptureBridge`, and `RoamerRuntimePosition`, so that the seam between mechanics and visuals speaks in generic role names.
21. As a maintainer, I want the `TutorialStep` values renamed from `fish`/`jellyfish` to `roamer`/`wordSprite`, so that the tutorial state machine speaks in generic role names.
22. As a maintainer, I want the undersea-specific shaders (koi deform, jellyfish deform, seafloor, seaweed, stone, metaball, bubble, sprite shadow) to stay as undersea-specific files under the theme, so that concrete visuals are not prematurely genericised.
23. As a maintainer, I want the undersea-specific assets (seafloor, stone, seaweed images and the sound set) to stay as undersea-specific files under the theme, so that a theme owns its own assets.
24. As a maintainer, I want the generic sound controller interface kept in the framework while the undersea theme supplies the concrete sounds, so that the exercises program to a sound interface and the theme provides the implementation.
25. As a maintainer, I want the word-transformation mechanic (shared core, letter bubbles, variant picker, insert flight) kept theme-agnostic and moved under the generic framework, so that ADR-0001's shared core stays the test surface.
26. As a maintainer, I want the sentence-transformation mechanic (round controller, swim-path planner, metaball merge, sentence row display) kept theme-agnostic and moved under the generic framework, so that the round lifecycle stays the test surface.
27. As a maintainer, I want the variant-selection mechanic (round controller, distractor selection) kept theme-agnostic and moved under the generic framework, so that the option-selection lifecycle stays the test surface.
28. As a maintainer, I want the three word-learning mechanics (translation choice, translation spelling, translation match) kept theme-agnostic and moved under the generic framework, so that the word-learning lifecycles stay the test surface.
28a. As a maintainer, I want each mechanic's domain and hooks lifted to the generic framework while its visual layers (WordSprite/Roamer/bubble/merge rendering) stay under the theme, so that the generic mechanics do not depend on a concrete theme's visuals.
28b. As a maintainer, I want the shared `VariantPickerItem` type relocated to a theme-agnostic location, so that a lifted hook does not import a theme visual component.
28c. As a maintainer, I want the theme's per-mechanic visual layers (word-transformation bubbles, sentence-row layer, option layer, match layers, round-resolution merge) supplied through the Theme contract, so that each exercise renders via the theme adapter.
29. As a maintainer, I want the translation-match capture orchestration forks to remain forks (per ADR-0002), only renamed to Roamer terms, so that the fork decision is preserved and not re-litigated.
30. As a maintainer, I want the domain glossary (`CONTEXT.md`) updated with the generic vocabulary (WordSprite, Roamer, Scenery, Theme, ExerciseShell, ExerciseCore), so that the ubiquitous language names the roles, not the undersea realisation.
31. As a maintainer, I want the existing undersea terms in `CONTEXT.md` reframed as the undersea realisation of the generic roles (a jellyfish is the undersea WordSprite; a koi is the undersea Roamer; the seafloor is the undersea Scenery), so that the glossary stays accurate after the rename.
32. As a maintainer, I want a theme-structure guide document that describes the required structure of a theme and the `Theme` contract members, so that a future theme or an agent can be built against a written spec.
33. As a maintainer, I want the theme-structure guide referenced from the engineering docs, so that it is discoverable when someone adds a theme.
34. As a maintainer, I want the architecture section of the engineering notes updated to reflect the new `exercises/` + `themes/undersea/` layout and the generic vocabulary, so that onboarding docs do not point at the old structure.
35. As a maintainer, I want the theme-agnostic reorganisation recorded as an ADR, so that future architecture reviews do not re-suggest it and the rename rationale is preserved.
36. As a maintainer, I want the existing ADR-0001 and ADR-0002 cross-referenced to the new role names (WordSprite/Roamer) without editing their recorded decisions, so that the history stays accurate to when it was written while the current names are discoverable.
37. As an agent implementer, I want the existing domain test suite to pass unchanged after the refactor, so that I have a regression net proving behaviour was preserved.
38. As an agent implementer, I want a Theme-contract conformance test that asserts the undersea theme bundle satisfies the `Theme` interface, so that the new seam is guarded.
39. As an agent implementer, I want typecheck and lint to pass after the rename, so that the mechanical rename is verified to be complete.
40. As a learner, I want the exercises to look and behave exactly as before, so that the refactor is invisible to me.
41. As a future theme author, I want to be able to add a second theme by implementing the `Theme` interface alone, so that I never duplicate exercise mechanics.
42. As a future theme author, I want the theme-structure guide to list every member my theme must provide, so that I get compile-time guidance rather than runtime surprises.

## Implementation Decisions

### Target structure

The feature reorganises from one `TableExercise/UnderseaTheme/` tree into a generic framework plus a themes subtree. Conceptually:

- `exercises/` — the generic framework and public entry components.
  - The seven public exercise entry components (table transformation, word transformation, sentence transformation, variant selection, translation choice, translation spelling, translation match) as thin wrappers.
  - `core/` — the **generic** core: the theme-agnostic pieces of today's core (clock, store, layout engine and types, runtime/layout providers, hooks, bridge types, the `loadSkiaImage` utility, and the asset *interface* — load phase, ready gate, progress). See "Core split" below for what stays out of it.
  - `shared/` — the generic `ExerciseShell`.
  - `ui/` — the **generic** UI chrome skeleton: corner controls (help/sound buttons), instruction tooltip, instruction bar, drop panel, capture overlay host, positioning helpers, and the generic z-index/size constants. No theme entity names, no theme copy, no theme palette.
  - The seven exercise mechanics (`wordTransformation/`, `sentenceTransformation/`, `variantSelection/`, `wordLearning/{translationChoice,translationSpelling,translationMatch}/`) — their **domains and hooks** lifted out of the theme, kept as-is in name. Each mechanic's **visual layers** stay under the theme and are supplied through the contract.
  - `themeContract` — the `Theme` interface, defined **outside** the `themes/` folder.
  - `themes/undersea/` — the undersea theme implementation.
    - `core/` — the **theme-specific** core: concrete asset loaders, image manifests, sound assets, the theme's image/sound types, and any theme-specific layout vocabulary mapping. A theme may carry its own `core/` for pieces that name theme entities and therefore cannot live in the generic core.
    - `carrier/` — the undersea WordSprite (was jellyfish).
    - `roamer/` — the undersea Roamer (was koi).
    - `scenery/` — the undersea Scenery (was background: seafloor, stones, seaweed).
    - `shaders/` — undersea-specific Skia shaders.
    - `assets/` — undersea-specific image and sound sources (the `require(...)` manifests). The loaders that consume them live in the theme `core/`.
    - `ui/` — the **theme-specific** UI overrides: the tutorial (spotlight targets, spotlight rendering, tutorial copy) and the loading-screen backdrop, plus any theme style overrides on the generic chrome (palette, spotlight scales). These are supplied through the `Theme` contract as overrides on the generic skeleton.
    - `exercises/` — the **theme-specific per-mechanic visual layers**: each exercise's WordSprite/Roamer/bubble/merge rendering (the sentence-row layer, option layer, match layers, word-transformation bubbles, round-resolution merge). These are the theme's rendering of each mechanic, supplied through the `Theme` contract.
    - The undersea theme bundle that implements the `Theme` interface.

### Core split (generic core vs theme core)

Today's `core/` is not cleanly theme-agnostic — it mixes generic machinery with theme-specific data and vocabulary. The implementer splits it, guided by the deletion test: **if moving a piece to the generic core would force the core to name a theme entity (a koi, a jellyfish, a seafloor), that piece stays in the theme.** Pointers, grounded in the current code:

- **Theme-specific — stays under the theme** (a theme `core/` and/or `assets/`):
  - The asset manifests and loaders that hardcode undersea paths and image shapes — the image manifest (seafloor, stones, seaweed, koi, jellyfish bell/tentacles, bubble), the sound asset manifest and volumes, the undersea image/sound *types*, and the hooks that load them. These name undersea creatures and ship undersea PNGs; they cannot be generic.
  - The `AssetsProvider`'s concrete image type — the provider's *context interface* can be generic (images + sounds supplied via the contract), but the typed image bundle is theme-specific.
- **Generic engine, theme-named vocabulary — split the engine from the names:**
  - The layout engine (splitting the screen into two zones by orientation) is generic; its zone names today (`koiRect`, `jellyRect`, "koi corner") are theme leaks. The engine moves to the generic core with generic zone names; the theme maps its entity names onto those zones, or the contract exposes the generic zone names that the theme's visuals consume.
- **Genuinely generic — moves to `exercises/core` with the prefix stripped:**
  - Clock (provider, throttled clock, FPS constant).
  - Store factory, provider, hook, and config types (the store *configs* are exercise-specific, not theme-specific — unchanged).
  - Layout bounds, zone ratio constants, device orientation.
  - Runtime and layout providers.
  - The word-transformation core bridge hook.
  - Bridge types (renamed to generic role names in a later slice).
  - The `loadSkiaImage` utility.
  - The asset *interface* (load phase, ready gate, progress) — the shape the theme's loader conforms to, not the undersea loader itself.

The split is the implementer's call; the pointers above are guidance, not a prescription. Where a piece is borderline, prefer leaving it in the theme and exposing a generic interface to it from the generic core — that keeps the generic core free of theme entity names. The theme-specific core pieces feed the `Theme` contract in the contract slice.

### UI split (generic chrome skeleton vs theme overrides)

Today's `ui/` mixes generic chrome with theme-specific tutorial and loading, the same way `core/` mixes generic machinery with theme-specific data. Split it with the same deletion test: **if moving a piece to the generic UI would force it to name a theme entity, use theme copy, or bake in a theme palette, that piece stays in the theme.** Pointers, grounded in the current code:

- **Generic chrome — moves to `exercises/ui` with the prefix stripped:** the drop panel, the instruction tooltip, the help/sound buttons and sound icon, the corner-controls cluster, the transformation instruction bar, the capture overlay host (a thin container that renders a theme-supplied overlay node), the positioning helpers, and the generic z-index/size constants. These depend only on the store and the generic layout zones.
- **Theme-specific tutorial — stays under the theme (`themes/undersea/ui`):** the tutorial orchestrator (it reads the koi/jelly bridges, picks fish/jelly spotlight targets, and emits theme copy like "Tap any fish…"), the spotlight overlay and its fish/jelly spotlight components and guide lines, the target pickers, and the spotlight visual constants (scales, the undersea blue palette). These name theme creatures and ship undersea styling.
- **Theme-specific loading — stays under the theme:** the loading screen's backdrop is the undersea scene (seafloor/stones/seaweed). The progress bar and layout math are generic; the backdrop visual is theme-specific.

The theme supplies its tutorial and loading-backdrop pieces through the `Theme` contract as **overrides on a generic skeleton**: the generic framework owns the tutorial step state, the tooltip shell, the dim overlay, and the loading progress bar; the theme supplies the spotlight targets, the spotlight rendering, the tutorial copy, the loading backdrop, and any style overrides on the chrome (palette, spotlight scales). This keeps the chrome reusable across themes while letting a theme restyle and retarget the tutorial. (The `TutorialStep` value names are generalised in an earlier slice; the tutorial *rendering* and *copy* stay theme-specific.)

### Mechanic split (generic domain vs theme visual layer)

Each exercise mechanic folder today mixes a theme-agnostic **domain** with a theme-specific **visual layer**, the same way `core/` and `ui/` do. Split it with the deletion test: **if moving a piece to the generic mechanic would force it to import a theme visual (a WordSprite/Roamer layer, a bubble component, an undersea shader, a theme asset), that piece stays in the theme.** Pointers, grounded in the current code:

- **Theme-agnostic — lifts to `exercises/<mechanic>/`:** every `domain/` (round controllers, distractor selectors, timing, types, validators, the word-transformation shared core), every `hooks/` (the game orchestrators that consume the bridges, the core, the store, and the domain), and the pure helpers (`letterCascade`, `insertAnimationTiming`, `shuffleIndices`, `swimPathPlanner`, `sentenceRowDisplay`). These depend only on the bridges and the generic core. `translationChoice` and `translationSpelling` have only domain + hooks — they lift wholesale.
- **Theme-specific — stays under the theme (relocated in the visuals slice):** each mechanic's visual layers. The word-transformation visuals (`LetterBubble`, `TransformationBubbleLayer`, `TransformationInsertFlight`, `TransformationVariantPicker`, `TransformationWordBubbles` — `LetterBubble` imports the roamer's `BubbleInstance`); the sentence-transformation visuals (`JellyfishSentenceRowLayer`, `TransformationMergeBubbles`, `TransformationRoundResolutionBubble`, and the `merge/` layer which imports the undersea `metaballMerge` and `bubbleDeform` shaders); the variant-selection visuals (`OptionJellyfishLayer`, `VariantSelectionResolveFlight`); and the translation-match visuals (`MatchJellyfishLayer`, `MatchKoiLayer`, and the match `jellyfish/` worklets and gestures). These render WordSprites/Roamers/bubbles and use undersea shaders — they are the theme's rendering of each mechanic.
- **One shared-type coupling to fix:** the sentence-transformation hook imports a `VariantPickerItem` type from the word-transformation visual component. Relocate that shared type to a theme-agnostic location (e.g. the word-transformation domain types) so the lifted hook does not depend on a theme visual layer.

The theme's per-mechanic visual layers are supplied through the `Theme` contract (expanded below). The deletion test passes — a generic mechanic that imported its visual layer would force the generic framework to depend on a concrete theme, concentrating theme coupling back into the mechanics.

### The Theme interface (the new seam)

A `Theme` interface is introduced outside the themes folder. The generic exercises depend only on this interface; a theme is an adapter that supplies:

- A **Scenery** component (the scene background).
- **WordSprite** layer components for each layout the exercises need: the table-cell layer (table transformation), the sentence-row layer (sentence transformation), the option/variant layer (variant selection), and the match WordSprite layer (translation match).
- A **Roamer** layer component and the **capture overlay** content for the match exercise (the match Roamer layer, match gestures, and capture bookkeeping).
- The **word-transformation visual layer** (letter bubbles, variant picker, insert flight, word bubbles) — the theme's rendering of the shared word-transformation mechanic.
- The **round-resolution visuals** (the metaball merge layer, the resolution bubble, the merge bubbles, the variant-selection resolve flight) — the theme's rendering of round resolution, including the undersea merge shader.
- A `useThemeAssets` hook returning load phase, images, sounds, progress, and placeholder visuals for the loading screen.
- The theme's shader bundle.
- The theme's layout configuration (zone ratios) and sound controller implementation.
- **Tutorial overrides** on the generic skeleton: spotlight target pickers, spotlight rendering, and per-step tutorial copy.
- **Loading overrides** on the generic skeleton: the loading-screen backdrop visual.
- **Chrome style overrides** (optional): palette and spotlight-scale constants the generic chrome reads from the theme so a theme can restyle the chrome without owning it.

This deepens a currently shallow module: today the "UnderseaTheme" bundle has no interface — the mechanics import its concrete parts directly. After the change, the mechanics program to the `Theme` interface and the undersea bundle is a thin adapter behind it. The deletion test passes — deleting the interface would concentrate theme coupling back into the mechanics. The bridge types (`WordSpriteLayoutBridge`, `RoamerSimBridge`, `RoamerCaptureBridge`) are the load-bearing seam the visuals adapt to; this PRD generalises their names, not their shape.

### Naming map (generic vocabulary)

- Jellyfish → **WordSprite** (the floating word-display role). Applies to the theme's carrier layer, instances, table/option/sentence layers, visual tokens, tint presets, and worklets. Excludes the undersea-specific deform shader GLSL, which stays named for the undersea creature it depicts.
- Koi → **Roamer** (the roaming capturable-creature role). Applies to the theme's roamer layer, instances, simulation, bubble/capture components, escape coordination, and the capture-overlay bookkeeping. Excludes the undersea-specific deform shader GLSL.
- Background → **Scenery** (folder and contract member). The undersea concrete pieces (seafloor, stones, seaweed) keep their undersea names as the undersea Scenery's decor.
- `UnderseaTheme*` framework symbols → `Exercise*`: `computeExerciseLayout`, `ExerciseLayout`, `ExerciseOrientation`, `ExerciseClockProvider`, `useExerciseClock`, `EXERCISE_SCENE_CLOCK_FPS`, `ExerciseLayoutProvider`, `useExerciseLayout`, `ExerciseRuntimeProvider`, `useExerciseRuntime`, `ExerciseAssetsProvider`, `useExerciseAssetsContext`, `createExerciseStore`, `ExerciseStoreProvider`, `useExerciseStore`, `ExerciseStoreConfig`, `ExerciseState`, `ExerciseStore`, `ExerciseShell`, `ExerciseLoadingScreen`, `ExerciseInstructions`, `ExerciseCornerControls`.
- Bridge types: `JellyfishLayoutBridge` → `WordSpriteLayoutBridge`; `KoiSimBridge` → `RoamerSimBridge`; `KoiCaptureBridge` → `RoamerCaptureBridge`; `KoiFishRuntimePosition` → `RoamerRuntimePosition`.
- `TutorialStep` values: `fish` → `roamer`, `jellyfish` → `wordSprite` (`idle` and `translate` unchanged).
- The `Undersea` prefix survives only on the theme's own concrete pieces (the theme bundle, the undersea Scenery's seafloor/seaweed/stone canvases, the undersea-specific shaders, the undersea asset loaders).

### What stays theme-agnostic (lifted, not changed in behaviour)

- The seven exercise mechanics and their domains, round controllers, and round-resolution timing.
- The word-transformation shared core (ADR-0001) — the interface stays the test surface.
- The translation-match capture orchestration forks (ADR-0002) — kept as forks, renamed to Roamer terms, not merged.
- The store configs (`TABLE_EXERCISE_STORE_CONFIG`, `WORD_TRANSFORMATION_STORE_CONFIG`, `WORD_LEARNING_STORE_CONFIG`) — these are exercise-specific, not theme-specific; names unchanged.
- Layout zone constants and orientation handling — theme-agnostic, only the `Undersea` prefix is stripped.

### Asset and sound split

The generic framework owns the asset *interface* (load phase, ready gate, sound controller shape). The undersea theme owns the concrete images and sounds — they live in the theme `core/`/`assets/` — and supplies a `useThemeAssets` hook through the contract. The `ExerciseShell` consumes assets via the contract instead of importing the undersea loader. The loading screen takes theme-provided placeholder visuals so it does not depend on undersea image shapes. See "Core split" for the boundary between the generic asset interface and the theme's concrete loaders.

### Documentation deliverables

- `CONTEXT.md` gains the generic vocabulary (WordSprite, Roamer, Scenery, Theme, ExerciseShell, ExerciseCore) and reframes the existing undersea terms as the undersea realisation of those roles.
- A theme-structure guide document codifies the `Theme` contract and the required members and folder layout of a theme.
- The architecture section of the engineering notes is updated to the new layout and vocabulary.
- An ADR records the theme-agnostic reorganisation and the WordSprite/Roamer/Scenery naming. ADR-0001 and ADR-0002 are cross-referenced (not edited) so their old role names map to the new ones.

### Risk and execution notes

- The rename touches roughly 150 files. Mitigation: directory moves preserve history; identifier renames are scoped and exclude `.sksl.ts` shader string literals; typecheck, lint, and the domain test suite are run in a loop until green.
- No behaviour change is intended; any test expectation that must change is a naming-only change (e.g. a `TutorialStep` value), not a behavioural one.

## Testing Decisions

- **A good test asserts external behaviour through a seam, not implementation detail.** This refactor preserves behaviour, so the existing domain tests are the primary regression net and should pass with naming-only expectation updates where a renamed enum value is asserted.
- **Primary seam (existing, highest):** the existing domain test suite — round controllers tested via an injected `scheduleTimer` and `jest.fn()` callbacks, the word-transformation core, distractor selectors, layout, swim-path planner, merge layout, session controller, letter pool, and letter match. These already exercise the mechanics through their public interfaces and are the highest seams available; they must remain green.
- **New seam (one, at the theme-bundle boundary):** a Theme-contract conformance test. It imports the undersea theme bundle and asserts it satisfies the `Theme` interface at compile time (TypeScript) and at runtime exposes the required members (scenery, word-sprite layers, roamer layer, capture overlay, `useThemeAssets`, shaders, layout config, sound controller). Prior art for a bundle-level test is the existing visual-tokens test; the conformance test is otherwise new and is the only new seam introduced.
- No new React-Native render harness is introduced. Component render behaviour is already covered indirectly by the domain seams; mounting the full Skia/Reanimated tree is out of scope for this refactor's tests.
- **Verification gates:** `npx tsc --noEmit`, `npm run lint`, and `npm test` must all pass after the rename.

## Out of Scope

- Implementing a second theme (e.g. a garden theme with a rose WordSprite and a bird Roamer). This PRD only introduces the contract and moves the undersea theme behind it.
- Changing any exercise behaviour, animation, timing, or round lifecycle.
- Renaming the exercise *mechanic* names (word transformation, sentence transformation, variant selection, translation choice/spelling/match). They stay; only their location and any `Undersea`/role prefix change.
- Genericising the undersea shader GLSL (koi/jellyfish/seafloor/seaweed/stone deform). Shaders stay undersea-specific under the theme.
- Changes to the data layer (word lists, table data, sentence prompts).
- Re-litigating ADR-0001 (shared word-transformation core) or ADR-0002 (fork koi capture for translation match). Both decisions stand; only role names are generalised.
- Merging the translation-match capture forks back into the table-exercise capture hooks (ADR-0002 explicitly defers this until a third consumer appears).
- A new React-Native render-level test harness.

## Further Notes

- The bridges are the real seam and predate this PRD: ADR-0001 already treats the transformation interface as the test surface. The `Theme` interface extends that same principle to the visual layer — the mechanics program to an interface, the theme adapts to it.
- ADR-0002 forks the koi capture orchestration for translation match. After this rename those become Roamer capture forks. The fork stands (only two consumers); do not merge during this refactor.
- The theme-structure guide should be written so an agent could build a second theme against it without reading the undersea source — listing every contract member, its responsibility, and the zone/layout expectations the mechanics assume.
- Suggested ADR number: 0003 — "Theme-agnostic exercise architecture".
