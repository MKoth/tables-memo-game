Status: ready-for-agent
Parent: .scratch/theme-agnostic-exercise-architecture/PRD.md

## What to build

Introduce the `Theme` interface — the seam the generic exercises program to — defined **outside** the `themes/` folder. The interface declares the visual members a theme must provide: a Scenery component; the WordSprite layer components for each layout the exercises need (the table-cell layer for table transformation, the sentence-row layer for sentence transformation, the option/variant layer for variant selection, and the match WordSprite layer for translation match); a Roamer layer and capture overlay content for the match exercise (the match Roamer layer, match gestures, capture bookkeeping); the word-transformation visual layer (letter bubbles, variant picker, insert flight, word bubbles) — the theme's rendering of the shared word-transformation mechanic; the round-resolution visuals (the metaball merge layer, the resolution bubble, the merge bubbles, the variant-selection resolve flight) — the theme's rendering of round resolution; a `useThemeAssets` hook (returning load phase, images, sounds, progress, and placeholder visuals for the loading screen); the theme's shader bundle; the theme's layout configuration; and the theme's sound controller implementation.

It also declares the **theme-specific UI overrides on a generic skeleton**: tutorial overrides (spotlight target pickers, spotlight rendering, and per-step tutorial copy — the generic framework owns the tutorial step state, tooltip shell, and dim overlay), loading overrides (the loading-screen backdrop visual — the generic framework owns the progress bar and layout math), and optional chrome style overrides (palette and spotlight-scale constants the generic chrome reads from the theme so a theme can restyle the chrome without owning it).

Build the undersea theme bundle: move the seven exercise entry components and the theme index into `exercises/themes/undersea/` and shape them as an adapter that implements the `Theme` interface, now referencing the renamed WordSprite/Roamer/Scenery pieces, the per-mechanic visual layers, and the undersea tutorial/loading/chrome overrides. Wire `ExerciseShell` and the seven mechanics to consume scenery, word-sprite layers, the roamer layer, the word-transformation visual layer, the round-resolution visuals, assets, sounds, the tutorial, and the loading backdrop through the `Theme` contract instead of importing the undersea loaders and UI directly; the generic loading screen takes theme-provided placeholder visuals, and the generic tutorial renders theme-supplied spotlights and copy. The generic framework owns the asset/sound interface, the chrome skeleton, and the mechanic domains/hooks; the undersea theme owns the concrete images, sounds, the per-mechanic visual layers, and the tutorial/loading/chrome overrides, and supplies them via the contract.

Add a Theme-contract conformance test that imports the undersea theme bundle and asserts it satisfies the `Theme` interface at compile time and exposes the required members at runtime (including the tutorial, loading, and chrome-override members). This is the only new test seam introduced. No exercise behaviour changes. After this step the mechanics depend on the `Theme` interface rather than on a concrete theme, the undersea bundle is a thin adapter behind it, and the build is green.

## Acceptance criteria

- [ ] A `Theme` interface exists outside the `themes/` folder and declares scenery, the per-exercise WordSprite layers (table-cell, sentence-row, option/variant, match), the roamer layer + capture overlay, the word-transformation visual layer, the round-resolution visuals, `useThemeAssets`, shaders, layout config, sound controller, tutorial overrides, loading overrides, and chrome style overrides.
- [ ] The seven exercise entry components and theme index live under `exercises/themes/undersea/` as a bundle implementing `Theme`.
- [ ] `ExerciseShell` and the seven mechanics consume scenery, word-sprite layers, the roamer layer, the word-transformation visual layer, the round-resolution visuals, assets, sounds, the tutorial, and the loading backdrop through the `Theme` contract, not by importing the undersea loaders or UI directly.
- [ ] The generic tutorial renders theme-supplied spotlights, target pickers, and copy on a generic step-state/tooltip/dim-overlay skeleton.
- [ ] The generic loading screen renders theme-provided backdrop visuals on a generic progress-bar skeleton.
- [ ] The generic chrome reads theme style overrides (palette, spotlight scales) where applicable.
- [ ] The generic framework owns the asset/sound interface, the chrome skeleton, and the mechanic domains/hooks; the undersea theme supplies concrete images, sounds, the per-mechanic visual layers, and tutorial/loading/chrome overrides via the contract.
- [ ] A Theme-contract conformance test exists and passes, asserting the undersea bundle satisfies `Theme` (compile time) and exposes the required members including the per-mechanic visual layers, tutorial/loading/chrome overrides (runtime).
- [ ] `npx tsc --noEmit` passes.
- [ ] `npm run lint` passes.
- [ ] `npm test` passes (existing domain suites green; new conformance test green).

## Blocked by

- `.scratch/theme-agnostic-exercise-architecture/issues/06-relocate-and-rename-undersea-visuals.md`
