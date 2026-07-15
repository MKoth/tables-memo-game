Status: ready-for-agent
Parent: .scratch/theme-agnostic-exercise-architecture/PRD.md

## What to build

Today's `core/` is not cleanly theme-agnostic — it mixes generic machinery with theme-specific data and vocabulary. This slice **splits** it: lift the genuinely generic pieces into `exercises/core`, and leave the theme-specific pieces under the theme (a theme `core/` folder), stripping the `UnderseaTheme`/`Undersea` prefix only from the pieces that become generic.

The split is the implementer's call. Use the deletion test as the rule: **if moving a piece to the generic core would force the core to name a theme entity (a koi, a jellyfish, a seafloor), that piece stays in the theme.** Where a piece is borderline, prefer leaving it in the theme and exposing a generic interface to it from the generic core.

Pointers, grounded in the current code:

- **Theme-specific — leave under the theme (theme `core/` and/or `assets/`):** the asset manifests and loaders that hardcode undersea paths and image shapes (the image manifest with seafloor/stones/seaweed/koi/jellyfish/bubble, the sound asset manifest and volumes, the undersea image and sound *types*, and the hooks that load them); and the `AssetsProvider`'s concrete image type. These name undersea creatures and ship undersea PNGs — they cannot be generic.
- **Generic engine, theme-named vocabulary — split the engine from the names:** the layout engine (splitting the screen into two zones by orientation) is generic, but its zone names today (`koiRect`, `jellyRect`, "koi corner") are theme leaks. Move the engine to the generic core with generic zone names; the theme maps its entity names onto those zones. (The bridge types keep their current names here — they are generalised in a later slice.)
- **Genuinely generic — move to `exercises/core` with the prefix stripped:** clock (provider, throttled clock, FPS constant); store factory, provider, hook, and config types (the store *configs* are exercise-specific, not theme-specific — names unchanged); layout bounds, zone ratio constants, device orientation; runtime and layout providers; the word-transformation core bridge hook; the `loadSkiaImage` utility; and the asset *interface* (load phase, ready gate, progress) — the shape the theme's loader conforms to, not the undersea loader itself.

Symbols that move to the generic core are renamed from `UnderseaTheme*`/`Undersea*` to `Exercise*`: `computeExerciseLayout`, `ExerciseLayout`, `ExerciseOrientation`, `ExerciseClockProvider`, `useExerciseClock`, `EXERCISE_SCENE_CLOCK_FPS`, `ExerciseLayoutProvider`, `useExerciseLayout`, `ExerciseRuntimeProvider`, `useExerciseRuntime`, `ExerciseAssetsProvider`, `useExerciseAssetsContext`, `createExerciseStore`, `ExerciseStoreProvider`, `useExerciseStore`, `ExerciseStoreConfig`, `ExerciseState`, `ExerciseStore`. The `Undersea` prefix survives on the theme-specific pieces that stay behind. Every reference to the renamed/moved symbols — in the shell, the UI chrome, the exercise mechanics, the theme entry components, and the visual layers — is updated.

No behaviour changes. After this step the generic core no longer lives underneath a single theme, the theme-specific core pieces remain in the undersea subtree, and the build is green. The theme-specific core pieces are relocated into `themes/undersea/core`/`assets` in the visuals slice; here they just stay behind in the undersea subtree. They feed the `Theme` contract in a later slice.

## Acceptance criteria

- [ ] The genuinely generic core pieces (clock, store, layout engine and bounds/constants/orientation, runtime/layout providers, hooks, bridge types, `loadSkiaImage`, asset interface) live under `exercises/core`, not under the theme folder.
- [ ] No symbol in `exercises/core` carries an `UnderseaTheme`/`Undersea` prefix or names a theme entity (koi, jellyfish, seafloor, etc.); all use `Exercise*` / generic zone names.
- [ ] Theme-specific core pieces (concrete asset loaders, image manifests, sound assets, theme image/sound types, the `AssetsProvider` concrete image type, and any theme-specific layout vocabulary) stay under the theme in a theme `core/` (and/or `assets/`) folder.
- [ ] The layout engine exposes generic zone names; the theme's entity names map onto them (no `koiRect`/`jellyRect` in the generic core).
- [ ] Every reference to the renamed/moved symbols across the codebase is updated.
- [ ] The bridge types still compile under their current names (rename is a later slice).
- [ ] `npx tsc --noEmit` passes.
- [ ] `npm run lint` passes.
- [ ] `npm test` passes (only import-path or renamed-symbol references in tests change, if any; no behavioural expectations change).

## Blocked by

- `.scratch/theme-agnostic-exercise-architecture/issues/01-rename-folder-table-exercise-to-exercises.md`
