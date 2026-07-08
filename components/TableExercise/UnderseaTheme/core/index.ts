export {
  computeOffScreenEscapeTarget,
  computeUnderseaThemeLayout,
  escapeExitEdgeCode,
  type ControlsAnchor,
  type EscapeExitEdge,
  type UnderseaThemeLayout,
  type UnderseaThemeOrientation,
  type ZoneRect,
} from './layout/computeUnderseaThemeLayout';
export { useUnderseaThemeDeviceOrientation } from './layout/useUnderseaThemeDeviceOrientation';
export type { LayoutBounds } from './layout/layoutBounds';
export {
  LAYOUT_ZONE_HEIGHT_RATIO,
  LAYOUT_ZONE_TOP_RATIO,
} from './layout/zoneLayoutConstants';

export {
  UnderseaThemeClockProvider,
  UNDERSEA_SCENE_CLOCK_FPS,
  useUnderseaThemeClock,
  useUnderseaThemeClockQuantized,
} from './clock/UnderseaThemeClockProvider';
export { useThrottledClock, type ThrottledClock } from './clock/useThrottledClock';

export {
  UnderseaThemeLayoutProvider,
  useUnderseaThemeLayout,
} from './providers/UnderseaThemeLayoutProvider';
export {
  UnderseaThemeRuntimeProvider,
  useUnderseaThemeRuntime,
} from './providers/UnderseaThemeRuntimeProvider';
export {
  UnderseaThemeAssetsProvider,
  useUnderseaThemeAssetsContext,
} from './providers/UnderseaThemeAssetsProvider';

export { useUnderseaThemeAssets } from './assets/useUnderseaThemeAssets';
export type { UnderseaThemeImages } from './assets/underseaThemeAssets';
export type { UnderseaThemeSoundController } from './assets/useUnderseaThemeSounds';

export {
  createUnderseaThemeExerciseStore,
  UnderseaThemeExerciseStoreProvider,
  useUnderseaThemeExerciseStore,
  TABLE_EXERCISE_STORE_CONFIG,
  WORD_TRANSFORMATION_STORE_CONFIG,
  type UnderseaThemeExerciseState,
  type UnderseaThemeExerciseStore,
  type UnderseaThemeExerciseStoreConfig,
} from './store/createUnderseaThemeExerciseStore';

export type {
  JellyfishLayoutBridge,
  KoiCaptureBridge,
  KoiFishRuntimePosition,
  KoiSimBridge,
  TutorialStep,
} from './types/bridgeTypes';

export {
  useWordTransformationCoreBridge,
  type UseWordTransformationCoreBridgeParams,
  type UseWordTransformationCoreBridgeResult,
} from './hooks/useWordTransformationCoreBridge';
