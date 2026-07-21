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

jest.mock('react-native-orientation-locker', () => ({
  __esModule: true,
  default: { getOrientation: jest.fn(), getDeviceOrientation: jest.fn() },
  useDeviceOrientationChange: jest.fn(),
  useOrientationChange: jest.fn(),
}));

jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  RN.Image.resolveAssetSource = jest.fn(() => ({ uri: 'mock' }));
  return RN;
});

import { computeGroundBand, GROUND_BAND_HEIGHT_RATIO } from '../groundBand';
import type { ZoneRect } from '../../../../../core';

const SPRITE_RECT: ZoneRect = { x: 0, y: 100, w: 400, h: 300 };

describe('computeGroundBand', () => {
  it('starts at the bottom of the sprite rect and extends downward', () => {
    const band = computeGroundBand(SPRITE_RECT, 800, 0.2);
    expect(band.x).toBe(SPRITE_RECT.x);
    expect(band.y).toBe(SPRITE_RECT.y + SPRITE_RECT.h);
    expect(band.w).toBe(SPRITE_RECT.w);
  });

  it('clamps to a minimum band height', () => {
    const band = computeGroundBand(SPRITE_RECT, 800, 0.01);
    expect(band.h).toBe(40);
  });

  it('uses the GROUND_BAND_HEIGHT_RATIO by default', () => {
    const band = computeGroundBand(SPRITE_RECT, 1000);
    expect(band.h).toBe(1000 * GROUND_BAND_HEIGHT_RATIO);
  });
});
