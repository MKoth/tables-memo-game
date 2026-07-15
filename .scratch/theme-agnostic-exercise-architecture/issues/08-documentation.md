Status: ready-for-agent
Parent: .scratch/theme-agnostic-exercise-architecture/PRD.md

## What to build

Document the theme-agnostic architecture so the ubiquitous language, the theme contract, and the onboarding notes all reflect the new structure. Update the domain glossary (`CONTEXT.md`) with the generic vocabulary — WordSprite, Roamer, Scenery, Theme, ExerciseShell, ExerciseCore — and reframe the existing undersea terms as the undersea realisation of those roles (a jellyfish is the undersea WordSprite; a koi is the undersea Roamer; the seafloor is the undersea Scenery). Write a theme-structure guide that codifies the `Theme` contract and the required members and folder layout of a theme, so a future theme or an agent can be built against a written spec without reading the undersea source. Update the architecture section of the engineering notes (AGENTS.md) to the new `exercises/` + `themes/undersea/` layout and the generic vocabulary. Record the reorganisation as ADR-0003 ("Theme-agnostic exercise architecture"), and cross-reference ADR-0001 and ADR-0002 to the new role names without editing their recorded decisions.

Docs only — no code or behaviour changes. After this step the docs are consistent with the codebase.

## Acceptance criteria

- [ ] `CONTEXT.md` defines WordSprite, Roamer, Scenery, Theme, ExerciseShell, and ExerciseCore, and reframes the undersea terms as the undersea realisation of those roles.
- [ ] A theme-structure guide document exists, describing the `Theme` contract members, the required folder layout of a theme (carrier, roamer, scenery, shaders, assets, core, ui, per-mechanic visual layers), the generic-skeleton-plus-overrides model for the tutorial, loading screen, and chrome styling, and how each mechanic's domain/hooks stay generic while its visual layer is theme-supplied, referenced from the engineering docs.
- [ ] The AGENTS.md architecture section reflects the `exercises/` + `themes/undersea/` layout and the generic vocabulary (no stale `TableExercise`/`UnderseaTheme` path references in the architecture description).
- [ ] ADR-0003 records the theme-agnostic reorganisation and the WordSprite/Roamer/Scenery naming.
- [ ] ADR-0001 and ADR-0002 are cross-referenced to the new role names without their recorded decisions being edited.
- [ ] `npx tsc --noEmit` passes (unchanged — docs only).
- [ ] `npm run lint` passes.
- [ ] `npm test` passes.

## Blocked by

- `.scratch/theme-agnostic-exercise-architecture/issues/07-introduce-theme-contract-and-wire-undersea-bundle.md`
