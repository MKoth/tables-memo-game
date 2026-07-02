import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useWindowDimensions } from 'react-native';
import type { UnderseaOrientation } from './underseaLayout';

type OrientationApi = {
  getOrientation: (cb: (type: string) => void) => void;
  getDeviceOrientation: (cb: (type: string) => void) => void;
  addOrientationListener: (cb: (type: string) => void) => void;
  removeOrientationListener: (cb: (type: string) => void) => void;
  addDeviceOrientationListener: (cb: (type: string) => void) => void;
  removeDeviceOrientationListener: (cb: (type: string) => void) => void;
  lockToAllOrientationsButUpsideDown?: () => void;
};

function loadOrientationApi(): OrientationApi | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('react-native-orientation-locker') as {
      default?: OrientationApi;
    };
    return mod.default ?? null;
  } catch {
    return null;
  }
}

function inferOrientationFromWindow(
  width: number,
  height: number,
): UnderseaOrientation {
  return width > height ? 'landscapeLeft' : 'portrait';
}

function isUpsideDown(type: string): boolean {
  return type === 'PORTRAIT-UPSIDEDOWN' || type === 'PORTRAIT-UPSIDE-DOWN';
}

/** Returns null for orientations we ignore (upside-down, unknown). */
function mapOrientation(type: string): UnderseaOrientation | null {
  if (isUpsideDown(type)) {
    return null;
  }
  switch (type) {
    case 'LANDSCAPE-LEFT':
      return 'landscapeLeft';
    case 'LANDSCAPE-RIGHT':
      return 'landscapeRight';
    case 'PORTRAIT':
      return 'portrait';
    default:
      return null;
  }
}

export function useDeviceOrientation(): UnderseaOrientation {
  const { width, height } = useWindowDimensions();
  const hasNativeApiRef = useRef(false);
  const [orientation, setOrientation] = useState<UnderseaOrientation>(() =>
    inferOrientationFromWindow(width, height),
  );

  useLayoutEffect(() => {
    const api = loadOrientationApi();
    hasNativeApiRef.current = api != null;
    api?.lockToAllOrientationsButUpsideDown?.();
  }, []);

  useEffect(() => {
    const api = loadOrientationApi();
    hasNativeApiRef.current = api != null;

    if (api == null) {
      return;
    }

    const apply = (type: string) => {
      const mapped = mapOrientation(type);
      if (mapped != null) {
        setOrientation(mapped);
      }
    };

    api.getOrientation(apply);
    api.getDeviceOrientation(apply);

    const onUiOrientation = (type: string) => apply(type);
    const onDeviceOrientation = (type: string) => apply(type);
    api.addOrientationListener(onUiOrientation);
    api.addDeviceOrientationListener(onDeviceOrientation);

    return () => {
      api.removeOrientationListener(onUiOrientation);
      api.removeDeviceOrientationListener(onDeviceOrientation);
    };
  }, []);

  useEffect(() => {
    if (hasNativeApiRef.current) {
      return;
    }
    setOrientation(inferOrientationFromWindow(width, height));
  }, [width, height]);

  return orientation;
}
