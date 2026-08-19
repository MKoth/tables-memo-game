# Swamp water surface — per-participant lens

The swamp theme needs underwater motion for floor, stones and algae. Initial attempt used full-screen `makeImageSnapshot()` + `sceneTexture` post-process. It caused ghost copy (distorted over undistorted source visible at large wobble), floor not distorted (separate Canvas cannot be snapshotted), algae freeze (static snapshot of animated deform), and JS 60→4fps (per-frame GPU readback + `setState`).

We now implement water as per-participant distortion: base wobble + tint inside each participant shader (`swampfloor.sksl.ts`, `stone.sksl.ts`, `algaeDeform.sksl.ts`) plus lens from wave particles. Waves are invisible field particles `{x,y,birthTime,radius,strength,width}` delivered as fixed uniform array `MAX_WAVES=8` (`waveCenters`, `waveRadii`, `waveStrengths`, `waveWidths`, `waveCount`) via `useDerivedValue` (UI thread). Each shader loops over waves, culls distant ones, and computes `dist = length(fragCoord - center)`, `edge = abs(dist - radius)`, `ring = exp(-edge*edge/width*width) * exp(-dist*decay)` and displaces `sampleCoord = fragCoord + wobble + dir*ring*strength`. Per-layer multipliers (`floor 0.6`, `stone 1.0`, `algae 1.3`) give subtle variation. JS manager spawns 1-2 waves every 1.5-2s at random screen positions, auto-expires when `radius > maxRadius` (280) or `age > duration` (4s).

Considered alternatives:
- Full-screen snapshot post-process (rejected: ghost copy, performance, separate Canvas isolation)
- Visual wave ring component per wave (rejected: many React components, still needs sampling)
- Snapshot at reduced res / throttled (rejected: still copy, caps at 30fps)

Single-canvas tint+caustics overlay without lens was considered for Stage 1 but lens gives characteristic moving-lens on stones.

