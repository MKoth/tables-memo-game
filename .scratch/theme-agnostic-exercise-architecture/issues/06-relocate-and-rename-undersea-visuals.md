Status: ready-for-agent
Parent: .scratch/theme-agnostic-exercise-architecture/PRD.md

## What to build

Relocate the undersea-specific visuals under a themes subtree and rename the role entities to generic names. This slice relocates the **entire remaining undersea subtree** (everything left after the generic core, shell, chrome, and mechanics were lifted out in earlier slices) into `exercises/themes/undersea/`, organised by generic role:

- Background → `exercises/themes/undersea/scenery`; shaders → `exercises/themes/undersea/shaders`; theme-specific image and sound sources → `exercises/themes/undersea/assets`.
- Jellyfish → **WordSprite** at `exercises/themes/undersea/carrier` (carrier layer, instances, table/option/sentence layers, visual tokens, tint presets, worklets).
- Koi → **Roamer** at `exercises/themes/undersea/roamer` (roamer layer, instances, simulation, bubble and capture components, escape coordination, capture bookkeeping).
- The theme-specific **core** pieces left behind earlier (concrete asset loaders, image manifests, sound assets, theme image/sound types, theme-specific layout vocabulary) → `exercises/themes/undersea/core` (and `assets/` for the `require(...)` manifests).
- The theme-specific **UI** pieces left behind earlier (the tutorial orchestrator, spotlight overlay, fish/jelly spotlights, guide lines, target pickers, spotlight visual constants; and the loading-screen backdrop) → `exercises/themes/undersea/ui`.
- The theme-specific **per-mechanic visual layers** left behind earlier — the word-transformation visuals (letter bubbles, variant picker, insert flight, word bubbles), the sentence-transformation visuals (sentence-row layer, merge layer, resolution bubble, merge bubbles), the variant-selection visuals (option layer, resolve flight), and the translation-match visuals (match WordSprite layer, match Roamer layer, match gestures/worklets) → `exercises/themes/undersea/exercises/<mechanic>/` (or distributed into `carrier/`/`roamer/` where they naturally belong). These are the theme's rendering of each mechanic.

The undersea-specific shader GLSL (koi/jellyfish/seafloor/seaweed/stone deform) keeps its undersea creature names — only the folder moves; the shader string literals are not renamed. The undersea Scenery's decor (seafloor, stones, seaweed canvases) keeps its undersea names as the concrete realisation of the Scenery role.

Every reference to the moved and renamed visuals is updated, including in the theme entry components. No behaviour, animation, or shader changes. After this step the undersea theme occupies `exercises/themes/undersea/` organised by generic role (carrier, roamer, scenery, shaders, assets, core, ui), the old `UnderseaTheme/` subtree is gone, and the build is green.

## Acceptance criteria

- [ ] Undersea visuals live under `exercises/themes/undersea/` in `carrier/`, `roamer/`, `scenery/`, `shaders/`, `assets/`, `core/`, `ui/`, and `exercises/` (per-mechanic visual layers).
- [ ] The jellyfish role is renamed **WordSprite** across the theme and all references (carrier folder and symbols).
- [ ] The koi role is renamed **Roamer** across the theme and all references (roamer folder and symbols).
- [ ] The background role is renamed **Scenery** as the folder and contract-facing name; undersea decor canvases keep undersea names.
- [ ] The theme-specific core pieces (asset loaders, manifests, theme image/sound types) land in `themes/undersea/core`/`assets`.
- [ ] The theme-specific UI pieces (tutorial, loading backdrop) land in `themes/undersea/ui`.
- [ ] The theme-specific per-mechanic visual layers (word-transformation bubbles, sentence-row + merge, option + resolve-flight, match layers + gestures) land under `themes/undersea/` (per-mechanic or in carrier/roamer).
- [ ] The old `UnderseaTheme/` subtree no longer exists.
- [ ] Shader GLSL string literals and undersea-specific shader file names keep their undersea creature names (not genericised).
- [ ] Every reference to the moved/renamed visuals across the codebase is updated.
- [ ] `npx tsc --noEmit` passes.
- [ ] `npm run lint` passes.
- [ ] `npm test` passes.

## Blocked by

- `.scratch/theme-agnostic-exercise-architecture/issues/05-generalise-bridge-and-tutorial-vocabulary.md`
