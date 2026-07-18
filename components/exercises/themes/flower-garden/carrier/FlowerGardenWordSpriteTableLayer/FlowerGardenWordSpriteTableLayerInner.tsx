import React, { useEffect, useLayoutEffect, useMemo } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { Canvas } from '@shopify/react-native-skia';
import { useSharedValue } from 'react-native-reanimated';
import { GestureDetector } from 'react-native-gesture-handler';
import { useExerciseLayout } from '../../../../core';
import { useExerciseRuntime } from '../../../../core';
import { CellRoseBud } from './components/CellRoseBud';
import {
  buildFlowerLayoutParticles,
  createFlowerCellConfigs,
  sortFlowerDrawOrder,
} from './helpers/flowerCellConfigBuilders';
import { useFlowerTableGestures } from './gestures/useFlowerTableGestures';
import { useWordSpriteMotionLoop } from '../../../undersea/carrier/WordSpriteTableLayer/motion/useWordSpriteMotionLoop';
import {
  computeWordSpriteSizing,
  computeLayoutPositions,
  type LayoutBounds,
  type LayoutParticle,
} from '../../../undersea/carrier/WordSpriteTableLayer/layout/computeWordSpriteLayout';
import type { FlowerWordSpriteTableLayerInnerProps } from './types';

export function FlowerGardenWordSpriteTableLayerInner({
  table,
  roseBudImage,
  roseCenterImage,
  petalImages,
  interactive,
  highlightedCellIndex: _highlightedCellIndex,
  controllerRef: _controllerRef,
}: FlowerWordSpriteTableLayerInnerProps) {
  const { publishWordSpriteBridge } = useExerciseRuntime();
  const { height } = useWindowDimensions();
  const { spriteRect } = useExerciseLayout();

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
  const isDragging = useSharedValue(0);
  const prevBiasX = useSharedValue(0);
  const prevBiasY = useSharedValue(0);
  const layoutX = useSharedValue<number[]>([]);
  const layoutY = useSharedValue<number[]>([]);
  const layoutScale = useSharedValue<number[]>([]);
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
    retainedLabelRotation: motionAmp,
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
    motionLoopEngaged,
    cellBellSizesSv,
    cellGridColsSv,
    cellGridRowsSv,
    activateMotionLoop,
  });

  return (
    <>
      <Canvas style={styles.canvas} pointerEvents="none">
        {drawOrder.map(config => (
          <CellRoseBud
            key={config.key}
            config={config}
            layoutX={layoutX}
            layoutY={layoutY}
            layoutScale={layoutScale}
            roseBudImage={roseBudImage}
            roseCenterImage={roseCenterImage}
            petalImages={petalImages}
          />
        ))}
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
