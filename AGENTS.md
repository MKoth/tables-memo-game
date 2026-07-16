## Agent skills

Skills from `mattpocock/skills` (see `skills-lock.json`). Issue tracker, triage labels, and domain docs already set up — see below.

### Issue tracker

Issues as markdown under `.scratch/<feature>/`. See `docs/agents/issue-tracker.md`.

### Triage labels

`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: `CONTEXT.md` + `docs/adr/`. See `docs/agents/domain.md`.

---

## Repo: LangTablesLearnGame

React Native 0.85.3 app for learning Spanish verb conjugations via undersea-themed exercises.

### Quick commands

| Command | What |
|---|---|
| `npm start` | Metro dev server |
| `npm run ios` | Build & run iOS simulator (run `bundle exec pod install` first if new) |
| `npm run android` | Build & run Android |
| `npm test` | Jest (uses `@react-native/jest-preset`) |
| `npm run lint` | ESLint (extends `@react-native`) |
| `npx tsc --noEmit` | Typecheck (no script in package.json — run explicitly) |
| `npm start -- --reset-cache` | Clear Metro cache (needed after asset changes) |

### Dev switch

`App.tsx:16` — set `ACTIVE_EXERCISE` to `'table'`, `'wordTransformation'`, or `'sentenceTransformation'`.

### Architecture

Theme-agnostic exercise framework with a `Theme` interface (see `docs/theme-structure-guide.md` and `docs/adr/0003-theme-agnostic-exercise-architecture.md`). Seven exercises share a word-transformation core (see `docs/adr/0001-shared-word-transformation-core.md`):

- **Table transformation** — conjugation table visible as WordSprites; solved form fills table cell
- **Word transformation** — infinitive → conjugated form via letter delete/insert bubbles
- **Sentence transformation** — sentence prompt with a blank slot; solved form lands in slot
- **Variant selection** — correct conjugation from three option WordSprites
- **Translation choice** — English word, select Spanish translation from options
- **Translation spelling** — spell Spanish translation letter-by-letter from a pool
- **Translation match** — match English words (Roamers) to Spanish translations (WordSprites)

Generic framework lives under `components/exercises/`; the undersea theme lives under `components/exercises/themes/undersea/`.

```
components/exercises/
├── core/              # Generic infrastructure: clock, store, layout, providers, bridge types
├── shared/            # ExerciseShell, ExerciseLoadingScreen, ExerciseTutorial
├── ui/                # Generic chrome: corner controls, instruction bar, drop panel, capture overlay
├── themeContract/     # Theme interface and ThemeContext
├── wordTransformation/    # Mechanic: domain + hooks (visual layers in theme)
├── sentenceTransformation/ # Mechanic: domain + hooks (visual layers in theme)
├── variantSelection/       # Mechanic: domain + hooks (visual layers in theme)
├── wordLearning/           # Three mechanics: translationChoice, translationMatch, translationSpelling
├── themes/undersea/        # Undersea theme implementation
│   ├── core/          # Theme-specific asset loaders, manifests, types
│   ├── carrier/       # WordSprite table layer (jellyfish)
│   ├── roamer/        # Roamer swim zone, simulation, capture (koi)
│   ├── scenery/       # Seafloor, stones, seaweed
│   ├── shaders/       # Undersea-specific Skia shaders
│   ├── ui/            # Tutorial spotlight, loading backdrop
│   └── exercises/     # Per-mechanic visual layers (bubbles, merge, sentence row, options, match)
└── Table*.tsx         # Seven public exercise entry components
```

Generic terms: **WordSprite** (floating word-display role), **Roamer** (roaming capturable-creature role), **Scenery** (scene background). The undersea theme realises these as jellyfish, koi, and seafloor respectively. See `CONTEXT.md` for the full glossary.

### State management

zustand stores created via `createExerciseStore()` in `core/store/`.

### Key deps

- `@shopify/react-native-skia` — GPU-accelerated canvas rendering
- `react-native-reanimated` + `react-native-gesture-handler` — animations & gestures
- `react-native-worklets` — requires `react-native-worklets/plugin` in `babel.config.js`

### Style

- Prettier: `arrowParens: 'avoid'`, `singleQuote: true`, `trailingComma: 'all'`
- No comments in production code (see `CONTEXT.md` for domain vocabulary — use it precisely)

### Assets

- PNG assets in `assets/images/undersea_theme/`
- Optimisation script `scripts/optimize-assets.sh` (needs ImageMagick: `brew install imagemagick`)
- Sound assets in `assets/sounds/`

### Environment

- Node >= 22.11.0
- iOS: first clone needs `bundle install && bundle exec pod install`
- Orientation locker active — layouts respond to device orientation
