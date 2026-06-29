import React, { useCallback, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { UnderseaBackground } from './UnderseaBackground';
import { UnderseaClockProvider } from './UnderseaClockContext';
import { JellyfishTableLayer } from './JellyfishTableLayer';
import { KoiSwimZone, type KoiCaptureBridge } from './KoiSwimZone';
import { getTableBodyWords, spanishPresentTable2Singular } from '../../../data/tableData';

/** Below jellyfish — bubble visible but jellyfish remain tappable for matching. */
const CAPTURE_OVERLAY_Z = 3;
/** Above jellyfish — fish stays visible while swimming through the table zone. */
const ESCAPE_OVERLAY_Z = 10;
const JELLYFISH_LAYER_Z = 5;

export function UnderseaTableExercise() {
  const table = spanishPresentTable2Singular;
  const words = useMemo(() => getTableBodyWords(table), [table]);
  const [captureBridge, setCaptureBridge] = useState<KoiCaptureBridge | null>(null);

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

  return (
    <UnderseaClockProvider>
      <View style={styles.container}>
        <UnderseaBackground />
        <KoiSwimZone words={words} onCaptureBridgeChange={handleCaptureBridgeChange} />
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
            pointerEvents="box-none">
            {captureBridge.overlay}
          </View>
        )}
        <View style={styles.jellyfishLayer} pointerEvents="box-none">
          <JellyfishTableLayer
            table={table}
            capturedWord={captureBridge?.capturedWord ?? null}
            bubblePhase={captureBridge?.bubblePhase}
            onMatchSuccess={captureBridge?.onMatchSuccess}
          />
        </View>
      </View>
    </UnderseaClockProvider>
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
