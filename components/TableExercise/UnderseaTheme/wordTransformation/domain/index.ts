export {
  OPERATION_TYPES,
  type DiffOp,
  type Operation,
  type OperationType,
  type WordOperationSequence,
  type WordTransformationExercise,
} from './types';
export {
  diffToOps,
  generateSequentialLetterChoices,
  generateWordOperations,
  generateWrongVariants,
  type LetterChoice,
} from './generateOperations';
export {
  bodyCellIndex,
  createWordTransformationExercise,
} from './createWordTransformationExercise';
