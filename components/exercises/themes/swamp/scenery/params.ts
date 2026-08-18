/**
 * Tunable parameters for the Swamp theme.
 * Edit these values to adjust the visual appearance.
 */
import { swampfloorDefaults } from '../shaders/swampfloor.sksl';
import { stoneDefaults } from '../shaders/stone.sksl';
import { algaeDeformDefaults } from '../shaders/algaeDeform.sksl';
import { spriteShadowDefaults } from '../shaders/spriteShadow.sksl';

// ─── Floor (swampbottom) ────────────────────────────────────────────

export const FLOOR_PARAMS = {
  /** Texture tiling scale — higher = more tiles across the floor. */
  floorScale: swampfloorDefaults.floorScale,
  /** RGB multiplier for swamp color cast — murky green/brown. */
  underwaterTint: swampfloorDefaults.underwaterTint,
  /** Swamp tint intensity — 0 = none, 1 = full. */
  underwaterTintStrength: swampfloorDefaults.underwaterTintStrength,
  /** Vertical depth gradient — darker/greener toward top of screen. */
  underwaterDepthStrength: swampfloorDefaults.underwaterDepthStrength,
  /** Caustic pattern snaps per second. */
  switchRate: swampfloorDefaults.switchRate,
  /** Voronoi cell density per layer. */
  voronoiScale: swampfloorDefaults.voronoiScale,
  /** Caustic beam strength per layer. */
  voronoiIntensity: swampfloorDefaults.voronoiIntensity,
  /** Voronoi border line width per layer. */
  voronoiSharpness: swampfloorDefaults.voronoiSharpness,
  /** Domain warp amplitude per layer. */
  voronoiClusterAmp: swampfloorDefaults.voronoiClusterAmp,
  /** Domain warp frequency per layer. */
  voronoiClusterFreq: swampfloorDefaults.voronoiClusterFreq,
  /** Bottom contact shadow strength. */
  shadowStrength: swampfloorDefaults.shadowStrength,
  /** Shadow gradient start (0 = top, 1 = bottom). */
  shadowStart: swampfloorDefaults.shadowStart,
  /** Shadow gradient end. */
  shadowEnd: swampfloorDefaults.shadowEnd,
} as const;

// ─── Stones (swamp_stone) ───────────────────────────────────────────

export const STONE_SCATTER_PARAMS = {
  /** Number of stones randomly placed across the scene. */
  count: 50,
  /** Minimum stone size in pixels. */
  minSize: 10,
  /** Maximum stone size in pixels. */
  maxSize: 90,
  /** Minimum distance between stones (Poisson disk radius). */
  minDistance: 40,
  /** Screen edge margin in pixels. */
  margin: 20,
  /** Shadow X offset in pixels. */
  shadowOffsetX: -5,
  /** Shadow Y offset in pixels. */
  shadowOffsetY: 4,
  /** Shadow opacity — 0 = no shadow. */
  shadowOpacity: 0.95,
  /** Shadow RGB color. */
  shadowColor: [0.03, 0.05, 0.02] as const,
} as const;

export const STONE_SHADER_PARAMS = {
  /** Underwater tint RGB for stones. */
  underwaterTint: stoneDefaults.underwaterTint,
  /** Tint intensity. */
  underwaterTintStrength: stoneDefaults.underwaterTintStrength,
  /** Depth gradient strength. */
  underwaterDepthStrength: stoneDefaults.underwaterDepthStrength,
  /** Voronoi caustic layers count. */
  voronoiCount: stoneDefaults.voronoiCount,
  /** Voronoi cell density. */
  voronoiScale: stoneDefaults.voronoiScale,
  /** Caustic beam strength. */
  voronoiIntensity: stoneDefaults.voronoiIntensity,
  /** Bottom shadow strength. */
  shadowStrength: stoneDefaults.shadowStrength,
} as const;

// ─── Algae ──────────────────────────────────────────────────────────

export const ALGAE_SCATTER_PARAMS = {
  /** Number of algae randomly placed across the scene. */
  count: 50,
  /** Minimum algae size in pixels. */
  minSize: 70,
  /** Maximum algae size in pixels. */
  maxSize: 120,
  /** Minimum distance between algae (Poisson disk radius). */
  minDistance: 55,
  /** Screen edge margin in pixels. */
  margin: 15,
  /** Minimum rotation in radians. */
  minRotation: -0.9,
  /** Maximum rotation in radians. */
  maxRotation: 0.9,
  /** Oval width as fraction of screen width (0-1). 0 = no oval. */
  ovalWidth: 0.8,
  /** Oval height as fraction of screen height (0-1). 0 = no oval. */
  ovalHeight: 0.7,
  /** Probability algae are placed inside the oval (0-1).
   *  0 = all outside, 1 = all inside, 0.5 = equal probability. */
  ovalInsideProbability: 0.008,
  /** Shadow X offset in pixels. */
  shadowOffsetX: -20,
  /** Shadow Y offset in pixels. */
  shadowOffsetY: 90,
  /** Shadow opacity — 0 = no shadow. */
  shadowOpacity: 0.4,
  /** Shadow RGB color. */
  shadowColor: [0.02, 0.06, 0.01] as const,
} as const;

export const ALGAE_SHADER_PARAMS = {
  /** Wave travel direction in radians — 0 = right, PI = left. */
  currentAngle: algaeDeformDefaults.currentAngle,
  /** Wave height as UV fraction. */
  waveAmplitude: algaeDeformDefaults.waveAmplitude,
  /** Spatial frequency of the wave. */
  waveFreq: algaeDeformDefaults.waveFreq,
  /** Wave animation speed. */
  waveSpeed: algaeDeformDefaults.waveSpeed,
  /** Per-instance phase offset. */
  phase: algaeDeformDefaults.phase,
  /** Traveling beam brightness — 0 = disabled. */
  beamIntensity: algaeDeformDefaults.beamIntensity,
  /** Beam width — higher = thinner stripe. */
  beamSharpness: algaeDeformDefaults.beamSharpness,
  /** Beam edge waviness — 0 = straight. */
  beamDistortion: algaeDeformDefaults.beamDistortion,
  /** Beam travel speed. */
  beamSpeed: algaeDeformDefaults.beamSpeed,
  /** Per-instance beam phase offset. */
  beamPhase: algaeDeformDefaults.beamPhase,
  /** Beam RGB tint multiplier. */
  beamTint: algaeDeformDefaults.beamTint,
} as const;

// ─── Shadows (shared) ───────────────────────────────────────────────

export const SHARED_SHADOW_PARAMS = {
  shadowColor: spriteShadowDefaults.shadowColor,
  shadowOpacity: spriteShadowDefaults.shadowOpacity,
  shadowSoftness: spriteShadowDefaults.shadowSoftness,
  shadowOffset: spriteShadowDefaults.offset,
} as const;
