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

Three exercises sharing a word-transformation core (see `docs/adr/0001-shared-word-transformation-core.md`):

- **TableExercise** — conjugation table visible as jellyfish; solved form fills table cell
- **WordTransformationExercise** — infinitive → conjugated form via letter delete/insert bubbles
- **SentenceTransformationExercise** — sentence prompt with a blank slot; solved form lands in slot

All live under `components/TableExercise/UnderseaTheme/`.

```
UnderseaTheme/
├── core/          # Layout, clock, store (zustand), assets, providers, hooks
├── wordTransformation/  # Letter bubbles, variant picker, insert flight
├── sentenceTransformation/  # Round lifecycle, jellyfish sentence row, metaball merge
├── shared/        # Exercise shell wrapper
├── jellyfish/     # Jellyfish visuals
├── koi/           # Decorative background fish
├── background/    # Undersea scene
└── shaders/       # Skia shaders (metaball merge)
```

### State management

zustand stores created via `createUnderseaThemeExerciseStore()` in `core/store/`.

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
