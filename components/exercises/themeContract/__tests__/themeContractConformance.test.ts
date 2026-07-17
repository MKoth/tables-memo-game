jest.mock('react-native-reanimated', () => {
  const Reanimated = {
    useSharedValue: jest.fn(() => ({ value: 0 })),
    useDerivedValue: jest.fn((fn) => ({ value: fn() })),
    useAnimatedStyle: jest.fn((fn) => fn()),
    withTiming: jest.fn(),
    Easing: { out: jest.fn() },
    runOnUI: jest.fn(),
    useAnimatedReaction: jest.fn(),
    cancelAnimation: jest.fn(),
  };
  return { __esModule: true, default: Reanimated, ...Reanimated };
});

jest.mock('react-native-worklets', () => ({
  __esModule: true,
  scheduleOnRN: jest.fn(),
  runOnUI: jest.fn(),
}));

jest.mock('react-native-gesture-handler', () => ({
  __esModule: true,
  GestureDetector: ({ children }: any) => children,
  Gesture: { Tap: () => ({}) },
  useTapGesture: jest.fn(() => ({})),
}));

jest.mock('react-native-orientation-locker', () => ({
  __esModule: true,
  default: { getOrientation: jest.fn(), getDeviceOrientation: jest.fn() },
  useDeviceOrientationChange: jest.fn(),
  useOrientationChange: jest.fn(),
}));

jest.mock('@shopify/react-native-skia', () => ({
  __esModule: true,
  Canvas: ({ children }: any) => children,
  Circle: () => null,
  Line: () => null,
  Rect: () => null,
  RadialGradient: () => null,
  Group: ({ children }: any) => children,
  Glyphs: () => null,
  vec: (x: number, y: number) => ({ x, y }),
  matchFont: jest.fn(() => ({})),
  useImage: jest.fn(),
  Image: () => null,
  FilterMode: { Linear: 0, Nearest: 1 },
  MipmapMode: { Linear: 0, Nearest: 1, None: 2 },
  Skia: {
    RuntimeEffect: {
      Make: jest.fn(() => ({
        makeShaderWithChildren: jest.fn(),
        makeShader: jest.fn(),
      })),
    },
  },
  useRSXformValue: jest.fn(() => ({ value: [] })),
  useClockValue: jest.fn(() => ({ value: 0 })),
}));

jest.mock('react-native-safe-area-context', () => ({
  __esModule: true,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  SafeAreaProvider: ({ children }: any) => children,
}));

jest.mock('../../../../data/tableData', () => ({
  spanishPresentTable2Plural: {},
  getTableBodyWords: jest.fn(() => []),
}));

jest.mock('../../../../data/wordsData', () => ({
  animalsWordList: [],
  allWordLists: [],
}));

jest.mock('react-native-sound', () => {
  function Sound() {}
  Sound.setCategory = jest.fn();
  Sound.setActive = jest.fn();
  return { __esModule: true, default: Sound };
});

jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  RN.Image.resolveAssetSource = jest.fn(() => ({ uri: 'mock' }));
  return RN;
});

import type { Theme } from '../Theme';
import { underseaTheme } from '../../themes/undersea/themeBundle';

type Assert<T extends true> = T;
type IsAssignable<T, U> = T extends U ? true : false;
type UnderseaSatisfiesTheme = Assert<IsAssignable<typeof underseaTheme, Theme>>;

const _compileTimeCheck: UnderseaSatisfiesTheme = true; // eslint-disable-line @typescript-eslint/no-unused-vars

