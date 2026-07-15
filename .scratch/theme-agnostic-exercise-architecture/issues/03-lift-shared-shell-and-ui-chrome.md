Status: ready-for-agent
Parent: .scratch/theme-agnostic-exercise-architecture/PRD.md

## What to build

Lift the shared exercise shell and the **generic** UI chrome out of the undersea theme subtree into the generic framework, and leave the **theme-specific** UI under the theme. Today's `ui/` mixes generic chrome with theme-specific tutorial and loading, the same way `core/` mixes generic machinery with theme-specific data. Split it with the same deletion test: if moving a piece to the generic UI would force it to name a theme entity, use theme copy, or bake in a theme palette, that piece stays in the theme.

Pointers, grounded in the current code:

- **Generic chrome — move to `exercises/ui` with the prefix stripped:** the drop panel, the instruction tooltip, the help/sound buttons and sound icon, the corner-controls cluster, the transformation instruction bar, the capture overlay host (a thin container that renders a theme-supplied overlay node), the positioning helpers, and the generic z-index/size constants. These depend only on the store and the generic layout zones. Rename `UnderseaThemeCornerControls` → `ExerciseCornerControls`; the shell becomes `ExerciseShell`.
- **Theme-specific tutorial — leave under the theme (`themes/undersea/ui`):** the tutorial orchestrator (it reads the koi/jelly bridges, picks fish/jelly spotlight targets, and emits theme copy like "Tap any fish…"), the spotlight overlay and its fish/jelly spotlight components and guide lines, the target pickers, and the spotlight visual constants (scales, the undersea blue palette). These name theme creatures and ship undersea styling. They are supplied through the `Theme` contract in a later slice.
- **Theme-specific loading — leave under the theme:** the loading screen's backdrop is the undersea scene (seafloor/stones/seaweed). The progress bar and layout math are generic and can move up; the backdrop visual is theme-specific and stays.

In this slice the shell still obtains assets by importing the undersea asset loader directly, and the generic chrome renders the tutorial/loading via the theme's existing pieces — wiring assets, tutorial, and loading through the `Theme` contract is a later slice. Here we only split and move: generic chrome to `exercises/ui`, theme-specific tutorial and loading backdrop left in the undersea subtree (they are relocated into `themes/undersea/ui` in the visuals slice). Every reference to the moved/renamed symbols is updated. No behaviour changes. After this step the generic chrome is theme-agnostic in name and location, the theme-specific UI remains in the undersea subtree, and the build is green.

## Acceptance criteria

- [ ] The exercise shell lives under `exercises/shared` as `ExerciseShell` (no `UnderseaTheme` prefix).
- [ ] The generic UI chrome (drop panel, instruction tooltip, help/sound buttons, corner controls, instruction bar, capture overlay host, positioning helpers, generic z/size constants) lives under `exercises/ui` with generic names.
- [ ] No symbol in `exercises/ui` names a theme entity, uses theme copy, or bakes in a theme palette.
- [ ] The theme-specific tutorial (orchestrator, spotlight overlay, fish/jelly spotlights, guide lines, target pickers, spotlight visual constants) stays under the theme.
- [ ] The theme-specific loading backdrop stays under the theme; only the generic progress-bar/layout math is lifted.
- [ ] The shell still loads and gates on assets exactly as before (contract wiring is out of scope here).
- [ ] Every reference to the renamed/moved symbols across the codebase is updated.
- [ ] `npx tsc --noEmit` passes.
- [ ] `npm run lint` passes.
- [ ] `npm test` passes.

## Blocked by

- `.scratch/theme-agnostic-exercise-architecture/issues/02-lift-generic-core-out-of-theme.md`
