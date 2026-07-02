import { useCallback, useLayoutEffect, useState } from 'react';
import Orientation, {
  useDeviceOrientationChange,
  useOrientationChange,
} from 'react-native-orientation-locker';
import type { UnderseaThemeOrientation } from './computeUnderseaThemeLayout';

/** Returns null for orientations we ignore (upside-down, unknown). */
function mapOrientation(type: string): UnderseaThemeOrientation | null {
  if (type === 'PORTRAIT-UPSIDEDOWN' || type === 'PORTRAIT-UPSIDE-DOWN') {
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

function readInitialOrientation(): UnderseaThemeOrientation {
  return mapOrientation(Orientation.getInitialOrientation()) ?? 'portrait';
}

export function useDeviceOrientation(): UnderseaThemeOrientation {
  const [orientation, setOrientation] = useState<UnderseaThemeOrientation>(readInitialOrientation);

  const applyOrientation = useCallback((type: string) => {
    const mapped = mapOrientation(type);
    if (mapped != null) {
      setOrientation(mapped);
    }
  }, []);

  useLayoutEffect(() => {
    Orientation.lockToAllOrientationsButUpsideDown();
  }, []);

  useOrientationChange(applyOrientation);
  useDeviceOrientationChange(applyOrientation);

  return orientation;
}
