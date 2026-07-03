import React, { useMemo } from 'react';
import { Platform, StyleSheet } from 'react-native';
import { Canvas, matchFont } from '@shopify/react-native-skia';
import { useUnderseaThemeAssetsContext } from '../../core/providers/UnderseaThemeAssetsProvider';
import { useUnderseaThemeClock } from '../../core/clock/UnderseaThemeClockProvider';
import { LetterBubble } from './LetterBubble';
import type { InsertAnimationState } from '../hooks/useWordTransformationGame';

export type TransformationInsertFlightProps = {
  flight: InsertAnimationState;
};

export function TransformationInsertFlight({ flight }: TransformationInsertFlightProps) {
  const { images } = useUnderseaThemeAssetsContext();
  const clock = useUnderseaThemeClock();
  const landed = flight.phase === 'dismiss';

  const fontFamily = Platform.select({ ios: 'Helvetica', default: 'sans-serif' });
  const font = useMemo(() => {
    const singleLetter = flight.char.length === 1;
    const fontSize = singleLetter
      ? Math.max(16, flight.toDiameter * 0.5)
      : Math.max(
          14,
          (flight.toDiameter * 0.5) / Math.max(1, flight.char.length * 0.52),
        );
    return matchFont({
      fontFamily,
      fontSize,
      fontWeight: '700',
    });
  }, [flight.char.length, flight.toDiameter, fontFamily]);

  return (
    <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
      <LetterBubble
        char={flight.char}
        centerX={flight.toCenterX}
        centerY={flight.toCenterY}
        diameter={flight.toDiameter}
        initialCenterX={landed ? flight.toCenterX : flight.fromCenterX}
        initialCenterY={landed ? flight.toCenterY : flight.fromCenterY}
        initialDiameter={landed ? flight.toDiameter : flight.fromDiameter}
        skipEnter
        moveDurationMs={landed ? 0 : flight.flyDurationMs}
        status="idle"
        image={images.bubble}
        font={font}
        clock={clock}
      />
    </Canvas>
  );
}
