import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Platform, StyleSheet, View, useWindowDimensions } from 'react-native';
import { Canvas, matchFont } from '@shopify/react-native-skia';
import { runOnUI, useSharedValue } from 'react-native-reanimated';
import { GestureDetector } from 'react-native-gesture-handler';
import { BubblePhase } from '../../roamer/bubbles';
import { useExerciseLayout } from '../../../../core';
import { useExerciseRuntime } from '../../../../core';
import { useExerciseClockQuantized } from '../../../../core';
import {
  BODY_FONT_SIZE,
  HEADER_FONT_SIZE,
  WORD_SPRITE_CLOCK_FPS,
} from './config/wordSpriteTableLayerConfig';
import { CellWordSprite } from './components/CellWordSprite';
import { CellLabel } from './components/CellLabel';
import {
  buildLayoutParticles,
  createCellConfigs,
  sortDrawOrder,
} from './helpers/cellConfigBuilders';
import { resolvePersistentHighlights } from './helpers/resolvePersistentHighlights';
import { useWordSpriteTableGestures } from './gestures/useWordSpriteTableGestures';
import { useWordSpriteMotionLoop } from './motion/useWordSpriteMotionLoop';
import { focusWordSpriteCell } from './worklets/wordSpriteTableWorklets';
import {
  computeWordSpriteSizing,
  computeLayoutPositions,
  type LayoutBounds,
  type LayoutParticle,
} from './layout/computeWordSpriteLayout';
import type { WordSpriteSoundKind, WordSpriteTableLayerController, WordSpriteTableLayerInnerProps } from './types';

export type { WordSpriteSoundKind, WordSpriteTableLayerProps } from './types';

