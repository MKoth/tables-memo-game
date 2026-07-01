import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { UnderseaAssetsProvider } from './UnderseaAssetsContext';
import { UnderseaLayoutProvider } from './UnderseaLayoutContext';
import { UnderseaBackground } from './UnderseaBackground';
import { UnderseaClockProvider } from './UnderseaClockContext';
import {
  UnderseaCornerControls,
  UnderseaInstructions,
} from './UnderseaInstructions';
import { UnderseaLoadingScreen } from './UnderseaLoadingScreen';
import { JellyfishTableLayer, type JellyfishSoundKind } from './JellyfishTableLayer';
import { KoiSwimZone, type KoiCaptureBridge } from './KoiSwimZone';
import type {
  JellyfishLayoutBridge,
  KoiSimBridge,
  TutorialStep,
} from './underseaInstructionTypes';
import { useUnderseaAssets } from './useUnderseaAssets';
import type { UnderseaSoundController } from './useUnderseaSounds';
import { getTableBodyWords, spanishPresentTable2Singular } from '../../../data/tableData';

/** Below jellyfish — bubble visible but jellyfish remain tappable for matching. */
const CAPTURE_OVERLAY_Z = 3;
/** Above jellyfish — fish stays visible while swimming through the table zone. */
const ESCAPE_OVERLAY_Z = 10;
const JELLYFISH_LAYER_Z = 5;

type UnderseaExerciseContentProps = {
  sounds: UnderseaSoundController;
};

function UnderseaExerciseContent({ sounds }: UnderseaExerciseContentProps) {
  const table = spanishPresentTable2Singular;
  const words = useMemo(() => getTableBodyWords(table), [table]);
  const soundsRef = useRef(sounds);
  soundsRef.current = sounds;
  const [captureBridge, setCaptureBridge] = useState<KoiCaptureBridge | null>(null);
  const [koiBridge, setKoiBridge] = useState<KoiSimBridge | null>(null);
  const [jellyBridge, setJellyBridge] = useState<JellyfishLayoutBridge | null>(null);
  const [tutorialStep, setTutorialStep] = useState<TutorialStep>('idle');
  const [helpVisible, setHelpVisible] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);

  const handleCaptureBridgeChange = useCallback((bridge: KoiCaptureBridge | null) => {
    setCaptureBridge(prev => {
      if (bridge == null) {
        return null;
      }
      if (
        prev != null &&
        prev.capturedWord === bridge.capturedWord &&
        prev.overlay != null
      ) {
        return { ...bridge, overlay: prev.overlay };
      }
      return bridge;
    });
  }, []);

  const handleJellyfishMatchSuccess = useCallback(
    (targetX: number, targetY: number, hitIdx: number) => {
      setHelpVisible(false);
      captureBridge?.onMatchSuccess?.(targetX, targetY, hitIdx);
    },
    [captureBridge],
  );

  const handleTutorialDismiss = useCallback(() => {
    setTutorialStep('idle');
    setHelpVisible(false);
  }, []);

  const handleTutorialNext = useCallback(() => {
    setTutorialStep(prev => {
      if (prev === 'fish') {
        return 'jellyfish';
      }
      if (prev === 'jellyfish') {
        return 'translate';
      }
      return prev;
    });
  }, []);

  const handleJellyfishSound = useCallback((kind: JellyfishSoundKind) => {
    if (kind === 'success') {
      soundsRef.current.playSuccessClick();
      return;
    }
    if (kind === 'error') {
      soundsRef.current.playWrongClick();
      return;
    }
    soundsRef.current.playPrimaryClick();
  }, []);

  useEffect(() => {
    sounds.startWaterflow();
    return () => {
      sounds.stopWaterflow();
    };
  }, [sounds]);

  useEffect(() => {
    sounds.setMuted(!soundEnabled);
  }, [sounds, soundEnabled]);

  const handleSoundToggle = useCallback(() => {
    setSoundEnabled(prev => !prev);
  }, []);

  const tutorialActive = tutorialStep !== 'idle';

  return (
    <UnderseaClockProvider>
      <View style={styles.container}>
        <UnderseaBackground />
        <KoiSwimZone
          words={words}
          interactive={!tutorialActive}
          sounds={sounds}
          onCaptureBridgeChange={handleCaptureBridgeChange}
          onSimBridgeChange={setKoiBridge}
        />
        {captureBridge?.overlay != null && (
          <View
            style={[
              styles.captureOverlay,
              {
                zIndex: captureBridge.escapeOverlayActive
                  ? ESCAPE_OVERLAY_Z
                  : CAPTURE_OVERLAY_Z,
              },
            ]}
            pointerEvents={
              captureBridge.escapeOverlayActive ? 'none' : 'box-none'
            }>
            {captureBridge.overlay}
          </View>
        )}
        <View style={styles.jellyfishLayer} pointerEvents="box-none">
          <JellyfishTableLayer
            table={table}
            capturedWord={captureBridge?.capturedWord ?? null}
            bubblePhase={captureBridge?.bubblePhase}
            onMatchSuccess={handleJellyfishMatchSuccess}
            onJellyfishSound={handleJellyfishSound}
            interactive={!tutorialActive}
            onLayoutBridgeChange={setJellyBridge}
          />
        </View>
        {tutorialActive && (
          <UnderseaInstructions
            step={tutorialStep}
            koiBridge={koiBridge}
            jellyBridge={jellyBridge}
            onNext={handleTutorialNext}
            onDismiss={handleTutorialDismiss}
          />
        )}
        <UnderseaCornerControls
          soundEnabled={soundEnabled}
          onSoundToggle={handleSoundToggle}
          onHelpPress={() => setTutorialStep('fish')}
          helpVisible={helpVisible}
          helpDisabled={tutorialActive}
        />
      </View>
    </UnderseaClockProvider>
  );
}

export function UnderseaTableExercise() {
  const assets = useUnderseaAssets();

  if (assets.phase !== 'ready') {
    return (
      <UnderseaLoadingScreen
        seafloorImage={assets.seafloorImage}
        stoneImages={assets.stoneImages}
        seaweedImages={assets.seaweedImages}
        progress={assets.progress}
      />
    );
  }

  return (
    <UnderseaAssetsProvider value={{ images: assets.images, sounds: assets.sounds }}>
      <UnderseaLayoutProvider>
        <UnderseaExerciseContent sounds={assets.sounds} />
      </UnderseaLayoutProvider>
    </UnderseaAssetsProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  captureOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    overflow: 'visible',
  },
  jellyfishLayer: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    zIndex: JELLYFISH_LAYER_Z,
  },
});
