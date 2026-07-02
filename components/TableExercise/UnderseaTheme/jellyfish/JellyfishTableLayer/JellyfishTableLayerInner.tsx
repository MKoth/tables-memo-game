/**
 * JellyfishTableLayer inner implementation — layout, motion, gestures, and render.
 */

import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Platform, StyleSheet, View, useWindowDimensions } from 'react-native';
import { Canvas, matchFont } from '@shopify/react-native-skia';
import { useSharedValue } from 'react-native-reanimated';
import { GestureDetector } from 'react-native-gesture-handler';
import { BubblePhase } from '../../koi/bubbles';
import { useUnderseaThemeLayout } from '../../core/providers/UnderseaThemeLayoutProvider';
import { useUnderseaThemeRuntime } from '../../core/providers/UnderseaThemeRuntimeProvider';
import { useUnderseaThemeClockQuantized } from '../../core/clock/UnderseaThemeClockProvider';
import {
  BODY_FONT_SIZE,
  HEADER_FONT_SIZE,
  JELLYFISH_CLOCK_FPS,
} from './config/jellyfishTableLayerConfig';
import { CellJellyfish } from './components/CellJellyfish';
import { CellLabel } from './components/CellLabel';
import {
  buildLayoutParticles,
  createCellConfigs,
  sortDrawOrder,
} from './helpers/cellConfigBuilders';
import { useJellyfishTableGestures } from './gestures/useJellyfishTableGestures';
import { useJellyfishMotionLoop } from './motion/useJellyfishMotionLoop';
import {
  computeJellyfishSizing,
  computeLayoutPositions,
  type LayoutBounds,
  type LayoutParticle,
} from './layout/computeJellyfishLayout';
import type { JellyfishSoundKind, JellyfishTableLayerInnerProps } from './types';

export type { JellyfishSoundKind, JellyfishTableLayerProps } from './types';

