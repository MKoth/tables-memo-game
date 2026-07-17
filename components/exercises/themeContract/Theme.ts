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
  MotionPath,
} from '../sentenceTransformation/domain/motionPathPlanner';
import type {
  LetterOrbModel,
  InsertAnimationState,
  VariantPickerItem,
  VariantSourceLayout,
} from '../wordTransformation/domain/coreTypes';
import type {
  InsertPreviewLayout,
} from '../core/layout/exerciseLayout';
import type { RoundResolutionOrbState } from '../sentenceTransformation/domain/roundResolutionOrbState';
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
  startAmbient: () => void;
  stopAmbient: () => void;
  playRandomBurst: () => void;
  playOrbInflate: () => void;
  playOrbPop: () => void;
  playSuccessClick: () => void;
  playWrongClick: () => void;
  playPrimaryClick: () => void;
  playFanfare: () => void;
  setMuted: (muted: boolean) => void;
  isMuted: () => boolean;
};

export type ThemeAssetsLoading = {
  phase: 'loading';
  backgroundImage: SkImage | null;
  decorationImages: Record<string, SkImage> | null;
  accentImages: Record<string, SkImage> | null;
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
  backgroundImage: import('@shopify/react-native-skia').SkImage | null;
  decorationImages: Record<string, import('@shopify/react-native-skia').SkImage> | null;
  accentImages: Record<string, import('@shopify/react-native-skia').SkImage> | null;
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
    roamerTargetIndex: number | null;
    spriteTargetIndex: number | null;
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
  roamerSpotlightScale: number;
  spriteSpotlightScale: number;
};

export type ThemeLayoutConfig = {
  zoneRatios: {
    roamerFraction: number;
    wordSpriteInsetRatio: number;
    wordSpriteHeightFraction: number;
  };
};

export type ThemeShaders = Record<string, unknown>;

export type ThemeRoamerMotionZoneProps = {
  words: string[];
  interactive?: boolean;
  sounds?: ThemeSoundController;
  captureEnabled?: boolean;
  orbCaptureEnabled?: boolean;
  motionZoneZIndex?: number;
  orbTarget?: { centerX: number; centerY: number; diameter?: number };
  controllerRef?: RefObject<unknown>;
};

export type ThemeDecorativeRoamerLayerProps = {
  zIndex?: number;
  roamerCount?: number;
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
  motionPaths: MotionPath[];
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
  motionPaths: MotionPath[];
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

export type ThemeTransformationOrbLayerProps = {
  wordOrbsVisible?: boolean;
  mergeWord?: string | null;
  onMergeComplete?: () => void;
  betweenWordOrbsAndInsertFlight?: ReactNode;
  letters: LetterOrbModel[];
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

export type ThemeTransformationWordOrbsProps = {
  letters: LetterOrbModel[];
  interactive?: boolean;
  insertPreview?: InsertPreviewLayout;
  mergeWord?: string | null;
  onMergeComplete?: () => void;
  onLetterPress: (position: number) => void;
  playPop?: () => void;
  playInflate?: () => void;
  zoneRect?: ZoneRect;
};

export type ThemeLetterOrbProps = {
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

export type ThemeResolutionOrbProps = {
  orb: RoundResolutionOrbState | null;
  roundPhase: SentenceRoundPhase;
  translation?: string;
  onMaterializeComplete?: () => void;
  onResolveComplete?: () => void;
  onPopComplete?: () => void;
};

export type ThemeMergeOrbsProps = {
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
  spriteBridge: WordSpriteLayoutBridge;
  spriteRect: ZoneRect;
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
    motionZone: ComponentType<ThemeRoamerMotionZoneProps>;
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
    orbLayer: ComponentType<ThemeTransformationOrbLayerProps>;
    wordOrbs: ComponentType<ThemeTransformationWordOrbsProps>;
    letterOrb: ComponentType<ThemeLetterOrbProps>;
  };

  roundResolution: {
    resolutionOrb: ComponentType<ThemeResolutionOrbProps>;
    resolveFlight: ComponentType<ThemeResolveFlightProps>;
    mergeOrbs: ComponentType<ThemeMergeOrbsProps>;
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
