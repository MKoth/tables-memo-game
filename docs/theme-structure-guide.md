# Theme structure guide

A theme is a visual adapter that implements the `Theme` interface and supplies all theme-specific visuals to the generic exercise framework. The exercise mechanics program to the `Theme` interface; a theme is the only place that names concrete visual creatures.

This guide describes the required structure of a theme so a future theme author or agent can build one without reading the undersea source.

## The Theme interface

Defined in `components/exercises/themeContract/Theme.ts`. The interface declares every member a theme must provide. A theme is an object that satisfies this type.

### Required members

#### `scenery`
- **Type:** `ComponentType`
- **Responsibility:** Renders the scene background behind all exercises. Receives no props — it owns its own layout and visuals. Fills the full screen behind the exercise zones.

#### `roamer`
An object with three component members:

- **`swimZone`** — `ComponentType<ThemeRoamerSwimZoneProps>`. The interactive Roamer layer where Roamers swim, can be tapped, and can be captured. Renders in the Roamer zone (the bottom half in portrait, the left half in landscape). Receives words, interactivity flags, sound controller, capture configuration, and a ref for runtime control.
- **`decorative`** — `ComponentType<ThemeDecorativeRoamerLayerProps>`. Non-interactive Roamers that swim across the full screen for ambience. Receives only `zIndex` and `fishCount`.
- **`matchLayer`** — `ComponentType<ThemeMatchRoamerLayerProps>`. The Roamer layer for the translation-match exercise. Receives words, sounds, session controller, escape ref, tap data ref, interactivity flag, and keep-out disk shared value.

#### `wordSprite`
An object with four component members:

- **`tableCell`** — `ComponentType<ThemeWordSpriteTableLayerProps>`. Renders the conjugation table as WordSprites. Receives table data, interactivity, sound callbacks, highlight state, and a controller ref.
- **`sentenceRow`** — `ComponentType<ThemeSentenceRowLayerProps>`. Renders a sentence prompt as a row of WordSprites. Receives display slots, conjugated form, round position/phase, swim paths, blank-slot state, and completion callbacks.
- **`option`** — `ComponentType<ThemeOptionWordSpriteLayerProps>`. Renders the three option WordSprites in variant selection. Receives options, swim paths, round state, correct index, and tap callback.
- **`match`** — `ComponentType<ThemeMatchWordSpriteLayerProps>`. Renders the WordSprite layer for translation match. Receives words, shared values for capture/match state, tap data ref, and keep-out disk.

#### `wordTransformationVisual`
An object with three component members:

- **`bubbleLayer`** — `ComponentType<ThemeTransformationBubbleLayerProps>`. The combined letter-bubble + variant-picker + insert-flight layer for word transformation. Receives letter models, animation state, variant picker state, and interaction callbacks.
- **`wordBubbles`** — `ComponentType<ThemeTransformationWordBubblesProps>`. The word-bubble display for translation exercises (English prompt, Spanish result). Receives letter models, insert preview, merge state, and callbacks.
- **`letterBubble`** — `ComponentType<ThemeLetterBubbleProps>`. A single letter bubble with enter/move/pop animations. Receives character, position, diameter, status, font, image, clock, and animation callbacks.

#### `roundResolution`
An object with three component members:

- **`resolutionBubble`** — `ComponentType<ThemeResolutionBubbleProps>`. The word bubble that materializes after metaball merge and flies to the blank slot. Receives bubble state, round phase, and completion callbacks.
- **`resolveFlight`** — `ComponentType<ThemeResolveFlightProps>`. The flight animation from merge site to blank slot (and exit). Receives phase, form, positions, diameter, and completion callbacks.
- **`mergeBubbles`** — `ComponentType<ThemeMergeBubblesProps>`. The metaball merge animation layer. Receives the merged word, duration, and completion callback.

#### `matchExercise`
An object with one hook member:

- **`useCombinedGestures`** — `(params: ThemeCombinedMatchGestureParams) => unknown`. Combines WordSprite tap gestures and Roamer tap gestures into a single gesture handler for the translation-match exercise. Receives tap data refs and match/unmatch callbacks.

#### `escape`
An object with one hook member:

- **`useRoamerEscapeCoordinator`** — `(params: ThemeEscapeCoordinatorParams) => ThemeEscapeCoordinatorResult`. Creates an escape coordinator that animates Roamers and WordSprites offscreen after a successful transformation. Receives a Roamer controller ref, WordSprite bridge, and WordSprite zone rect.

