export * from './domain';
export {
  useWordTransformationGame,
  type WordTransformationGame,
  type WordTransitionPhase,
  type WordTransitionState,
} from './hooks/useWordTransformationGame';
export {
  computeLetterLayout,
  previewCenterForLetter,
  TRANSFORMATION_VARIANT_ROW_Y_RATIO,
  TRANSFORMATION_WORD_ROW_Y_RATIO,
  type InsertPreviewLayout,
  type LetterLayout,
} from '../core/layout/underseaExerciseLayout';
export {
  TransformationBubbleLayer,
  type TransformationBubbleLayerProps,
} from './components/TransformationBubbleLayer';
export {
  TransformationWordBubbles,
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
