import React from 'react';
import { StyleSheet } from 'react-native';
import { Canvas, Fill, ImageShader, type SkImage } from '@shopify/react-native-skia';

type FlowerGardenEarthCanvasProps = {
  image: SkImage;
  width: number;
  height: number;
  scale?: number;
};

export function FlowerGardenEarthCanvas({
  image,
  width,
  height,
  scale = 1,
}: FlowerGardenEarthCanvasProps) {
  if (width === 0 || height === 0) {
    return null;
  }

  return (
    <Canvas style={[styles.canvas, { width, height }]}>
      <Fill>
        <ImageShader
          image={image}
          tx="repeat"
          ty="repeat"
          fit="none"
          width={width}
          height={height}
          transform={[{ scaleX: 1 / scale }, { scaleY: 1 / scale }]}
        />
      </Fill>
    </Canvas>
  );
}

const styles = StyleSheet.create({
  canvas: {
    position: 'absolute',
    left: 0,
    top: 0,
  },
});
