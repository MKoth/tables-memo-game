import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { useAnimatedReaction } from 'react-native-reanimated';
import { useExerciseLayout } from '../../../../../../core';
import { useFlowerGardenAssetsContext } from '../../../../core/providers/FlowerGardenAssetsProvider';
import { RoamerLayer } from '../../../../roamer/RoamerLayer';
import { useRoamerSimulation } from '../../../../roamer/core/useRoamerSimulation';
import { generateOrbPetalConfigs } from '../../../../orb/generateOrbPetalConfigs';
import { createRng, hashSeedString } from '../../../../scenery/BushShaderLayer/helpers/seededRandom';
import { CaptureOrb } from '../../../../orb/CaptureOrb';
import { OrbPhase, useOrbAnimation } from '../../../../orb/useOrbAnimation';
import { ORB_DIAMETER_RATIO, ORB_RING_CONFIGS } from '../../../../orb/orbAnimPresets';
import type { ThemeMatchRoamerLayerProps } from '../../../../../../themeContract';
import type { RoamerRuntimeEntry } from '../../../../roamer/core/types';
import type { KeepOutDisk } from '../../../../../../wordLearning/translationMatch/domain/wordSpriteRoaming';

const MATCH_ROAMER_Z = 3;
const MATCH_ORB_Z = 6;

export function FlowerGardenMatchRoamerLayer({
  words,
  sounds,
  sessionController,
  triggerEscapeRef,
  tapDataRef,
  interactive = true,
  keepOutDiskSv,
}: ThemeMatchRoamerLayerProps) {
  const { width, height } = useWindowDimensions();
  const layout = useExerciseLayout();
  const { roamerRect, screenWidth, screenHeight, layoutKey } = layout;
  const { images } = useFlowerGardenAssetsContext();
  const orbPetalImagesReady = images.orbPetalImages != null;

  const sim = useRoamerSimulation({
    words,
    width: screenWidth,
    height: screenHeight,
    roamerRect,
    layoutKey,
  });

  const petalSeed = useMemo(() => hashSeedString('flower-garden-orb-match'), []);
  const petals = useMemo(
    () =>
      generateOrbPetalConfigs({
        rng: createRng(petalSeed),
      }),
    [petalSeed],
  );

  const [selection, setSelection] = useState<{
    roamerIndex: number;
    originX: number;
    originY: number;
  } | null>(null);
  const soundsRef = useRef(sounds);
  soundsRef.current = sounds;

  const targetCenterX = width * 0.5;
  const targetCenterY = height * 0.5;
  const targetDiameter = Math.min(width, height) * ORB_DIAMETER_RATIO;

  const orbConfig = useMemo(
    () => ({
      originX: selection?.originX ?? targetCenterX,
      originY: selection?.originY ?? targetCenterY,
      targetCenterX,
      targetCenterY,
      targetDiameter,
    }),
    [
      selection?.originX,
      selection?.originY,
      targetCenterX,
      targetCenterY,
      targetDiameter,
    ],
  );

  const handleDismiss = useCallback(() => {
    setSelection(null);
  }, []);

  const { anim, phase, startBurst } = useOrbAnimation(
    orbConfig,
    ORB_RING_CONFIGS,
    petals,
    handleDismiss,
    selection != null,
  );

  useAnimatedReaction(
    () => phase.value,
    (currentPhase, prevPhase) => {
      if (keepOutDiskSv == null) {
        return;
      }
      if (currentPhase === OrbPhase.Idle) {
        keepOutDiskSv.value = {
          centerX: targetCenterX,
          centerY: targetCenterY,
          radius: targetDiameter * 0.5,
        } satisfies KeepOutDisk;
      } else if (
        prevPhase != null &&
        prevPhase === OrbPhase.Idle &&
        currentPhase !== OrbPhase.Idle
      ) {
        keepOutDiskSv.value = null;
      }
    },
    [keepOutDiskSv, targetCenterX, targetCenterY, targetDiameter],
  );

  const armCapture = useCallback(
    (roamerIndex: number, originX: number, originY: number) => {
      soundsRef.current?.playOrbInflate();
      setSelection({ roamerIndex, originX, originY });
    },
    [],
  );

  useEffect(() => {
    if (!triggerEscapeRef) {
      return;
    }
    const previous = triggerEscapeRef.current;
    triggerEscapeRef.current = () => {
      if (previous) {
        previous();
      }
      soundsRef.current?.playOrbPop();
      startBurst();
    };
    return () => {
      triggerEscapeRef.current = previous;
    };
  }, [startBurst, triggerEscapeRef]);

  if (tapDataRef) {
    tapDataRef.current = {
      armCapture: (roamerIndex: number, originX: number, originY: number) => {
        if (sessionController) {
          const ok = sessionController.captureRoamer(roamerIndex, '');
          if (!ok) {
            return;
          }
        }
        armCapture(roamerIndex, originX, originY);
      },
      startBurst,
    };
  }

  const capturedEntry: RoamerRuntimeEntry | null =
    selection != null ? sim.runtimeEntries[selection.roamerIndex] ?? null : null;

  if (width === 0 || height === 0) {
    return null;
  }

  return (
    <>
      <View
        style={[styles.container, { zIndex: MATCH_ROAMER_Z }]}
        pointerEvents={interactive ? 'box-none' : 'none'}
      >
        <RoamerLayer
          words={words}
          interactive={interactive}
          sim={sim}
        />
      </View>
      {capturedEntry != null && orbPetalImagesReady && (
        <View
          style={[styles.container, { zIndex: MATCH_ORB_Z }]}
          pointerEvents="none"
        >
          <CaptureOrb
            anim={anim}
            capturedEntry={capturedEntry}
            petals={petals}
            centerX={targetCenterX}
            centerY={targetCenterY}
          />
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    overflow: 'visible',
  },
});