#### `tutorial`
A `ThemeTutorialOverrides` object providing:

- **`SpotlightOverlay`** — `ComponentType`. Renders the tutorial spotlight overlay (dimmed background + highlighted target). Receives the current step, dimensions, gradient radius, bridge references, and target indices.
- **`pickRoamerTarget`** — `(bridge: RoamerSimBridge) => number | null`. Picks a Roamer index to highlight for the current tutorial step.
- **`pickWordSpriteTarget`** — `(bridge: WordSpriteLayoutBridge) => number | null`. Picks a WordSprite index to highlight for the current tutorial step.
- **`pickHeaderTarget`** — `(bridge: WordSpriteLayoutBridge) => number | null`. Picks a header WordSprite index to highlight.
- **`copy`** — `Record<TutorialStep, ThemeTutorialStepCopy>`. Per-step tutorial text: `message` (instruction text), `stepLabel` (e.g. "1/3"), `actionLabel` (button text). Steps are `roamer`, `wordSprite`, and `translate`.

The tutorial follows a **generic-skeleton-plus-overrides** model: the generic framework owns the step state machine, the tooltip shell, and the dim overlay; the theme supplies the spotlight targets, spotlight rendering, and per-step copy.

#### `loading`
An object with one component member:

- **`backdrop`** — `ComponentType<ThemeLoadingBackdropProps>`. The visual backdrop behind the loading progress bar. Receives width, height, and theme-specific placeholder images (e.g. seafloor, stones, seaweed). The progress bar and layout math are generic; only the backdrop visual is theme-specific.

#### `assets`
An object with two members:

- **`useThemeAssets`** — `() => ThemeAssets`. A hook that returns the current asset loading state: either `{ phase: 'loading', images, sounds, progress }` or `{ phase: 'ready', images, sounds, progress: 100 }`. The generic framework reads this to drive the loading screen.
- **`AssetsProvider`** — `ComponentType<{ value: ThemeAssetsProviderValue; children: ReactNode }>`. A React context provider that makes the loaded images and sound controller available to the theme's visual components.

#### `shaders`
- **Type:** `Record<string, unknown>`. A bundle of theme-specific Skia shader modules. The generic framework does not consume these directly — they are imported by the theme's own visual components.

#### `layoutConfig`
- **Type:** `ThemeLayoutConfig`. Contains `zoneRatios`:
  - `roamerFraction` — the fraction of the screen dedicated to the Roamer zone (e.g. `0.5` means the Roamer zone takes the bottom/left half).
  - `wordSpriteInsetRatio` — the inset ratio for WordSprite content within its zone.
  - `wordSpriteHeightFraction` — the height fraction for WordSprite content.

#### `styleOverrides` (optional)
- **Type:** `ThemeStyleOverrides`. Optional overrides for the generic chrome:
  - `overlayDark` — color for the tutorial dim overlay.
  - `spotlightRingColor` — color for the spotlight ring.
  - `guideLineColor` — color for tutorial guide lines.
  - `fishSpotlightScale` — scale factor for Roamer spotlight circles.
  - `jellySpotlightScale` — scale factor for WordSprite spotlight circles.

## Required folder layout

A theme lives under `components/exercises/themes/<theme-name>/` and should follow this structure:

```
themes/<theme-name>/
├── index.ts                    # Re-exports the theme bundle
├── themeBundle.ts              # The Theme object (implements Theme interface)
│
├── core/                       # Theme-specific core: asset loaders, manifests, types
│   ├── assets/                 # Image manifests, sound manifests, useThemeAssets hook
│   └── providers/              # ThemeAssetsProvider
│
├── carrier/                    # WordSprite visual layer (table cells)
│   └── WordSpriteTableLayer/   # The table-cell rendering components
│
├── roamer/                     # Roamer visual layer
│   ├── RoamerSwimZone/         # Interactive swim zone with capture hooks
│   ├── roamerFish/             # Roamer instance rendering
│   ├── DecorativeRoamerLayer/  # Non-interactive background Roamers
│   ├── bubbles/                # Roamer bubble visuals (capture, word display)
│   ├── capture/                # Capture overlay and escape visuals
│   ├── escape/                 # Escape coordinator implementation
│   ├── gestures/               # Tap gesture handlers
│   ├── simulation/             # Roamer movement simulation
│   └── config/                 # Roamer-specific configuration
│
├── scenery/                    # Scenery visual layer (background)
│   ├── decor/                  # Decorative elements (stones, seaweed, etc.)
│   └── seafloor/               # Ground layer
│
├── shaders/                    # Theme-specific Skia shaders (.sksl.ts files)
│
├── assets/                     # Static asset sources (PNG manifests)
│
├── ui/                         # Theme-specific UI overrides
│   ├── instructions/           # Tutorial: spotlight overlay, targets, copy, constants
│   └── loading/                # Loading screen backdrop
│
└── exercises/                  # Per-mechanic visual layers
    ├── wordTransformation/     # Letter bubbles, variant picker, insert flight
    ├── sentenceTransformation/ # Sentence row layer, merge bubbles, resolution bubble
    ├── variantSelection/       # Option layer, resolve flight
    └── wordLearning/
        ├── translationChoice/  # (placeholder — visuals are generic or theme-supplied)
        ├── translationMatch/   # Match Roamer layer, match WordSprite layer, gestures
        └── translationSpelling/ # (placeholder)
```

