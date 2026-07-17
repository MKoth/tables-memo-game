import type { ThemeEscapeCoordinatorParams, ThemeEscapeCoordinatorResult } from '../../../../themeContract';
import type { WordOperationSequence } from '../../../../wordTransformation/domain/types';

export function useFlowerGardenRoamerEscapeCoordinator(
  _params: ThemeEscapeCoordinatorParams,
): ThemeEscapeCoordinatorResult {
  return (_sequence: WordOperationSequence) => {};
}