export function WordSpriteTableLayerInner({
  table,
  bellImage,
  tentacleImage,
  capturedWord,
  orbPhase,
  onMatchSuccess,
  onWordSpriteSound,
  interactive,
  translationDisplayMs,
  highlightedCellIndex,
  extraRevealedBodyIndices,
  controllerRef,
}: WordSpriteTableLayerInnerProps) {
  const { publishWordSpriteBridge } = useExerciseRuntime();
  const { height } = useWindowDimensions();
  const { spriteRect, labelRotationRad } = useExerciseLayout();
  const clock = useExerciseClockQuantized(WORD_SPRITE_CLOCK_FPS);

  const nGridCols = table.colHeaders.length + 1;
  const nGridRows = table.rowHeaders.length + 1;

  const sizing = useMemo(
    () =>
      computeWordSpriteSizing({
        zoneWidth: spriteRect.w,
        zoneHeight: spriteRect.h,
        nGridCols,
        nGridRows,
      }),
    [spriteRect.w, spriteRect.h, nGridCols, nGridRows],
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
  const persistentHighlights = useMemo(
    () => resolvePersistentHighlights(cellConfigs, highlightedCellIndex),
    [cellConfigs, highlightedCellIndex],
  );
  const [revealedBodyIndices, setRevealedBodyIndices] = useState<ReadonlySet<number>>(
    () => new Set(),
  );
  const [translatedIndices, setTranslatedIndices] = useState<ReadonlySet<number>>(
    () => new Set(),
  );
  const cellLabelsSv = useSharedValue<string[]>([]);
  const capturedWordSv = useSharedValue('');
  const fallbackBubblePhase = useSharedValue<number>(BubblePhase.None);
  const effectiveBubblePhase = orbPhase ?? fallbackBubblePhase;
  const onMatchSuccessRef = useRef(onMatchSuccess);
  const onWordSpriteSoundRef = useRef(onWordSpriteSound);

  useEffect(() => {
    onMatchSuccessRef.current = onMatchSuccess;
  }, [onMatchSuccess]);

  useEffect(() => {
    onWordSpriteSoundRef.current = onWordSpriteSound;
  }, [onWordSpriteSound]);

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

  const effectiveRevealedBodyIndices = useMemo(() => {
    if (extraRevealedBodyIndices == null) {
      return revealedBodyIndices;
    }

    const extra =
      extraRevealedBodyIndices instanceof Set
        ? extraRevealedBodyIndices
        : new Set(extraRevealedBodyIndices);
    return new Set([...revealedBodyIndices, ...extra]);
  }, [extraRevealedBodyIndices, revealedBodyIndices]);

  const controller = useMemo<WordSpriteTableLayerController>(
    () => ({
      revealBodyLabel,
    }),
    [revealBodyLabel],
  );

  useLayoutEffect(() => {
    if (controllerRef != null) {
      controllerRef.current = controller;
    }
  }, [controller, controllerRef]);

  const flashTranslationJs = useCallback(
    (hitIdx: number) => {
      const config = cellConfigs[hitIdx];
      if (config == null || config.translation.length === 0) {
        return;
      }
      if (!config.isHeader && !effectiveRevealedBodyIndices.has(hitIdx)) {
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
    [cellConfigs, effectiveRevealedBodyIndices, translationDisplayMs],
  );

  const handleMatchSuccessJs = useCallback(
    (targetX: number, targetY: number, hitIdx: number) => {
      revealBodyLabel(hitIdx);
      onMatchSuccessRef.current?.(targetX, targetY, hitIdx);
    },
    [revealBodyLabel],
  );

  const handleWordSpriteSoundJs = useCallback((kind: WordSpriteSoundKind) => {
    onWordSpriteSoundRef.current?.(kind);
  }, []);

  const layoutBounds: LayoutBounds = useMemo(
    () => ({
      width: spriteRect.w,
      height,
      nGridCols,
      nGridRows,
      zoneLeft: spriteRect.x,
      zoneTop: spriteRect.y,
      zoneHeight: spriteRect.h,
      scaleMin: sizing.scaleMin,
      scaleMax: sizing.scaleMax,
      edgeSqueeze: sizing.edgeSqueeze,
      spreadBoost: sizing.spreadBoost,
    }),
    [height, spriteRect, nGridCols, nGridRows, sizing],
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
    publishWordSpriteBridge({
      layoutX,
      layoutY,
      layoutScale,
      bodyCellIndices,
      headerCellIndices,
      bodySizes: cellConfigs.map(c => c.bellSize),
    });
  }, [
    bodyCellIndices,
    headerCellIndices,
    cellConfigs,
    layoutScale,
    layoutX,
    layoutY,
    publishWordSpriteBridge,
  ]);
  const { motionLoopEngaged, activateMotionLoop } = useWordSpriteMotionLoop({
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

  const tableGesture = useWordSpriteTableGestures({
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
    handleWordSpriteSoundJs,
    handleMatchSuccessJs,
    flashTranslationJs,
  });

  useEffect(() => {
    if (highlightedCellIndex < 0 || highlightedCellIndex >= cellConfigs.length) {
      return;
    }

    runOnUI(focusWordSpriteCell)(
      highlightedCellIndex,
      cellGridColsSv,
      cellGridRowsSv,
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
      motionAngle,
      motionAmp,
      retainedLabelRotation,
      motionLoopEngaged,
      activateMotionLoop,
    );
  }, [highlightedCellIndex, cellConfigs.length, activateMotionLoop]);

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <>
      {/* Single canvas: all wordSprite first, then every label on top. One
          surface = one re-record/repaint per bias change instead of two. */}
      <Canvas style={styles.canvas} pointerEvents="none">
        {drawOrder.map(config => (
          <CellWordSprite
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
            persistentHighlightKind={persistentHighlights.get(config.index) ?? null}
          />
        ))}
        {drawOrder.map(config => {
          if (!config.isHeader && !effectiveRevealedBodyIndices.has(config.index)) {
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
            persistentHighlightKind={persistentHighlights.get(config.index) ?? null}
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
              left: spriteRect.x,
              top: spriteRect.y,
              width: spriteRect.w,
              height: spriteRect.h,
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
