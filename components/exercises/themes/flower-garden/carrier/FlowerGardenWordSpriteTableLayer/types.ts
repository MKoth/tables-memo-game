import type { RefObject } from 'react';
import type { TableData } from '../../../../../../data/tableData';

export type FlowerWordSpriteSoundKind = 'success' | 'error' | 'primary';

export type FlowerWordSpriteTableLayerController = {
  revealBodyLabel: (cellIndex: number) => void;
};

export type FlowerWordSpriteTableLayerProps = {
  table: TableData;
  onWordSpriteSound?: (kind: FlowerWordSpriteSoundKind) => void;
  interactive?: boolean;
  /** How long (ms) a tapped visible label shows its translation before reverting. */
  translationDisplayMs?: number;
  highlightedCellIndex?: number;
  /** Additional body labels to show without requiring a roamer match first. */
  extraRevealedBodyIndices?: ReadonlySet<number> | readonly number[];
  controllerRef?: RefObject<FlowerWordSpriteTableLayerController | null>;
};

export type FlowerCellConfig = {
  key: string;
  index: number;
  gridCol: number;
  gridRow: number;
  isHeader: boolean;
  label: string;
  translation: string;
  bellSize: number;
};

export type FlowerWordSpriteTableLayerInnerProps = {
  table: TableData;
  roseBudImage: import('@shopify/react-native-skia').SkImage;
  roseCenterImage: import('@shopify/react-native-skia').SkImage;
  petalImages: readonly import('@shopify/react-native-skia').SkImage[];
  rosePetalAtlas: import('@shopify/react-native-skia').SkImage;
  capturedWord: string | null;
  orbPhase?: import('react-native-reanimated').SharedValue<number>;
  onMatchSuccess?: (targetX: number, targetY: number, hitIdx: number) => void;
  onWordSpriteSound?: (kind: FlowerWordSpriteSoundKind) => void;
  interactive: boolean;
  translationDisplayMs: number;
  highlightedCellIndex: number;
  extraRevealedBodyIndices?: ReadonlySet<number> | readonly number[];
  controllerRef?: RefObject<FlowerWordSpriteTableLayerController | null>;
};
