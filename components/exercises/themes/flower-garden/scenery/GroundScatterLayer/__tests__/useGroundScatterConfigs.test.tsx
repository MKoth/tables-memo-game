jest.mock('@shopify/react-native-skia', () => ({
  Canvas: ({ children }: any) => children,
  Circle: () => null,
  Rect: () => null,
  Group: ({ children }: any) => children,
  Glyphs: () => null,
  vec: (x: number, y: number) => ({ x, y }),
  matchFont: () => ({}),
  Image: () => null,
}));

jest.mock('react-native-reanimated', () => ({
  useDerivedValue: (fn: () => unknown) => ({ value: fn() }),
  useSharedValue: (initial: number) => ({ value: initial }),
  withTiming: (value: number) => value,
  Easing: { inOut: () => (t: number) => t, cubic: (t: number) => t },
}));

jest.mock('react-native-orientation-locker', () => ({
  default: { getOrientation: () => 'portrait', getDeviceOrientation: () => 'portrait' },
  useDeviceOrientationChange: () => undefined,
  useOrientationChange: () => undefined,
}));

jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  RN.useWindowDimensions = () => ({ width: 430, height: 932 });
  return RN;
});

jest.mock('../../../../../core/providers/ExerciseLayoutProvider', () => ({
  useExerciseLayout: () => ({
    spriteRect: { x: 0, y: 0, w: 430, h: 932 },
    roamerRect: { x: 0, y: 0, w: 430, h: 932 },
    screenWidth: 430,
    screenHeight: 932,
  }),
}));

import ReactTestRenderer from 'react-test-renderer';
import { useGroundScatterConfigs } from '../useGroundScatterConfigs';

describe('useGroundScatterConfigs', () => {
  it('keeps band sprites inside the screen when the ground band starts at the bottom edge', () => {
    let configs: ReturnType<typeof useGroundScatterConfigs> = [];
    function Probe() {
      configs = useGroundScatterConfigs({ kind: 'band', variantCount: 6 });
      return null;
    }
    ReactTestRenderer.act(() => {
      ReactTestRenderer.create(<Probe />);
    });

    expect(configs.length).toBe(60);
    for (const config of configs) {
      expect(config.y).toBeGreaterThanOrEqual(0);
      expect(config.y).toBeLessThanOrEqual(932);
      expect(config.x).toBeGreaterThanOrEqual(0);
      expect(config.x).toBeLessThanOrEqual(430);
    }
  });
});
