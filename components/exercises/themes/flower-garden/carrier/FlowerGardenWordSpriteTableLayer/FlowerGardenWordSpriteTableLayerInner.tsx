import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Platform, StyleSheet, View, useWindowDimensions } from 'react-native';
import { Canvas, matchFont } from '@shopify/react-native-skia';
import { runOnUI, useSharedValue } from 'react-native-reanimated';
import { GestureDetector } from 'react-native-gesture-handler';
import { useExerciseLayout } from '../../../../core';
import { useExerciseRuntime } from '../../../../core';
import { useExerciseClockQuantized } from '../../../../core';
import {
  ROSE_HEADER_FONT_SIZE,
  ROSE_LABEL_FONT_SIZE,
  WORD_SPRITE_CLOCK_FPS,
} from './config/flowerTableLayerConfig';
import { CellRoseBud } from './components/CellRoseBud';
import { FlowerRoseLabel } from './components/FlowerRoseLabel';
import {
  buildFlowerLayoutParticles,
  createFlowerCellConfigs,
  sortFlowerDrawOrder,
} from './helpers/flowerCellConfigBuilders';
import { computeFlowerCellScaleRanges } from './helpers/computeFlowerCellScaleRanges';
import { useFlowerTableGestures } from './gestures/useFlowerTableGestures';
import { useWordSpriteMotionLoop } from '../../../undersea/carrier/WordSpriteTableLayer/motion/useWordSpriteMotionLoop';
import { resolvePersistentHighlights } from '../../../undersea/carrier/WordSpriteTableLayer/helpers/resolvePersistentHighlights';
import { focusWordSpriteCell } from '../../../undersea/carrier/WordSpriteTableLayer/worklets/wordSpriteTableWorklets';
import {
  computeWordSpriteSizing,
  computeLayoutPositions,
  type LayoutBounds,
  type LayoutParticle,
} from '../../../undersea/carrier/WordSpriteTableLayer/layout/computeWordSpriteLayout';
import { useBushConfigs } from '../../scenery/BushShaderLayer/useBushConfigs';
import { OrbPhase } from '../../orb/orbAnimTypes';
import {
  FLOWER_PERSISTENT_HIGHLIGHT_TINTS,
  ROSE_TINT_PRESETS,
  type RoseTintRgb,
} from './presets/roseTintPresets';
import { rollRoseLabelColors } from './presets/roseLabelPalette';
import type {
  FlowerWordSpriteSoundKind,
  FlowerWordSpriteTableLayerController,
  FlowerWordSpriteTableLayerInnerProps,
} from './types';

