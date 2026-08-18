import type { Theme } from '../../themeContract';
import { SwampThemeScenery } from './scenery';
import { useSwampThemeAssets } from './core/assets/useSwampThemeAssets';
import { SwampThemeAssetsProvider } from './core/providers/SwampThemeAssetsProvider';
import { SwampLoadingBackdrop } from './ui/loading/SwampLoadingBackdrop';

function Stub() {
  return null;
}

function useNoopStub() {
  return {};
}

export const swampTheme: Theme = {
  scenery: SwampThemeScenery,

  roamer: {
    motionZone: Stub as Theme['roamer']['motionZone'],
    decorative: Stub as Theme['roamer']['decorative'],
    matchLayer: Stub as Theme['roamer']['matchLayer'],
  },

  wordSprite: {
    tableCell: Stub as Theme['wordSprite']['tableCell'],
    sentenceRow: Stub as Theme['wordSprite']['sentenceRow'],
    option: Stub as Theme['wordSprite']['option'],
    match: Stub as Theme['wordSprite']['match'],
  },

  wordTransformationVisual: {
    scene: Stub as Theme['wordTransformationVisual']['scene'],
  },

  roundResolution: {
    resolutionOrb: Stub as Theme['roundResolution']['resolutionOrb'],
    resolveFlight: Stub as Theme['roundResolution']['resolveFlight'],
    mergeOrbs: Stub as Theme['roundResolution']['mergeOrbs'],
  },

  matchExercise: {
    useCombinedGestures: useNoopStub as Theme['matchExercise']['useCombinedGestures'],
  },

  escape: {
    useRoamerEscapeCoordinator: useNoopStub as unknown as Theme['escape']['useRoamerEscapeCoordinator'],
  },

  tutorial: {
    SpotlightOverlay: Stub as Theme['tutorial']['SpotlightOverlay'],
    pickRoamerTarget: () => null,
    pickWordSpriteTarget: () => null,
    pickHeaderTarget: () => null,
    copy: {
      roamer: {
        message: 'Tap any creature to catch it.',
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
    backdrop: SwampLoadingBackdrop,
  },

  assets: {
    useThemeAssets: useSwampThemeAssets as Theme['assets']['useThemeAssets'],
    AssetsProvider: SwampThemeAssetsProvider as unknown as Theme['assets']['AssetsProvider'],
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
    overlayDark: 'rgba(10, 26, 8, 0.65)',
    spotlightRingColor: '#4a7a3d',
    guideLineColor: '#6b9a5c',
    roamerSpotlightScale: 1.2,
    spriteSpotlightScale: 1.1,
  },
};
