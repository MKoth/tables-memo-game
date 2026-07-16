import type { RefObject } from 'react';
import type { TableData } from '../../../../../../data/tableData';

export type WordSpriteSoundKind = 'success' | 'error' | 'primary';

export type WordSpriteTableLayerController = {
  revealBodyLabel: (cellIndex: number) => void;
};

export type WordSpriteTableLayerProps = {
  table: TableData;
  onWordSpriteSound?: (kind: WordSpriteSoundKind) => void;
  interactive?: boolean;
  /** How long (ms) a tapped visible label shows its translation before reverting. */
  translationDisplayMs?: number;
  /** Body/header cell index to keep highlighted with the primary tint. -1 = none. */
  highlightedCellIndex?: number;
  /** Additional body labels to show without requiring a roamer match first. */
  extraRevealedBodyIndices?: ReadonlySet<number> | readonly number[];
  controllerRef?: RefObject<WordSpriteTableLayerController | null>;
};

export type WordSpriteTableLayerInnerProps = {
  table: TableData;
  bellImage: import('@shopify/react-native-skia').SkImage;
  tentacleImage: import('@shopify/react-native-skia').SkImage;
  capturedWord: string | null;
  bubblePhase?: import('react-native-reanimated').SharedValue<number>;
  onMatchSuccess?: (targetX: number, targetY: number, hitIdx: number) => void;
  onWordSpriteSound?: (kind: WordSpriteSoundKind) => void;
  interactive: boolean;
  translationDisplayMs: number;
  highlightedCellIndex: number;
  extraRevealedBodyIndices?: ReadonlySet<number> | readonly number[];
  controllerRef?: RefObject<WordSpriteTableLayerController | null>;
};
