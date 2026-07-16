import type { Theme } from '../../themeContract';
import { UnderseaThemeScenery } from './scenery';
import { RoamerSwimZone } from './roamer';
import { DecorativeRoamerLayer } from './roamer/DecorativeRoamerLayer/DecorativeRoamerLayer';
import { MatchRoamerLayer } from './exercises/wordLearning/translationMatch/components/MatchRoamerLayer';
import { WordSpriteTableLayer } from './carrier';
import { WordSpriteSentenceRowLayer } from './exercises/sentenceTransformation/components/WordSpriteSentenceRowLayer/WordSpriteSentenceRowLayer';
import { OptionWordSpriteLayer } from './exercises/variantSelection/components/OptionWordSpriteLayer';
import { MatchWordSpriteLayer } from './exercises/wordLearning/translationMatch/components/MatchWordSpriteLayer';
import { TransformationBubbleLayer } from './exercises/wordTransformation/components/TransformationBubbleLayer';
import { TransformationWordBubbles } from './exercises/wordTransformation/components/TransformationWordBubbles';
import { LetterBubble } from './exercises/wordTransformation/components/LetterBubble';
import { TransformationRoundResolutionBubble } from './exercises/sentenceTransformation/components/TransformationRoundResolutionBubble';
import { TransformationMergeBubbles } from './exercises/sentenceTransformation/components/TransformationMergeBubbles';
import { VariantSelectionResolveFlight } from './exercises/variantSelection/components/VariantSelectionResolveFlight';
import { useCombinedMatchGestures } from './exercises/wordLearning/translationMatch/wordSprite/useCombinedMatchGestures';
import { useRoamerEscapeCoordinator } from './roamer/escape/useRoamerEscapeCoordinator';
import { TutorialSpotlightOverlay } from './ui/instructions/components/TutorialSpotlightOverlay';
import {
  pickRandomFishIndex,
  pickRandomJellyIndex,
  pickRandomHeaderJellyIndex,
} from './ui/instructions/helpers/tutorialTargets';
import {
  OVERLAY_DARK,
  SPOTLIGHT_RING_COLOR,
  GUIDE_LINE_COLOR,
  FISH_SPOTLIGHT_SCALE,
  JELLY_SPOTLIGHT_SCALE,
} from './ui/instructions/themeConstants';
import { useUnderseaThemeAssets } from './core/assets/useUnderseaThemeAssets';
import { UnderseaThemeAssetsProvider } from './core/providers/UnderseaThemeAssetsProvider';
import { LoadingBackdrop } from './ui/loading/LoadingBackdrop';

export const underseaTheme: Theme = {
  scenery: UnderseaThemeScenery,

  roamer: {
    swimZone: RoamerSwimZone as Theme['roamer']['swimZone'],
    decorative: DecorativeRoamerLayer as Theme['roamer']['decorative'],
    matchLayer: MatchRoamerLayer as Theme['roamer']['matchLayer'],
  },

  wordSprite: {
    tableCell: WordSpriteTableLayer as Theme['wordSprite']['tableCell'],
    sentenceRow: WordSpriteSentenceRowLayer as Theme['wordSprite']['sentenceRow'],
    option: OptionWordSpriteLayer as Theme['wordSprite']['option'],
    match: MatchWordSpriteLayer as Theme['wordSprite']['match'],
  },

  wordTransformationVisual: {
    bubbleLayer: TransformationBubbleLayer as Theme['wordTransformationVisual']['bubbleLayer'],
    wordBubbles: TransformationWordBubbles as Theme['wordTransformationVisual']['wordBubbles'],
    letterBubble: LetterBubble as Theme['wordTransformationVisual']['letterBubble'],
  },

  roundResolution: {
    resolutionBubble: TransformationRoundResolutionBubble as Theme['roundResolution']['resolutionBubble'],
    resolveFlight: VariantSelectionResolveFlight as Theme['roundResolution']['resolveFlight'],
    mergeBubbles: TransformationMergeBubbles as Theme['roundResolution']['mergeBubbles'],
  },

  matchExercise: {
    useCombinedGestures: useCombinedMatchGestures as Theme['matchExercise']['useCombinedGestures'],
  },

  escape: {
    useRoamerEscapeCoordinator: useRoamerEscapeCoordinator as Theme['escape']['useRoamerEscapeCoordinator'],
  },

  tutorial: {
    SpotlightOverlay: TutorialSpotlightOverlay as Theme['tutorial']['SpotlightOverlay'],
    pickRoamerTarget: pickRandomFishIndex,
    pickWordSpriteTarget: pickRandomJellyIndex,
    pickHeaderTarget: pickRandomHeaderJellyIndex,
    copy: {
      roamer: {
        message: 'Tap any fish to catch it in a bubble.',
        stepLabel: '1/3',
        actionLabel: 'Next',
      },
      wordSprite: {
        message: 'Select the matching wordSprite using the table rules.',
        stepLabel: '2/3',
        actionLabel: 'Next',
      },
      translate: {
        message: 'Tap any row or column header wordSprite to see its English translation.',
        stepLabel: '3/3',
        actionLabel: 'Got it!',
      },
    },
  },

  loading: {
    backdrop: LoadingBackdrop,
  },

  assets: {
    useThemeAssets: useUnderseaThemeAssets as Theme['assets']['useThemeAssets'],
    AssetsProvider: UnderseaThemeAssetsProvider as Theme['assets']['AssetsProvider'],
  },

  shaders: {},

  layoutConfig: {
    zoneRatios: {
      roamerFraction: 0.5,
      wordSpriteInsetRatio: 0.11,
      wordSpriteHeightFraction: 0.33,
    },
  },

  styleOverrides: {
    overlayDark: OVERLAY_DARK,
    spotlightRingColor: SPOTLIGHT_RING_COLOR,
    guideLineColor: GUIDE_LINE_COLOR,
    fishSpotlightScale: FISH_SPOTLIGHT_SCALE,
    jellySpotlightScale: JELLY_SPOTLIGHT_SCALE,
  },
};
