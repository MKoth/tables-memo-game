export * from './domain';
export {
  useWordTransformationGame,
  type InsertAnimationPhase,
  type InsertAnimationState,
  type InsertFlightState,
  type LetterBubbleModel,
  type TransformationMode,
  type VariantSourceLayout,
  type WordTransformationGame,
  type WordTransitionPhase,
  type WordTransitionState,
} from './hooks/useWordTransformationGame';
export {
  TransformationWordBubbles,
  computeLetterLayout,
  previewCenterForLetter,
  TRANSFORMATION_VARIANT_ROW_Y_RATIO,
  TRANSFORMATION_WORD_ROW_Y_RATIO,
  type InsertPreviewLayout,
  type LetterLayout,
} from './components/TransformationWordBubbles';
export {
  TransformationInsertFlight,
  type TransformationInsertFlightProps,
} from './components/TransformationInsertFlight';
export {
  TransformationVariantPicker,
  type TransformationVariantPickerProps,
  type VariantPickerItem,
  type VariantPickerSourceLayout,
} from './components/TransformationVariantPicker';
export { LetterBubble, type LetterBubbleStatus } from './components/LetterBubble';
