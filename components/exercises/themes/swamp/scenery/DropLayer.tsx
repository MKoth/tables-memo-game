import React, { useRef } from 'react';
import { StyleSheet } from 'react-native';
import {
  Canvas,
  ImageShader,
  Rect,
  Shader,
  type SkImage,
} from '@shopify/react-native-skia';
import type { SharedValue } from 'react-native-reanimated';
import { useDerivedValue } from 'react-native-reanimated';
import { dropSheetEffect } from '../shaders/dropSheet.sksl';

const STRIDE = 7;
const MAX_UNIFORM_DROPS = 32;

export type DropLayerProps = {
  dropImages: SkImage[];
  width: number;
  height: number;
  clock: SharedValue<number>;
  dropFlat: SharedValue<number[]>;
};

export function DropLayer({
  dropImages,
  width,
  height,
  clock,
  dropFlat,
}: DropLayerProps) {
  const primaryImage = dropImages.length > 0 ? dropImages[0]! : null;
  const imgW = primaryImage?.width() ?? 0;
  const imgH = primaryImage?.height() ?? 0;

  const dropDataRef = useRef(Array(MAX_UNIFORM_DROPS * 4).fill(0));
  const dropOpacityRef = useRef(Array(MAX_UNIFORM_DROPS).fill(0));

  const uniforms = useDerivedValue(() => {
    void clock.value;
    const d = dropFlat.value;
    const dropData = dropDataRef.current;
    const dropOpacity = dropOpacityRef.current;
    let activeCount = 0;

    for (let i = 0; i < MAX_UNIFORM_DROPS; i++) {
      const base = i * STRIDE;
      const di = i * 4;
      const opacity = d[base + 4];
      if (opacity > 0) {
        dropData[di] = d[base];
        dropData[di + 1] = d[base + 1];
        dropData[di + 2] = d[base + 2];
        dropData[di + 3] = d[base + 3];
        dropOpacity[i] = opacity;
        activeCount++;
      } else {
        dropData[di] = 0;
        dropData[di + 1] = 0;
        dropData[di + 2] = 0;
        dropData[di + 3] = 0;
        dropOpacity[i] = 0;
      }
    }

    return {
      iResolution: [width, height] as [number, number],
      uActiveCount: activeCount,
      uDropData: dropData,
      uDropOpacity: dropOpacity,
      uTextureSize: [imgW, imgH] as [number, number],
    };
  });

  if (width <= 0 || height <= 0 || primaryImage == null) {
    return null;
  }

  return (
    <Canvas style={[styles.canvas, { width, height }]} pointerEvents="none">
      <Rect x={0} y={0} width={width} height={height}>
        <Shader source={dropSheetEffect} uniforms={uniforms}>
          <ImageShader
            image={primaryImage}
            x={0}
            y={0}
            width={imgW}
            height={imgH}
            fit="fill"
            tx="clamp"
            ty="clamp"
          />
        </Shader>
      </Rect>
    </Canvas>
  );
}

const styles = StyleSheet.create({
  canvas: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
});
