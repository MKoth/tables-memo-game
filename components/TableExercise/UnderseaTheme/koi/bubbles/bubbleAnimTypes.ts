export const BubblePhase = {
  None: -1,
  Enter: 0,
  Idle: 1,
  Burst: 2,
} as const;

export const BurstIntent = {
  Release: 0,
  Escape: 1,
} as const;

export type BurstIntentValue = (typeof BurstIntent)[keyof typeof BurstIntent];

export type BubbleAnimState = {
  x: number;
  y: number;
  diameter: number;
  centerX: number;
  centerY: number;
  wobbleAmp: number;
  wobbleSpeed: number;
  wobbleLobes: number;
  opacity: number;
  labelOpacity: number;
  captureVisualT: number;
};

export type BubbleAnimationConfig = {
  originX: number;
  originY: number;
  targetCenterX: number;
  targetCenterY: number;
  targetDiameter: number;
};

export type UseBubbleAnimationResult = {
  anim: import('react-native-reanimated').SharedValue<BubbleAnimState>;
  phase: import('react-native-reanimated').SharedValue<number>;
  enterProgress: import('react-native-reanimated').SharedValue<number>;
  startBurst: (intent?: BurstIntentValue) => void;
};