export function JellyfishTableLayerInner({
  table,
  bellImage,
  tentacleImage,
  capturedWord,
  bubblePhase,
  onMatchSuccess,
  onJellyfishSound,
  interactive,
  translationDisplayMs,
}: JellyfishTableLayerInnerProps) {
  const { publishJellyBridge } = useUnderseaThemeRuntime();
  const { height } = useWindowDimensions();
  const { jellyRect, labelRotationRad } = useUnderseaThemeLayout();
  const clock = useUnderseaThemeClockQuantized(JELLYFISH_CLOCK_FPS);

  const nGridCols = table.colHeaders.length + 1;
  const nGridRows = table.rowHeaders.length + 1;

  const sizing = useMemo(
    () =>
      computeJellyfishSizing({
        zoneWidth: jellyRect.w,
        zoneHeight: jellyRect.h,
        nGridCols,
        nGridRows,
      }),
    [jellyRect.w, jellyRect.h, nGridCols, nGridRows],
  );

  const fontFamily = Platform.select({ ios: 'Helvetica', default: 'sans-serif' });

  const bodyFont = useMemo(
    () =>
      matchFont({
        fontFamily,
        fontSize: BODY_FONT_SIZE * sizing.fontScale,
        fontWeight: '500',
      }),
    [fontFamily, sizing.fontScale],
  );

  const headerFont = useMemo(
    () =>
      matchFont({
        fontFamily,
        fontSize: HEADER_FONT_SIZE * sizing.fontScale,
        fontWeight: 'bold',
      }),
    [fontFamily, sizing.fontScale],
  );

  const cellConfigs = useMemo(() => createCellConfigs(table, sizing), [table, sizing]);
  const bodyCellIndices = useMemo(
    () => cellConfigs.filter(c => !c.isHeader).map(c => c.index),
    [cellConfigs],
  );
  const headerCellIndices = useMemo(
    () => cellConfigs.filter(c => c.isHeader).map(c => c.index),
    [cellConfigs],
  );
  const drawOrder = useMemo(() => sortDrawOrder(cellConfigs), [cellConfigs]);
  const layoutParticles = useMemo(() => buildLayoutParticles(cellConfigs), [cellConfigs]);
  const [revealedBodyIndices, setRevealedBodyIndices] = useState<ReadonlySet<number>>(
    () => new Set(),
  );
  const [translatedIndices, setTranslatedIndices] = useState<ReadonlySet<number>>(
    () => new Set(),
  );
  const cellLabelsSv = useSharedValue<string[]>([]);
  const capturedWordSv = useSharedValue('');
  const fallbackBubblePhase = useSharedValue<number>(BubblePhase.None);
  const effectiveBubblePhase = bubblePhase ?? fallbackBubblePhase;
  const onMatchSuccessRef = useRef(onMatchSuccess);
  const onJellyfishSoundRef = useRef(onJellyfishSound);

  useEffect(() => {
    onMatchSuccessRef.current = onMatchSuccess;
  }, [onMatchSuccess]);

  useEffect(() => {
    onJellyfishSoundRef.current = onJellyfishSound;
  }, [onJellyfishSound]);

  useEffect(() => {
    setRevealedBodyIndices(new Set());
    setTranslatedIndices(new Set());
  }, [table]);

  useEffect(() => {
    cellLabelsSv.value = cellConfigs.map(c => c.label);
  }, [cellConfigs, cellLabelsSv]);

  useEffect(() => {
    capturedWordSv.value = capturedWord ?? '';
  }, [capturedWord, capturedWordSv]);

  const revealBodyLabel = useCallback((hitIdx: number) => {
    setRevealedBodyIndices(prev => {
      if (prev.has(hitIdx)) {
        return prev;
      }
      return new Set(prev).add(hitIdx);
    });
  }, []);

  const flashTranslationJs = useCallback(
    (hitIdx: number) => {
      const config = cellConfigs[hitIdx];
      if (config == null || config.translation.length === 0) {
        return;
      }
      if (!config.isHeader && !revealedBodyIndices.has(hitIdx)) {
        return;
      }
      setTranslatedIndices(prev => new Set(prev).add(hitIdx));
      setTimeout(() => {
        setTranslatedIndices(prev => {
          if (!prev.has(hitIdx)) {
            return prev;
          }
          const next = new Set(prev);
          next.delete(hitIdx);
          return next;
        });
      }, translationDisplayMs);
    },
    [cellConfigs, revealedBodyIndices, translationDisplayMs],
  );

  const handleMatchSuccessJs = useCallback(
    (targetX: number, targetY: number, hitIdx: number) => {
      revealBodyLabel(hitIdx);
      onMatchSuccessRef.current?.(targetX, targetY, hitIdx);
    },
    [revealBodyLabel],
  );

  const handleJellyfishSoundJs = useCallback((kind: JellyfishSoundKind) => {
    onJellyfishSoundRef.current?.(kind);
  }, []);

  const layoutBounds: LayoutBounds = useMemo(
    () => ({
      width: jellyRect.w,
      height,
      nGridCols,
      nGridRows,
      zoneLeft: jellyRect.x,
      zoneTop: jellyRect.y,
      zoneHeight: jellyRect.h,
      scaleMin: sizing.scaleMin,
      scaleMax: sizing.scaleMax,
      edgeSqueeze: sizing.edgeSqueeze,
      spreadBoost: sizing.spreadBoost,
    }),
    [height, jellyRect, nGridCols, nGridRows, sizing],
  );

  // ── Layout state ────────────────────────────────────────────────────────

  const biasX = useSharedValue(0);
  const biasY = useSharedValue(0);
  const motionAngle = useSharedValue(0);
  const motionAmp = useSharedValue(0);
  const retainedLabelRotation = useSharedValue(0);
  const isDragging = useSharedValue(0);
  const prevBiasX = useSharedValue(0);
  const prevBiasY = useSharedValue(0);
  const layoutX = useSharedValue<number[]>([]);
  const layoutY = useSharedValue<number[]>([]);
  const layoutScale = useSharedValue<number[]>([]);
  /** -1 = spawn tint; 0/1/2 = primary/error/success preset while flashing. */
  const tintFlashPreset = useSharedValue<number[]>([]);
  const tintFlashUntil = useSharedValue<number[]>([]);

  // Mirror layout inputs into shared values so the frame callback always reads
  // the latest grid/bounds without relying on closure capture.
  const layoutBoundsSv = useSharedValue<LayoutBounds>(layoutBounds);
  const layoutParticlesSv = useSharedValue<LayoutParticle[]>(layoutParticles);
  const cellBellSizesSv = useSharedValue<number[]>([]);
  const cellGridColsSv = useSharedValue<number[]>([]);
  const cellGridRowsSv = useSharedValue<number[]>([]);
  const appliedBiasX = useSharedValue(Number.NaN);
  const appliedBiasY = useSharedValue(Number.NaN);
  const lastLayoutTs = useSharedValue(-1);
  const biasCoastPending = useSharedValue(0);
  const isBiasCoasting = useSharedValue(0);

  useEffect(() => {
    layoutBoundsSv.value = layoutBounds;
    layoutParticlesSv.value = layoutParticles;
    cellBellSizesSv.value = cellConfigs.map(c => c.bellSize);
    cellGridColsSv.value = cellConfigs.map(c => c.gridCol);
    cellGridRowsSv.value = cellConfigs.map(c => c.gridRow);
    const layout = computeLayoutPositions(layoutParticles, layoutBounds, 0, 0);
    layoutX.value = layout.xs;
    layoutY.value = layout.ys;
    layoutScale.value = layout.scales;
    tintFlashPreset.value = cellConfigs.map(() => -1);
    tintFlashUntil.value = cellConfigs.map(() => 0);
    appliedBiasX.value = 0;
    appliedBiasY.value = 0;
    prevBiasX.value = 0;
    prevBiasY.value = 0;
    lastLayoutTs.value = -1;
  }, [
    layoutBounds,
    layoutParticles,
    cellConfigs,
    layoutBoundsSv,
    layoutParticlesSv,
    cellBellSizesSv,
    cellGridColsSv,
    cellGridRowsSv,
    layoutX,
    layoutY,
    layoutScale,
    tintFlashPreset,
    tintFlashUntil,
    appliedBiasX,
    appliedBiasY,
    prevBiasX,
    prevBiasY,
    lastLayoutTs,
  ]);

  useLayoutEffect(() => {
    publishJellyBridge({
      layoutX,
      layoutY,
      layoutScale,
      bodyCellIndices,
      headerCellIndices,
      bellSizes: cellConfigs.map(c => c.bellSize),
    });
  }, [
    bodyCellIndices,
    headerCellIndices,
    cellConfigs,
    layoutScale,
    layoutX,
    layoutY,
    publishJellyBridge,
  ]);
  const { motionLoopEngaged, activateMotionLoop } = useJellyfishMotionLoop({
    biasX,
    biasY,
    appliedBiasX,
    appliedBiasY,
    prevBiasX,
    prevBiasY,
    lastLayoutTs,
    layoutParticlesSv,
    layoutBoundsSv,
    layoutX,
    layoutY,
    layoutScale,
    isDragging,
    isBiasCoasting,
    motionAngle,
    motionAmp,
    retainedLabelRotation,
  });

  const tableGesture = useJellyfishTableGestures({
    biasX,
    biasY,
    appliedBiasX,
    appliedBiasY,
    prevBiasX,
    prevBiasY,
    layoutParticlesSv,
    layoutBoundsSv,
    layoutX,
    layoutY,
    layoutScale,
    lastLayoutTs,
    isBiasCoasting,
    biasCoastPending,
    isDragging,
    motionAngle,
    motionAmp,
    retainedLabelRotation,
    motionLoopEngaged,
    cellBellSizesSv,
    cellGridColsSv,
    cellGridRowsSv,
    cellLabelsSv,
    capturedWordSv,
    effectiveBubblePhase,
    tintFlashPreset,
    tintFlashUntil,
    clock,
    activateMotionLoop,
    handleJellyfishSoundJs,
    handleMatchSuccessJs,
    flashTranslationJs,
  });

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <>
      {/* Single canvas: all jellyfish first, then every label on top. One
          surface = one re-record/repaint per bias change instead of two. */}
      <Canvas style={styles.canvas} pointerEvents="none">
        {drawOrder.map(config => (
          <CellJellyfish
            key={config.key}
            config={config}
            layoutX={layoutX}
            layoutY={layoutY}
            layoutScale={layoutScale}
            motionAngle={motionAngle}
            motionAmp={motionAmp}
            tintFlashPreset={tintFlashPreset}
            tintFlashUntil={tintFlashUntil}
            bellImage={bellImage}
            tentacleImage={tentacleImage}
            clock={clock}
          />
        ))}
        {drawOrder.map(config => {
          if (!config.isHeader && !revealedBodyIndices.has(config.index)) {
            return null;
          }
          return (
          <CellLabel
            key={`${config.key}-label`}
            config={config}
            displayLabel={
              translatedIndices.has(config.index) ? config.translation : undefined
            }
            font={config.isHeader ? headerFont : bodyFont}
            layoutX={layoutX}
            layoutY={layoutY}
            layoutScale={layoutScale}
            motionAngle={motionAngle}
            motionAmp={motionAmp}
            retainedLabelRotation={retainedLabelRotation}
            tintFlashPreset={tintFlashPreset}
            tintFlashUntil={tintFlashUntil}
            clock={clock}
            labelBaseRotation={labelRotationRad}
          />
          );
        })}
      </Canvas>

      {interactive && (
      <GestureDetector gesture={tableGesture}>
        <View
          style={[
            styles.gestureCapture,
            {
              left: jellyRect.x,
              top: jellyRect.y,
              width: jellyRect.w,
              height: jellyRect.h,
            },
          ]}
        />
      </GestureDetector>
      )}
    </>
  );
}
const styles = StyleSheet.create({
  canvas: {
    position: 'absolute',
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
  },
  gestureCapture: {
    position: 'absolute',
  },
});
