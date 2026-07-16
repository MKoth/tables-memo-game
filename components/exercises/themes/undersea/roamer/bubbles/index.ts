export {
  BubblePhase,
  BurstIntent,
  isTapInsideBubble,
  useBubbleAnimation,
  type BubbleAnimState,
  type BubbleAnimationConfig,
  type BurstIntentValue,
  type UseBubbleAnimationResult,
} from './useBubbleAnimation';

export { BubbleInstance, type BubbleInstanceProps } from './BubbleInstance';
export { RoamerWordBubble, type RoamerWordBubbleProps } from './RoamerWordBubble';
export {
  BUBBLE_BURST_DURATION_MS,
  BUBBLE_BURST_SCALE,
  BUBBLE_BURST_WOBBLE,
  BUBBLE_ENTER_DURATION_MS,
  BUBBLE_ENTER_WOBBLE,
  BUBBLE_FISH_CLIP_INSET,
  BUBBLE_FISH_SCALE,
  BUBBLE_FISH_SWIM_MARGIN_RATIO,
  BUBBLE_FISH_VISUAL_REACH_MULT,
  BUBBLE_IDLE_OPACITY,
  BUBBLE_IDLE_WOBBLE,
  BUBBLE_SHADOW_OFFSET_MULT,
  BUBBLE_SPAWN_OFFSET_Y,
  BUBBLE_START_DIAMETER_RATIO,
  ROAMER_FISH_LENGTH,
} from './bubbleAnimPresets';