describe('Theme contract conformance', () => {
  it('undersea theme exposes all required top-level members', () => {
    const theme = underseaTheme;

    expect(theme).toHaveProperty('scenery');
    expect(theme).toHaveProperty('roamer');
    expect(theme).toHaveProperty('wordSprite');
    expect(theme).toHaveProperty('wordTransformationVisual');
    expect(theme).toHaveProperty('roundResolution');
    expect(theme).toHaveProperty('matchExercise');
    expect(theme).toHaveProperty('escape');
    expect(theme).toHaveProperty('tutorial');
    expect(theme).toHaveProperty('loading');
    expect(theme).toHaveProperty('assets');
    expect(theme).toHaveProperty('shaders');
    expect(theme).toHaveProperty('layoutConfig');
  });

  it('undersea scenery is a component', () => {
    expect(typeof underseaTheme.scenery).toBe('function');
  });

  it('undersea roamer has motionZone, decorative, and matchLayer', () => {
    expect(underseaTheme.roamer.motionZone).toBeDefined();
    expect(underseaTheme.roamer.decorative).toBeDefined();
    expect(underseaTheme.roamer.matchLayer).toBeDefined();
  });

  it('undersea wordSprite has tableCell, sentenceRow, option, and match', () => {
    expect(typeof underseaTheme.wordSprite.tableCell).toBe('function');
    expect(typeof underseaTheme.wordSprite.sentenceRow).toBe('function');
    expect(typeof underseaTheme.wordSprite.option).toBe('function');
    expect(typeof underseaTheme.wordSprite.match).toBe('function');
  });

  it('undersea wordTransformationVisual has orbLayer, wordOrbs, and letterOrb', () => {
    expect(underseaTheme.wordTransformationVisual.orbLayer).toBeDefined();
    expect(underseaTheme.wordTransformationVisual.wordOrbs).toBeDefined();
    expect(underseaTheme.wordTransformationVisual.letterOrb).toBeDefined();
  });

  it('undersea roundResolution has resolutionOrb, resolveFlight, and mergeOrbs', () => {
    expect(typeof underseaTheme.roundResolution.resolutionOrb).toBe('function');
    expect(typeof underseaTheme.roundResolution.resolveFlight).toBe('function');
    expect(typeof underseaTheme.roundResolution.mergeOrbs).toBe('function');
  });

  it('undersea matchExercise has useCombinedGestures', () => {
    expect(typeof underseaTheme.matchExercise.useCombinedGestures).toBe('function');
  });

  it('undersea escape has useRoamerEscapeCoordinator', () => {
    expect(typeof underseaTheme.escape.useRoamerEscapeCoordinator).toBe('function');
  });

  it('undersea tutorial has SpotlightOverlay, pickers, and copy', () => {
    expect(typeof underseaTheme.tutorial.SpotlightOverlay).toBe('function');
    expect(typeof underseaTheme.tutorial.pickRoamerTarget).toBe('function');
    expect(typeof underseaTheme.tutorial.pickWordSpriteTarget).toBe('function');
    expect(typeof underseaTheme.tutorial.pickHeaderTarget).toBe('function');
    expect(underseaTheme.tutorial.copy).toHaveProperty('roamer');
    expect(underseaTheme.tutorial.copy).toHaveProperty('wordSprite');
    expect(underseaTheme.tutorial.copy).toHaveProperty('translate');
  });

  it('undersea loading has backdrop', () => {
    expect(typeof underseaTheme.loading.backdrop).toBe('function');
  });

  it('undersea assets has useThemeAssets and AssetsProvider', () => {
    expect(typeof underseaTheme.assets.useThemeAssets).toBe('function');
    expect(typeof underseaTheme.assets.AssetsProvider).toBe('function');
  });

  it('undersea layoutConfig has zoneRatios', () => {
    expect(underseaTheme.layoutConfig).toHaveProperty('zoneRatios');
    expect(typeof underseaTheme.layoutConfig.zoneRatios.roamerFraction).toBe('number');
  });

  it('undersea styleOverrides are defined', () => {
    expect(underseaTheme.styleOverrides).toBeDefined();
    expect(typeof underseaTheme.styleOverrides?.overlayDark).toBe('string');
    expect(typeof underseaTheme.styleOverrides?.spotlightRingColor).toBe('string');
  });
});
