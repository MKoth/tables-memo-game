export {
  buildSentenceTransformationRounds,
  createSentenceTransformationExercise,
  expandSentencePromptSlots,
  shuffleIndices,
  validateSentencePromptsForTable,
  type CreateSentenceTransformationExerciseOptions,
  type SentencePromptDisplaySlot,
  type SentenceTransformationExercise,
  type SentenceTransformationRound,
} from './domain';
export {
  useSentenceTransformationGame,
  type SentenceTransformationGame,
  type UseSentenceTransformationGameParams,
} from './hooks/useSentenceTransformationGame';
export { JellyfishSentenceRowLayer } from './components/JellyfishSentenceRowLayer/JellyfishSentenceRowLayer';
