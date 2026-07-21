jest.mock('@shopify/react-native-skia', () => ({
  Canvas: ({ children }: any) => children,
  Circle: () => null,
  Line: () => null,
  Rect: () => null,
  RadialGradient: () => null,
  Group: ({ children }: any) => children,
  Glyphs: () => null,
  vec: (x: number, y: number) => ({ x, y }),
  matchFont: () => ({}),
  useImage: () => null,
  Image: () => null,
  FilterMode: { Linear: 0, Nearest: 1 },
  MipmapMode: { Linear: 0, Nearest: 1, None: 2 },
  Skia: {
    RuntimeEffect: {
      Make: () => ({
        makeShaderWithChildren: () => undefined,
        makeShader: () => undefined,
      }),
    },
  },
  useRSXformValue: () => ({ value: [] }),
  useClockValue: () => ({ value: 0 }),
}));

jest.mock('react-native-reanimated', () => ({
  useDerivedValue: (fn: () => unknown) => ({ value: fn() }),
  useSharedValue: (initial: number) => ({ value: initial }),
  withTiming: (value: number) => value,
  Easing: { inOut: () => (t: number) => t, cubic: (t: number) => t },
}));

jest.mock('react-native-worklets', () => ({
  scheduleOnRN: (fn: () => void) => fn(),
}));

jest.mock('react-native-orientation-locker', () => ({
  default: { getOrientation: () => 'portrait', getDeviceOrientation: () => 'portrait' },
  useDeviceOrientationChange: () => undefined,
  useOrientationChange: () => undefined,
}));

jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  RN.Image.resolveAssetSource = () => ({ uri: 'mock' });
  RN.useWindowDimensions = () => ({ width: 400, height: 800 });
  return RN;
});

jest.mock('../../../../../core/providers/ExerciseLayoutProvider', () => ({
  useExerciseLayout: () => ({
    spriteRect: { x: 0, y: 100, w: 400, h: 300 },
    roamerRect: { x: 0, y: 400, w: 400, h: 400 },
    screenWidth: 400,
    screenHeight: 800,
  }),
}));

import ReactTestRenderer from 'react-test-renderer';
import { useBushConfigs } from '../useBushConfigs';
import type { TableData } from '../../../../../../../data/tableData';

const makeTable = (id: string): TableData => ({
  id,
  title: id,
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

let lastResult: unknown = null;
let lastError: unknown = null;

function HookHost({ table }: { table: TableData | null }) {
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    lastResult = useBushConfigs(table);
  } catch (e) {
    lastError = e;
  }
  return null;
}

describe('useBushConfigs', () => {
  beforeEach(() => {
    lastResult = null;
    lastError = null;
  });

  it('returns an empty array when table is null', () => {
    ReactTestRenderer.act(() => {
      ReactTestRenderer.create(<HookHost table={null} />);
    });
    if (lastError) throw lastError;
    expect(lastResult).toEqual([]);
  });

  it('returns a bush config array with one stem per body cell', () => {
    const table = makeTable('t1');
    ReactTestRenderer.act(() => {
      ReactTestRenderer.create(<HookHost table={table} />);
    });
    if (lastError) throw lastError;
    const result = lastResult as Array<{ stems: Array<{ roseIndex: number }> }>;
    const allRoses = result.flatMap(b => b.stems.map(s => s.roseIndex)).sort();
    expect(allRoses).toEqual([0, 1, 2, 3]);
  });

  it('produces identical output across re-renders for the same table id', () => {
    const table = makeTable('t2');
    let renderer: ReactTestRenderer.ReactTestRenderer;
    ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(<HookHost table={table} />);
    });
    if (lastError) throw lastError;
    const first = JSON.stringify(lastResult);
    ReactTestRenderer.act(() => {
      renderer!.update(<HookHost table={table} />);
    });
    const second = JSON.stringify(lastResult);
    expect(second).toBe(first);
  });

  it('produces different output for a different table id', () => {
    const a = makeTable('table-a');
    const b = makeTable('table-b');
    ReactTestRenderer.act(() => {
      ReactTestRenderer.create(<HookHost table={a} />);
    });
    if (lastError) throw lastError;
    const firstA = JSON.stringify(lastResult);
    lastResult = null;
    ReactTestRenderer.act(() => {
      ReactTestRenderer.create(<HookHost table={b} />);
    });
    if (lastError) throw lastError;
    const firstB = JSON.stringify(lastResult);
    expect(firstA).not.toBe(firstB);
  });
});