### Folder responsibilities

- **`core/`** — Concrete asset loaders, image/sound manifests, the `useThemeAssets` hook, and the `AssetsProvider`. These name theme-specific image shapes and sound files; they cannot be generic.
- **`carrier/`** — The WordSprite visual layer for the table exercise. In the undersea theme, this is the jellyfish table rendering system with tint presets, worklets, gestures, and motion loops.
- **`roamer/`** — The Roamer visual layer: swim simulation, instance rendering, bubble visuals, capture/escape orchestration, and gestures. In the undersea theme, this is the koi fish system.
- **`scenery/`** — The scene background. In the undersea theme, this is the seafloor with stones and seaweed.
- **`shaders/`** — Skia shader modules specific to the theme's visual effects (deform shaders, merge shaders, shadow shaders).
- **`ui/instructions/`** — The tutorial system: spotlight overlay, target pickers, per-step copy, and style constants. These name theme creatures and ship theme styling.
- **`ui/loading/`** — The loading-screen backdrop visual. The progress bar and layout math are generic; only the backdrop image is theme-specific.
- **`exercises/`** — Per-mechanic visual layers. Each exercise mechanic's domain and hooks live in the generic framework; only the rendering components that draw WordSprites/Roamers/bubbles live here.

## How the generic framework consumes a theme

1. **ThemeProvider** wraps the exercise tree, making the `Theme` object available via `useTheme()`.
2. **ExerciseShell** reads the theme's `assets.useThemeAssets()` to drive the loading screen, then renders the exercise content once assets are ready.
3. Each exercise mechanic hook (e.g. `useWordTransformationGame`) calls `useTheme()` to access the theme's visual components and renders them inline.
4. The generic UI chrome (corner controls, instruction bar, drop panel, capture overlay host) is imported directly from `exercises/ui/`. Theme style overrides are read from `theme.styleOverrides`.
5. The tutorial step state machine is owned by `ExerciseTutorial` (in `exercises/shared/`). It calls `theme.tutorial.pickRoamerTarget()`, `theme.tutorial.pickWordSpriteTarget()`, and renders `theme.tutorial.SpotlightOverlay` with the theme's copy.

## How to add a new theme

1. Create `components/exercises/themes/<theme-name>/` with the folder layout above.
2. Implement every member of the `Theme` interface in a `themeBundle.ts` file.
3. Create a `core/assets/useThemeAssets.ts` hook that loads the theme's images and sounds.
4. Create the per-mechanic visual layers under `exercises/` that render your theme's creatures.
5. Register the theme by passing the theme bundle to `ThemeProvider` in the exercise entry components.
6. Run `npx tsc --noEmit` to verify the theme satisfies the `Theme` interface at compile time.
7. The existing domain test suite should pass unchanged — the theme only supplies visuals, not mechanics.

## Design principles

- **The deletion test:** if moving a piece to the generic framework would force it to name a theme entity (a creature, a scene element, theme copy, or a theme palette), that piece stays in the theme.
- **Generic skeleton, theme overrides:** the generic framework owns behaviour (step state, progress bar, chrome layout); the theme supplies visuals (spotlight rendering, backdrop, copy, palette).
- **Bridges are the seam:** the bridge types (`WordSpriteLayoutBridge`, `RoamerSimBridge`, `RoamerCaptureBridge`) are the load-bearing interface between mechanics and visuals. The theme's visual layers adapt to these bridges; the mechanics program to them.
- **No theme names in the generic core:** the generic framework never imports from a concrete theme. It communicates only through the `Theme` interface and the bridge types.
