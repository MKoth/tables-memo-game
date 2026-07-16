import type { ComponentType, ReactNode, RefObject, MutableRefObject } from 'react';
import type { SkFont, SkImage } from '@shopify/react-native-skia';
import type { SharedValue } from 'react-native-reanimated';
import type {
  ZoneRect,
} from '../core/layout/computeExerciseLayout';
import type {
  RoamerSimBridge,
  WordSpriteLayoutBridge,
  TutorialStep,
} from '../core/types/bridgeTypes';
import type {
  SentencePromptDisplaySlot,
} from '../sentenceTransformation/domain/types';
import type {
  SentenceRoundPhase,
} from '../sentenceTransformation/domain/sentenceRoundController';
import type {
  SwimPath,
} from '../sentenceTransformation/domain/swimPathPlanner';
import type {
  LetterBubbleModel,
  InsertAnimationState,
  VariantPickerItem,
  VariantSourceLayout,
} from '../wordTransformation/domain/coreTypes';
import type {
  InsertPreviewLayout,
} from '../core/layout/exerciseLayout';
import type { RoundResolutionBubbleState } from '../sentenceTransformation/domain/roundResolutionBubbleState';
import type {
  MatchSessionController,
} from '../wordLearning/translationMatch/domain/matchSessionController';
import type { KeepOutDisk } from '../wordLearning/translationMatch/domain/wordSpriteRoaming';
import type { TableData } from '../../../data/tableData';
import type { WordOperationSequence } from '../wordTransformation/domain';

export type OptionWordSpriteState = {
  form: string;
  isCorrect: boolean;
  index: number;
};

export type ThemeSoundController = {
  startWaterflow: () => void;
  stopWaterflow: () => void;
  playRandomSplash: () => void;
  playBubbleInflate: () => void;
  playBubblePop: () => void;
  playSuccessClick: () => void;
  playWrongClick: () => void;
  playPrimaryClick: () => void;
  playFanfare: () => void;
  setMuted: (muted: boolean) => void;
  isMuted: () => boolean;
};

export type ThemeAssetsLoading = {
  phase: 'loading';
  seafloorImage: SkImage | null;
  stoneImages: Record<string, SkImage> | null;
  seaweedImages: Record<string, SkImage> | null;
  progress: number;
};

export type ThemeAssetsReady = {
  phase: 'ready';
  images: Record<string, unknown>;
  sounds: ThemeSoundController;
  progress: 100;
};

export type ThemeAssets = ThemeAssetsLoading | ThemeAssetsReady;

export type ThemeAssetsProviderValue = {
  images: Record<string, unknown>;
  sounds: ThemeSoundController;
};

export type ThemeLoadingBackdropProps = {
  width: number;
  height: number;
  seafloorImage: import('@shopify/react-native-skia').SkImage | null;
  stoneImages: Record<string, import('@shopify/react-native-skia').SkImage> | null;
  seaweedImages: Record<string, import('@shopify/react-native-skia').SkImage> | null;
};

export type ThemeTutorialStepCopy = {
  message: string;
  stepLabel: string;
  actionLabel: string;
};

export type ThemeTutorialOverrides = {
  SpotlightOverlay: ComponentType<{
    step: Exclude<TutorialStep, 'idle'>;
    width: number;
    height: number;
    gradientRadius: number;
    roamerBridge: RoamerSimBridge | null;
    wordSpriteBridge: WordSpriteLayoutBridge | null;
    fishTargetIndex: number | null;
    jellyTargetIndex: number | null;
    headerTargetIndex: number | null;
  }>;
  pickRoamerTarget: (bridge: RoamerSimBridge) => number | null;
  pickWordSpriteTarget: (bridge: WordSpriteLayoutBridge) => number | null;
  pickHeaderTarget: (bridge: WordSpriteLayoutBridge) => number | null;
  copy: Record<Exclude<TutorialStep, 'idle'>, ThemeTutorialStepCopy>;
};

export type ThemeStyleOverrides = {
  overlayDark: string;
  spotlightRingColor: string;
  guideLineColor: string;
  fishSpotlightScale: number;
  jellySpotlightScale: number;
};

