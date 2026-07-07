# Shared word transformation core

The table transformation and sentence transformation exercises both run the same word transformation mechanic (letter delete/insert, variant picker, sequential inserts) but differ in what surrounds it: a conjugation table with koi escape vs a sentence row with round resolution animations. We extract a deep shared transformation core from `useWordTransformationGame` and keep each exercise as a thin shell with its own post-solve behavior, rather than forking the hook or growing a single hook with mode flags.

**Considered options:** fork `useWordTransformationGame` per exercise (fast but duplicates ~900 lines of animation state); a `context: 'table' | 'sentence'` flag in one hook (centralises code but concentrates branching). The shared core keeps the transformation interface as the test surface and lets each exercise own only its seam-specific state machine.