export function FlowerGardenWordSpriteTableLayerInner({
  table,
  roseBudImage,
  roseCenterImage,
  petalImages: _petalImages,
  rosePetalAtlas,
  capturedWord,
  orbPhase,
  onMatchSuccess,
  onWordSpriteSound,
  interactive,
  translationDisplayMs,
  highlightedCellIndex,
  extraRevealedBodyIndices,
  controllerRef,
}: FlowerWordSpriteTableLayerInnerProps) {
  const { publishWordSpriteBridge } = useExerciseRuntime();
  const { height } = useWindowDimensions();
  const { spriteRect } = useExerciseLayout();
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
        fontSize: ROSE_LABEL_FONT_SIZE * sizing.fontScale,
        fontWeight: '500',
      }),
    [fontFamily, sizing.fontScale],
  );

  const headerFont = useMemo(
    () =>
      matchFont({
        fontFamily,
        fontSize: ROSE_HEADER_FONT_SIZE * sizing.fontScale,
        fontWeight: 'bold',
      }),
    [fontFamily, sizing.fontScale],
  );

  const cellConfigs = useMemo(() => createFlowerCellConfigs(table, sizing), [table, sizing]);

  const bodyCellIndices = useMemo(
    () => cellConfigs.filter(c => !c.isHeader).map(c => c.index),
    [cellConfigs],
  );
  const headerCellIndices = useMemo(
    () => cellConfigs.filter(c => c.isHeader).map(c => c.index),
    [cellConfigs],
  );
  const drawOrder = useMemo(() => sortFlowerDrawOrder(cellConfigs), [cellConfigs]);
  const layoutParticles = useMemo(() => buildFlowerLayoutParticles(cellConfigs), [cellConfigs]);
  const persistentHighlights = useMemo(
    () => resolvePersistentHighlights(cellConfigs, highlightedCellIndex),
    [cellConfigs, highlightedCellIndex],
  );
  const highlightTints = useMemo(() => {
    const map = new Map<number, RoseTintRgb>();
    for (const [index, kind] of persistentHighlights) {
      map.set(index, FLOWER_PERSISTENT_HIGHLIGHT_TINTS[kind]);
    }
    return map;
  }, [persistentHighlights]);

  const [revealedBodyIndices, setRevealedBodyIndices] = useState<ReadonlySet<number>>(
    () => new Set(),
  );
  const [translatedIndices, setTranslatedIndices] = useState<ReadonlySet<number>>(
    () => new Set(),
  );
  const cellLabelsSv = useSharedValue<string[]>([]);
  const capturedWordSv = useSharedValue('');
  const fallbackOrbPhase = useSharedValue<number>(OrbPhase.Idle);
  const effectiveOrbPhase = orbPhase ?? fallbackOrbPhase;
  const onWordSpriteSoundRef = useRef(onWordSpriteSound);

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

  const controller = useMemo<FlowerWordSpriteTableLayerController>(
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
      onMatchSuccess?.(targetX, targetY, hitIdx);
    },
    [revealBodyLabel, onMatchSuccess],
  );

  const handleWordSpriteSoundJs = useCallback((kind: FlowerWordSpriteSoundKind) => {
    onWordSpriteSoundRef.current?.(kind);
  }, []);

  const bushConfigs = useBushConfigs(table);
  const cellTints = useMemo<RoseTintRgb[]>(() => {
    const tints: RoseTintRgb[] = new Array(cellConfigs.length);
    for (const bush of bushConfigs) {
      for (const stem of bush.stems) {
        tints[stem.roseIndex] = bush.tint;
      }
    }
    return tints;
  }, [bushConfigs, cellConfigs.length]);

  const labelColorsByCell = useMemo(
    () => cellConfigs.map(c => rollRoseLabelColors(cellTints[c.index] ?? ROSE_TINT_PRESETS.scarlet)),
    [cellConfigs, cellTints],
  );

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
  const layoutScaleMin = useSharedValue<number[]>([]);
  const layoutScaleMax = useSharedValue<number[]>([]);
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
  const tintFlashPreset = useSharedValue<number[]>([]);
  const tintFlashUntil = useSharedValue<number[]>([]);

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
    const ranges = computeFlowerCellScaleRanges(layoutParticles, layoutBounds);
    layoutScaleMin.value = ranges.minScales;
    layoutScaleMax.value = ranges.maxScales;
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
    layoutScaleMin,
    layoutScaleMax,
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

  const tableGesture = useFlowerTableGestures({
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
    orbPhase: effectiveOrbPhase,
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
  }, [
    activateMotionLoop,
    appliedBiasX,
    appliedBiasY,
    biasCoastPending,
    biasX,
    biasY,
    cellConfigs.length,
    cellGridColsSv,
    cellGridRowsSv,
    highlightedCellIndex,
    isBiasCoasting,
    lastLayoutTs,
    layoutBoundsSv,
    layoutParticlesSv,
    layoutScale,
    layoutX,
    layoutY,
    motionAmp,
    motionAngle,
    motionLoopEngaged,
    prevBiasX,
    prevBiasY,
    retainedLabelRotation,
  ]);

  return (
    <>
      <Canvas style={styles.canvas} pointerEvents="none">
        {drawOrder.map(config => (
          <CellRoseBud
            key={config.key}
            config={config}
            tint={cellTints[config.index] ?? ROSE_TINT_PRESETS.scarlet}
            highlightTint={highlightTints.get(config.index) ?? null}
            layoutX={layoutX}
            layoutY={layoutY}
            layoutScale={layoutScale}
            layoutScaleMin={layoutScaleMin}
            layoutScaleMax={layoutScaleMax}
            clock={clock}
            tintFlashPreset={tintFlashPreset}
            tintFlashUntil={tintFlashUntil}
            roseBudImage={roseBudImage}
            roseCenterImage={roseCenterImage}
            petalAtlas={rosePetalAtlas}
          />
        ))}
        {drawOrder.map(config => {
          if (!config.isHeader && !effectiveRevealedBodyIndices.has(config.index)) {
            return null;
          }
          const colors = labelColorsByCell[config.index]!;
          const highlightTint = highlightTints.get(config.index) ?? null;
          const highlightColors = highlightTint != null ? rollRoseLabelColors(highlightTint) : null;
          return (
            <FlowerRoseLabel
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
              fillColor={colors.fillColor}
              strokeColor={colors.strokeColor}
              highlightFillColor={highlightColors?.fillColor}
              highlightStrokeColor={highlightColors?.strokeColor}
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