export type ThemeLayoutConfig = {
  zoneRatios: {
    roamerFraction: number;
    wordSpriteInsetRatio: number;
    wordSpriteHeightFraction: number;
  };
};

export type ThemeShaders = Record<string, unknown>;

export type ThemeRoamerSwimZoneProps = {
  words: string[];
  interactive?: boolean;
  sounds?: ThemeSoundController;
  captureEnabled?: boolean;
  bubbleCaptureEnabled?: boolean;
  swimZoneZIndex?: number;
  bubbleTarget?: { centerX: number; centerY: number; diameter?: number };
  controllerRef?: RefObject<unknown>;
};

export type ThemeDecorativeRoamerLayerProps = {
  zIndex?: number;
  fishCount?: number;
};

export type ThemeWordSpriteTableLayerProps = {
  table: TableData;
  onWordSpriteSound?: (kind: 'success' | 'error' | 'primary') => void;
  interactive?: boolean;
  translationDisplayMs?: number;
  highlightedCellIndex?: number;
  extraRevealedBodyIndices?: ReadonlySet<number> | readonly number[];
  controllerRef?: RefObject<unknown>;
};

export type ThemeSentenceRowLayerProps = {
  displaySlots: SentencePromptDisplaySlot[];
  conjugatedForm: string;
  roundPos: number;
  roundPhase: SentenceRoundPhase;
  swimPaths: SwimPath[];
  blankSlotIndex: number;
  blankExiting: boolean;
  blankExitDurationMs?: number;
  poppingSlotIndex: number | null;
  onTokenTap?: () => void;
  onRowEnterComplete?: () => void;
  onPopComplete?: () => void;
  onRowExitComplete?: () => void;
};

export type ThemeOptionWordSpriteLayerProps = {
  options: OptionWordSpriteState[];
  swimPaths: SwimPath[];
  roundPhase: string;
  roundPos: number;
  correctOptionIndex: number;
  onOptionTap: (option: OptionWordSpriteState) => void;
};

export type ThemeMatchWordSpriteLayerProps = {
  words: string[];
  zIndex?: number;
  capturedEnglishSv?: SharedValue<string>;
  matchedIndicesSv?: SharedValue<number[]>;
  englishWordsByIndexSv?: SharedValue<string[]>;
  exitTargetsSv?: SharedValue<Record<number, { tx: number; ty: number }>>;
  tapDataRef?: MutableRefObject<unknown>;
  keepOutDiskSv?: SharedValue<KeepOutDisk | null>;
};

export type ThemeMatchRoamerLayerProps = {
  words: string[];
  sounds?: ThemeSoundController;
  sessionController?: MatchSessionController;
  triggerEscapeRef?: MutableRefObject<(() => void) | null>;
  tapDataRef?: MutableRefObject<unknown>;
  interactive?: boolean;
  keepOutDiskSv?: SharedValue<KeepOutDisk | null>;
};

export type ThemeTransformationBubbleLayerProps = {
  wordBubblesVisible?: boolean;
  mergeWord?: string | null;
  onMergeComplete?: () => void;
  betweenWordBubblesAndInsertFlight?: ReactNode;
  letters: LetterBubbleModel[];
  lettersInteractive: boolean;
  insertAnimation: InsertAnimationState | null;
  variantPickerVisible: boolean;
  variantPickerInteractive: boolean;
  variantPickerItems: VariantPickerItem[];
  wrongItemId?: string;
  pickerHiddenItemIds?: string[];
  poppedPickerItemIds?: string[];
  onLetterPress: (position: number) => void;
  onVariantSelect: (item: VariantPickerItem, source: VariantSourceLayout) => void;
  playPop?: () => void;
  playInflate?: () => void;
};

export type ThemeTransformationWordBubblesProps = {
  letters: LetterBubbleModel[];
  interactive?: boolean;
  insertPreview?: InsertPreviewLayout;
  mergeWord?: string | null;
  onMergeComplete?: () => void;
  onLetterPress: (position: number) => void;
  playPop?: () => void;
  playInflate?: () => void;
  zoneRect?: ZoneRect;
};

