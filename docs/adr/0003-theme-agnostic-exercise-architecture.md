# Theme-agnostic exercise architecture

Every exercise visual lived under a single `UnderseaTheme` bundle, and the feature folder was named `TableExercise`. The names baked the undersea metaphor into the architecture: `Jellyfish*`, `Koi*`, `UnderseaTheme*`, `seafloor`, `seaweed`. But the undersea cast is just one realisation of a set of roles — a floating word display, a roaming capturable creature, a scene background — that a different theme would recast (a rose for the word display, a bird for the roamer, a garden for the scenery). Because the generic roles had no names and no interface, there was no seam between the exercise *mechanics* (which were already theme-agnostic) and the theme *visuals*: the mechanics reached past a missing interface straight into undersea-named modules. Adding a second theme would have meant duplicating the mechanics or threading undersea names through them.

We reorganised the feature into a **generic exercise framework** plus a **theme implementation** behind a `Theme` interface:

- Renamed the `TableExercise` folder to `exercises/` (it holds seven exercises, not just the table transformation exercise).
- Lifted the already-theme-agnostic pieces out of `UnderseaTheme/` into the generic framework: the core (layout, clock, providers, store, bridge types, hooks), the shared exercise shell, the generic UI chrome (corner controls, instruction bar, drop panel, capture overlay host), and the domains and hooks of the seven exercise mechanics.
- Introduced a `Theme` interface outside the themes folder. The generic exercises program to this interface; a theme is an adapter that implements it.
- Moved the undersea-specific visuals under `exercises/themes/undersea/`, renaming the role entities to generic names: the jellyfish became the **WordSprite**, the koi became the **Roamer**, the background became the **Scenery**.
- Stripped the `UnderseaTheme` prefix from every generic-framework symbol so the framework speaks in `Exercise*` terms; the `Undersea` prefix survives only on the theme's own concrete pieces.
- Renamed the bridge types to generic names (`WordSpriteLayoutBridge`, `RoamerSimBridge`, `RoamerCaptureBridge`).
- Recorded the generic vocabulary in `CONTEXT.md` and wrote a theme-structure guide (`docs/theme-structure-guide.md`).

No exercise behaviour, animation, or timing was changed. This was a structural rename-and-move plus one new interface.

**Considered options:** duplicate the mechanics per theme (violates DRY, the failure mode ADR-0001 rejected); thread undersea names through the mechanics (concentrates theme coupling into the framework); do nothing (blocks a second theme and misleads onboarding). The `Theme` interface deepens a currently shallow module: today the mechanics import concrete theme parts directly; after the change they program to an interface, and the undersea bundle is a thin adapter behind it. The deletion test passes — deleting the interface would concentrate theme coupling back into the mechanics.

**Cross-references:** ADR-0001 (shared word-transformation core) and ADR-0002 (fork Roamer capture for translation match) both stand. The WordSprite/Roamer/Scenery naming generalises the role names that ADR-0001 and ADR-0002 originally recorded as jellyfish/koi; the recorded decisions are unchanged.
