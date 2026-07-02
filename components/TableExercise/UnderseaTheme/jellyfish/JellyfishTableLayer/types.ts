import type { TableData } from '../../../../../data/tableData';

export type JellyfishSoundKind = 'success' | 'error' | 'primary';

export type JellyfishTableLayerProps = {
  table: TableData;
  onJellyfishSound?: (kind: JellyfishSoundKind) => void;
  interactive?: boolean;
  /** How long (ms) a tapped visible label shows its translation before reverting. */
  translationDisplayMs?: number;
};

export type JellyfishTableLayerInnerProps = {
  table: TableData;
  bellImage: import('@shopify/react-native-skia').SkImage;
  tentacleImage: import('@shopify/react-native-skia').SkImage;
  capturedWord: string | null;
  bubblePhase?: import('react-native-reanimated').SharedValue<number>;
  onMatchSuccess?: (targetX: number, targetY: number, hitIdx: number) => void;
  onJellyfishSound?: (kind: JellyfishSoundKind) => void;
  interactive: boolean;
  translationDisplayMs: number;
};
