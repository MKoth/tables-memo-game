import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import Orientation, {
  useDeviceOrientationChange,
  useOrientationChange,
} from 'react-native-orientation-locker';
import type { ExerciseOrientation } from './computeExerciseLayout';

/** Returns null for orientations we ignore (upside-down, unknown). */
function mapOrientation(type: string): ExerciseOrientation | null {
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

export function useExerciseDeviceOrientation(): ExerciseOrientation | null {
  const [orientation, setOrientation] = useState<ExerciseOrientation | null>(null);
  const didInitRef = useRef(false);

  const applyOrientation = useCallback((type: string) => {
    const mapped = mapOrientation(type);
    if (mapped != null) {
      setOrientation(mapped);
    }
  }, []);

  useLayoutEffect(() => {
    Orientation.lockToAllOrientationsButUpsideDown();
    Orientation.getOrientation(type => {
      applyOrientation(type);
      didInitRef.current = true;
    });
  }, [applyOrientation]);

  useOrientationChange(type => {
    if (!didInitRef.current) return;
    applyOrientation(type);
  });
  useDeviceOrientationChange(type => {
    if (!didInitRef.current) return;
    applyOrientation(type);
  });

  return orientation;
}
