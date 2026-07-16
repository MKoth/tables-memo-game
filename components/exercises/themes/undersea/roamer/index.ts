export { RoamerSwimZone, type RoamerCaptureBridge, type RoamerSwimZoneBubbleTarget, type RoamerSwimZoneController, type RoamerSwimZoneProps } from './RoamerSwimZone/RoamerSwimZone';
export { DecorativeRoamerLayer, DECORATIVE_ROAMER_COUNT, type DecorativeRoamerLayerProps } from './DecorativeRoamerLayer/DecorativeRoamerLayer';
export { RoamerFishLayer, type RoamerFishLayerProps } from './roamerFish';
export {
  useRoamerFishSimulation,
  type RoamerFishSimulation,
  type RoamerCaptureSharedState,
} from './simulation/useRoamerFishSimulation';
export type { FishRuntime, RoamerRuntimeEntry, RoamerSpawn } from './simulation/types';
export {
  BubblePhase,
  BurstIntent,
  useBubbleAnimation,
  type BubbleAnimState,
  type BurstIntentValue,
} from './bubbles';
