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

import { computeRoseRestPositions } from '../roseRestPositions';
import type { TableData } from '../../../../../../../data/tableData';
import type { ZoneRect } from '../../../../../core';

const SPRITE_RECT: ZoneRect = { x: 0, y: 100, w: 400, h: 300 };

const makeTable = (): TableData => ({
  id: 'test',
  title: 'Test',
  rowHeaders: ['a', 'b'],
  colHeaders: ['x', 'y'],
  body: [
    ['a-x', 'a-y'],
    ['b-x', 'b-y'],
  ],
  rowHeaderTranslations: ['A', 'B'],
  colHeaderTranslations: ['X', 'Y'],
  bodyTranslations: [
    ['ax', 'ay'],
    ['bx', 'by'],
  ],
});

describe('computeRoseRestPositions', () => {
  it('returns a point for every body cell plus header cells', () => {
    const positions = computeRoseRestPositions(makeTable(), SPRITE_RECT, 800);
    expect(positions.length).toBe(2 + 2 + 4);
  });

  it('places positions strictly inside the sprite rect', () => {
    const positions = computeRoseRestPositions(makeTable(), SPRITE_RECT, 800);
    for (const p of positions) {
      expect(p.x).toBeGreaterThanOrEqual(SPRITE_RECT.x);
      expect(p.x).toBeLessThanOrEqual(SPRITE_RECT.x + SPRITE_RECT.w);
      expect(p.y).toBeGreaterThanOrEqual(SPRITE_RECT.y);
      expect(p.y).toBeLessThanOrEqual(SPRITE_RECT.y + SPRITE_RECT.h);
    }
  });
});
