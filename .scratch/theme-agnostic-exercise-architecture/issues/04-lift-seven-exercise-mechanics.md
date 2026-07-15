Status: ready-for-agent
Parent: .scratch/theme-agnostic-exercise-architecture/PRD.md

## What to build

Lift the **theme-agnostic** parts of the seven exercise mechanics out of the undersea theme subtree into the generic framework, and leave each mechanic's **theme-specific visual layers** under the theme. Each mechanic folder today mixes a theme-agnostic domain with a theme-specific visual layer, the same way `core/` and `ui/` do. Split with the deletion test: if moving a piece to the generic mechanic would force it to import a theme visual (a WordSprite/Roamer layer, a bubble component, an undersea shader, a theme asset), that piece stays in the theme.

Pointers, grounded in the current code:

- **Theme-agnostic — lift to `exercises/<mechanic>/`:** every `domain/` (round controllers, distractor selectors, timing, types, validators, the word-transformation shared core), every `hooks/` (the game orchestrators that consume the bridges, the core, the store, and the domain), and the pure helpers (`letterCascade`, `insertAnimationTiming`, `shuffleIndices`, `swimPathPlanner`, `sentenceRowDisplay`). `translationChoice` and `translationSpelling` have only domain + hooks — they lift wholesale.
- **Theme-specific — leave in the undersea subtree (relocated in the visuals slice):** each mechanic's visual layers — the word-transformation visuals (`LetterBubble`, `TransformationBubbleLayer`, `TransformationInsertFlight`, `TransformationVariantPicker`, `TransformationWordBubbles`); the sentence-transformation visuals (`JellyfishSentenceRowLayer`, `TransformationMergeBubbles`, `TransformationRoundResolutionBubble`, and the `merge/` layer); the variant-selection visuals (`OptionJellyfishLayer`, `VariantSelectionResolveFlight`); and the translation-match visuals (`MatchJellyfishLayer`, `MatchKoiLayer`, and the match `jellyfish/` worklets and gestures). These render WordSprites/Roamers/bubbles and use undersea shaders.
- **One shared-type coupling to fix:** the sentence-transformation hook imports a `VariantPickerItem` type from the word-transformation visual component. Relocate that shared type to a theme-agnostic location (e.g. the word-transformation domain types) so the lifted hook does not depend on a theme visual layer.

Keep the mechanic names exactly as they are — only location changes, and any `Undersea`/theme prefix on the lifted symbols is stripped where present. The word-transformation shared core (ADR-0001) stays the test surface and is not restructured. The translation-match capture orchestration forks (ADR-0002) stay as forks — renamed only where they carry a theme prefix, never merged; their visual layers stay under the theme.

Every reference to the moved mechanics is updated. No behaviour, round-lifecycle, or timing changes. After this step each mechanic's domain and hooks live in the generic framework, each mechanic's visual layers remain in the undersea subtree (relocated into the theme in the visuals slice), and the build is green.

## Acceptance criteria

- [ ] Each mechanic's `domain/` and `hooks/` (and pure helpers) live under `exercises/<mechanic>/`, not under the theme folder.
- [ ] `translationChoice` and `translationSpelling` lift wholesale (domain + hooks, no visual layers).
- [ ] No lifted symbol imports a theme visual layer, an undersea shader, or a theme asset.
- [ ] Each mechanic's visual layers (word-transformation bubbles, sentence-row + merge, option + resolve-flight, match layers + gestures) remain in the undersea subtree.
- [ ] The `VariantPickerItem` shared type is relocated to a theme-agnostic location; the sentence-transformation hook no longer imports from a visual component.
- [ ] Mechanic names are unchanged; only location and any theme prefix on the lifted symbols change.
- [ ] The word-transformation shared core is preserved as the test surface (ADR-0001 respected).
- [ ] The translation-match capture forks remain separate forks (ADR-0002 respected — not merged); only their visual layers stay under the theme.
- [ ] Every reference to the moved mechanics across the codebase is updated.
- [ ] `npx tsc --noEmit` passes.
- [ ] `npm run lint` passes.
- [ ] `npm test` passes (the existing domain suites stay green; only import paths change if at all).

## Blocked by

- `.scratch/theme-agnostic-exercise-architecture/issues/02-lift-generic-core-out-of-theme.md`