export type ThemeLetterBubbleProps = {
  char: string;
  centerX: number;
  centerY: number;
  diameter: number;
  status: 'idle' | 'wrong' | 'popped';
  image: SkImage;
  font: SkFont;
  clock: SharedValue<number>;
  initialCenterX?: number;
  initialCenterY?: number;
  initialDiameter?: number;
  skipEnter?: boolean;
  moveDurationMs?: number;
  wrongTintColor?: string;
  popDelayMs?: number;
  enterDelayMs?: number;
  onPopSound?: () => void;
  onEnterSound?: () => void;
  onEnterComplete?: () => void;
  onMoveComplete?: () => void;
  onPopComplete?: () => void;
  labelFixed?: boolean;
  letterSpacing?: number;
  wobbleBoostT?: SharedValue<number>;
};

export type ThemeResolutionBubbleProps = {
  bubble: RoundResolutionBubbleState | null;
  roundPhase: SentenceRoundPhase;
  translation?: string;
  onMaterializeComplete?: () => void;
  onResolveComplete?: () => void;
  onPopComplete?: () => void;
};

export type ThemeMergeBubblesProps = {
  word: string;
  durationMs?: number;
  onComplete?: () => void;
};

export type ThemeResolveFlightPhase = 'idle' | 'resolve' | 'hold' | 'exit';

export type ThemeResolveFlightProps = {
  phase: ThemeResolveFlightPhase;
  form: string;
  translation?: string;
  fromCenterX: number;
  fromCenterY: number;
  toCenterX: number;
  toCenterY: number;
  diameter: number;
  toSpawnX: number;
  toSpawnY: number;
  onResolveComplete?: () => void;
  onExitComplete?: () => void;
};

export type ThemeEscapeCoordinatorParams = {
  roamerControllerRef: RefObject<unknown>;
  jellyBridge: WordSpriteLayoutBridge;
  jellyRect: ZoneRect;
};

export type ThemeEscapeCoordinatorResult = (sequence: WordOperationSequence) => void;

export type ThemeCombinedMatchGestureParams = {
  wordSpriteTapDataRef: MutableRefObject<unknown>;
  roamerTapDataRef: MutableRefObject<unknown>;
  onCorrectMatchJs: (hitIdx: number) => void;
  onWrongMatchJs: (hitIdx: number) => void;
  onNeutralTapJs: (hitIdx: number) => void;
};

export type Theme = {
  scenery: ComponentType;

  roamer: {
    swimZone: ComponentType<ThemeRoamerSwimZoneProps>;
    decorative: ComponentType<ThemeDecorativeRoamerLayerProps>;
    matchLayer: ComponentType<ThemeMatchRoamerLayerProps>;
  };

  wordSprite: {
    tableCell: ComponentType<ThemeWordSpriteTableLayerProps>;
    sentenceRow: ComponentType<ThemeSentenceRowLayerProps>;
    option: ComponentType<ThemeOptionWordSpriteLayerProps>;
    match: ComponentType<ThemeMatchWordSpriteLayerProps>;
  };

  wordTransformationVisual: {
    bubbleLayer: ComponentType<ThemeTransformationBubbleLayerProps>;
    wordBubbles: ComponentType<ThemeTransformationWordBubblesProps>;
    letterBubble: ComponentType<ThemeLetterBubbleProps>;
  };

  roundResolution: {
    resolutionBubble: ComponentType<ThemeResolutionBubbleProps>;
    resolveFlight: ComponentType<ThemeResolveFlightProps>;
    mergeBubbles: ComponentType<ThemeMergeBubblesProps>;
  };

  matchExercise: {
    useCombinedGestures: (params: ThemeCombinedMatchGestureParams) => unknown;
  };

  escape: {
    useRoamerEscapeCoordinator: (
      params: ThemeEscapeCoordinatorParams,
    ) => ThemeEscapeCoordinatorResult;
  };

  tutorial: ThemeTutorialOverrides;

  loading: {
    backdrop: ComponentType<ThemeLoadingBackdropProps>;
  };

  assets: {
    useThemeAssets: () => ThemeAssets;
    AssetsProvider: ComponentType<{
      value: ThemeAssetsProviderValue;
      children: ReactNode;
    }>;
  };

  shaders: ThemeShaders;
  layoutConfig: ThemeLayoutConfig;
  styleOverrides?: ThemeStyleOverrides;
};
