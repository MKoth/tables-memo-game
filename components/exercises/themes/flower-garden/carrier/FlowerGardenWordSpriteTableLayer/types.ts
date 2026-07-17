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
  highlightedCellIndex?: number;
  controllerRef?: RefObject<FlowerWordSpriteTableLayerController | null>;
};

export type FlowerCellConfig = {
  key: string;
  index: number;
  gridCol: number;
  gridRow: number;
  isHeader: boolean;
  bellSize: number;
};

export type FlowerWordSpriteTableLayerInnerProps = {
  table: TableData;
  roseBudImage: import('@shopify/react-native-skia').SkImage;
  interactive: boolean;
  highlightedCellIndex: number;
  controllerRef?: RefObject<FlowerWordSpriteTableLayerController | null>;
};
