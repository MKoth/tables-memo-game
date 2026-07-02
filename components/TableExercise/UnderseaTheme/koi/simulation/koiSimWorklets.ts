export {
  clamp,
  KOI_BASE_SPEED_MAX,
  lerp,
  lerpAngle,
  normalizeAngle,
} from './fishSimCommon';

export { rollTargetBaseSpeed, shouldTriggerSpeedSplash } from './fishSimSpeed';
export {
  applyFinSideSpawn,
  finSquashAtPhase,
  nextFinRerollDelay,
  rollFinSideSpawn,
} from './fishFinSpawn';
export { createFishRuntime } from './createFishRuntime';
export { updateFish } from './updateFish';
export {
  fishCrossedExitComplete,
  fishCrossedExitDismiss,
  isFishEliminated,
} from './fishExitWorklets';
