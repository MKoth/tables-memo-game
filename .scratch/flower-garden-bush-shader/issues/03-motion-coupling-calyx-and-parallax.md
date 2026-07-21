Status: ready-for-agent
Parent: .scratch/flower-garden-bush-shader/PRD.md

## What to build

Hook the bush shader to the word-sprite bridge's `layoutX` / `layoutY` / `layoutScale` shared values so the calyx follows the rose every frame and the leaves parallax with the rose. The stem's bottom end stays anchored to the bush base; the stem's top end tracks the rose's centre; the control point stays constant; the leaf `t` values stay constant; the leaf parallax weight is `t^2`. After this slice, dragging the table moves the calyces and the upper leaves with the roses, while the lower leaves barely move, and the stem re-curves smoothly during drag and the motion loop.

The shader's `useDerivedValue` reads `layoutX[i]`, `layoutY[i]`, `layoutScale[i]` from the bridge every frame (no JS roundtrip — the shader is the sole consumer in the scenery). The rest positions are pre-computed at init (from the same `useExerciseLayout` data the rose layer uses) and the delta is `(layoutX[i] - restX[i], layoutY[i] - restY[i])`. The delta drives:

- The stem's `topX[i]` / `topY[i]` uniforms (the shader re-evaluates the bezier with the moved top end and the constant control point, so the curve shape changes smoothly as the rose moves).
- The calyx's screen position and scale (multiplied by the rose's `layoutScale[i]` so the calyx scales with the rose as the rose's cell-scale wobble propagates).
- The leaf parallax offset for each leaf: `(t^2 * delta.x, t^2 * delta.y)` added to the leaf's attachment point on the curve.

The control point does **not** move with the rose — it stays where it was at init. The leaf `t`, `tilt`, `variant`, `size`, and `side` all stay constant after init. The shader does not need any new uniforms; it just adds `restX[i]` / `restY[i]` arrays alongside the existing `layoutX[i]` / `layoutY[i]` arrays so it can compute the delta. The bush config from slice 1 surfaces the rest positions explicitly (added to `StemConfig` if not already there).

The scenery mounts in parallel with the rose layer and reads the bridge via `useExerciseRuntime`, so both layers see the same shared values from the first frame. No first-frame flash. The scenery is wrapped in `React.memo` (or equivalent) so the per-frame work is in the shader, not in React reconciliation.

## Acceptance criteria

- [ ] The shader's uniforms include `restX[]` / `restY[]` arrays (sized by `MAX_STEMS_PER_BUSH`) alongside `layoutX[]` / `layoutY[]` / `layoutScale[]`.
- [ ] The shader reads the shared `layoutX[i]`, `layoutY[i]`, `layoutScale[i]` every frame and computes the delta.
- [ ] The calyx's screen position and scale follow the rose every frame (driven by `layoutX[i]`, `layoutY[i]`, `layoutScale[i]`).
- [ ] Each stem's top end follows the rose's current centre; each stem's bottom end stays anchored to the bush base; the control point stays constant.
- [ ] Each leaf's parallax offset is `(t^2 * delta.x, t^2 * delta.y)` added to its attachment point on the curve.
- [ ] Dragging the table moves the calyces and the upper leaves with the roses; the lower leaves barely move.
- [ ] During fling and the motion loop, stems re-curve smoothly (no popping) and leaves track continuously.
- [ ] No per-frame JS work for the scenery after init (the per-frame work is in the shader, driven by shared values).
- [ ] The scenery is wrapped in `React.memo` (or equivalent) so React reconciliation is not paying for per-frame work.
- [ ] No first-frame flash of missing stems when the table appears.
- [ ] The existing domain test suite keeps passing unchanged.
- [ ] `npx tsc --noEmit` passes.
- [ ] `npm run lint` passes.
- [ ] `npm test` passes.

## Blocked by

- `.scratch/flower-garden-bush-shader/issues/02-end-to-end-render-at-rest.md`
