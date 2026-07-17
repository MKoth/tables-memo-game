import type { Theme } from '../../themeContract';
import { FlowerGardenScenery } from './scenery/FlowerGardenScenery';
import { FlowerGardenRoamerMotionZone } from './roamer/FlowerGardenRoamerMotionZone';
import { FlowerGardenDecorativeRoamerLayer } from './roamer/FlowerGardenDecorativeRoamerLayer';
import { FlowerGardenMatchRoamerLayer } from './exercises/wordLearning/translationMatch/components/FlowerGardenMatchRoamerLayer';
import { FlowerGardenWordSpriteTableLayer } from './carrier/FlowerGardenWordSpriteTableLayer';
import { FlowerGardenWordSpriteSentenceRowLayer } from './exercises/sentenceTransformation/components/FlowerGardenWordSpriteSentenceRowLayer';
import { FlowerGardenOptionWordSpriteLayer } from './exercises/variantSelection/components/FlowerGardenOptionWordSpriteLayer';
import { FlowerGardenMatchWordSpriteLayer } from './exercises/wordLearning/translationMatch/components/FlowerGardenMatchWordSpriteLayer';
import { FlowerGardenTransformationOrbLayer } from './exercises/wordTransformation/components/FlowerGardenTransformationOrbLayer';
import { FlowerGardenTransformationWordOrbs } from './exercises/wordTransformation/components/FlowerGardenTransformationWordOrbs';
import { FlowerGardenLetterOrb } from './exercises/wordTransformation/components/FlowerGardenLetterOrb';
import { FlowerGardenTransformationRoundResolutionOrb } from './exercises/sentenceTransformation/components/FlowerGardenTransformationRoundResolutionOrb';
import { FlowerGardenTransformationMergeOrbs } from './exercises/sentenceTransformation/components/FlowerGardenTransformationMergeOrbs';
import { FlowerGardenVariantSelectionResolveFlight } from './exercises/variantSelection/components/FlowerGardenVariantSelectionResolveFlight';
import { useFlowerGardenCombinedMatchGestures } from './exercises/wordLearning/translationMatch/flowerGarden/useFlowerGardenCombinedMatchGestures';
import { useFlowerGardenRoamerEscapeCoordinator } from './carrier/escape/useFlowerGardenRoamerEscapeCoordinator';
import { FlowerGardenTutorialSpotlightOverlay } from './ui/instructions/components/FlowerGardenTutorialSpotlightOverlay';
import {
  pickFlowerGardenRandomRoamerIndex,
  pickFlowerGardenRandomSpriteIndex,
  pickFlowerGardenRandomHeaderSpriteIndex,
} from './ui/instructions/flowerGardenTutorialTargets';
import {
  FLOWER_GARDEN_OVERLAY_DARK,
  FLOWER_GARDEN_SPOTLIGHT_RING_COLOR,
  FLOWER_GARDEN_GUIDE_LINE_COLOR,
  FLOWER_GARDEN_ROAMER_SPOTLIGHT_SCALE,
  FLOWER_GARDEN_SPRITE_SPOTLIGHT_SCALE,
} from './ui/instructions/flowerGardenThemeConstants';
import { useFlowerGardenThemeAssets } from './core/assets/useFlowerGardenThemeAssets';
import { FlowerGardenAssetsProvider } from './core/providers/FlowerGardenAssetsProvider';
import { FlowerGardenLoadingBackdrop } from './ui/loading/FlowerGardenLoadingBackdrop';

export const flowerGardenTheme: Theme = {
  scenery: FlowerGardenScenery,

  roamer: {
    motionZone: FlowerGardenRoamerMotionZone as Theme['roamer']['motionZone'],
    decorative: FlowerGardenDecorativeRoamerLayer as Theme['roamer']['decorative'],
    matchLayer: FlowerGardenMatchRoamerLayer as Theme['roamer']['matchLayer'],
  },

  wordSprite: {
    tableCell: FlowerGardenWordSpriteTableLayer as Theme['wordSprite']['tableCell'],
    sentenceRow: FlowerGardenWordSpriteSentenceRowLayer as Theme['wordSprite']['sentenceRow'],
    option: FlowerGardenOptionWordSpriteLayer as Theme['wordSprite']['option'],
    match: FlowerGardenMatchWordSpriteLayer as Theme['wordSprite']['match'],
  },

  wordTransformationVisual: {
    orbLayer: FlowerGardenTransformationOrbLayer as Theme['wordTransformationVisual']['orbLayer'],
    wordOrbs: FlowerGardenTransformationWordOrbs as Theme['wordTransformationVisual']['wordOrbs'],
    letterOrb: FlowerGardenLetterOrb as Theme['wordTransformationVisual']['letterOrb'],
  },

  roundResolution: {
    resolutionOrb: FlowerGardenTransformationRoundResolutionOrb as Theme['roundResolution']['resolutionOrb'],
    resolveFlight: FlowerGardenVariantSelectionResolveFlight as Theme['roundResolution']['resolveFlight'],
    mergeOrbs: FlowerGardenTransformationMergeOrbs as Theme['roundResolution']['mergeOrbs'],
  },

  matchExercise: {
    useCombinedGestures: useFlowerGardenCombinedMatchGestures as Theme['matchExercise']['useCombinedGestures'],
  },

  escape: {
    useRoamerEscapeCoordinator: useFlowerGardenRoamerEscapeCoordinator as Theme['escape']['useRoamerEscapeCoordinator'],
  },

  tutorial: {
    SpotlightOverlay: FlowerGardenTutorialSpotlightOverlay as Theme['tutorial']['SpotlightOverlay'],
    pickRoamerTarget: pickFlowerGardenRandomRoamerIndex,
    pickWordSpriteTarget: pickFlowerGardenRandomSpriteIndex,
    pickHeaderTarget: pickFlowerGardenRandomHeaderSpriteIndex,
    copy: {
      roamer: {
        message: 'Tap any creature to catch it in an orb.',
        stepLabel: '1/3',
        actionLabel: 'Next',
      },
      wordSprite: {
        message: 'Select the matching word using the table rules.',
        stepLabel: '2/3',
        actionLabel: 'Next',
      },
      translate: {
        message: 'Tap any row or column header to see its English translation.',
        stepLabel: '3/3',
        actionLabel: 'Got it!',
      },
    },
  },

  loading: {
    backdrop: FlowerGardenLoadingBackdrop,
  },

  assets: {
    useThemeAssets: useFlowerGardenThemeAssets as Theme['assets']['useThemeAssets'],
    AssetsProvider: FlowerGardenAssetsProvider as Theme['assets']['AssetsProvider'],
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
    overlayDark: FLOWER_GARDEN_OVERLAY_DARK,
    spotlightRingColor: FLOWER_GARDEN_SPOTLIGHT_RING_COLOR,
    guideLineColor: FLOWER_GARDEN_GUIDE_LINE_COLOR,
    roamerSpotlightScale: FLOWER_GARDEN_ROAMER_SPOTLIGHT_SCALE,
    spriteSpotlightScale: FLOWER_GARDEN_SPRITE_SPOTLIGHT_SCALE,
  },
};
