Status: ready-for-agent
Parent: .scratch/theme-agnostic-exercise-architecture/PRD.md

## What to build

The feature folder is misnamed: `TableExercise` holds seven exercises, only one of which is the table transformation exercise. Rename the folder from `components/TableExercise` to `components/exercises` and update everything outside it that imports from it — the app entry wiring and the seven thin public wrapper components that re-export the undersea theme's exercise components. This is a pure path-and-import change: the `UnderseaTheme/` subtree moves with the folder and is not touched otherwise. After this step the app builds, typechecks, lints, and all tests pass, and the dev switch still runs the selected exercise.

This is the prefactor that makes the later theme-agnostic reorganisation easy: every subsequent slice works inside `components/exercises/`.

## Acceptance criteria

- [ ] The folder `components/TableExercise` no longer exists; its contents live under `components/exercises/`.
- [ ] The app entry (App.tsx dev switch) imports the seven exercise components from their new `components/exercises/` locations and runs the selected exercise.
- [ ] The seven public wrapper components resolve their imports against the new location.
- [ ] `npx tsc --noEmit` passes.
- [ ] `npm run lint` passes.
- [ ] `npm test` passes (no test expectations change — no behaviour or symbol names change in this slice).

## Blocked by

None - can start immediately
