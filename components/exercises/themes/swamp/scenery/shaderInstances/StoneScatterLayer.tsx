import React from 'react';
import { StyleSheet } from 'react-native';
import { Canvas, Group } from '@shopify/react-native-skia';
import type { SharedValue } from 'react-native-reanimated';
import type { ScatterConfig } from '../scatter/types';
import { StoneInstance } from './StoneInstance';
import { StoneShadowInstance } from './StoneShadowInstance';

type StoneScatterLayerProps = {
  configs: readonly ScatterConfig[];
  images: readonly import('@shopify/react-native-skia').SkImage[];
  screenWidth: number;
  screenHeight: number;
  clock: SharedValue<number>;
};

function StoneScatterLayerImpl({
  configs,
  images,
  screenWidth,
  screenHeight,
  clock,
}: StoneScatterLayerProps) {
  if (configs.length === 0 || images.length === 0) {
    return null;
  }

  return (
    <Canvas style={styles.canvas} pointerEvents="none">
      <Group>
        {configs.map(config => {
          const image = images[config.variant % images.length];
          if (image == null) {
            return null;
          }

          return (
            <StoneShadowInstance
              key={`shadow-${config.spriteId}`}
              image={image}
              x={config.x - config.size * 0.5}
              y={config.y - config.size * 0.5}
              width={config.size}
              height={config.size}
              shadowOpacity={config.shadowOpacity}
              shadowColor={config.shadowColor}
              offsetX={config.shadowOffsetX}
              offsetY={config.shadowOffsetY}
            />
          );
        })}
      </Group>
      <Group>
        {configs.map(config => {
          const image = images[config.variant % images.length];
          if (image == null) {
            return null;
          }

          return (
            <StoneInstance
              key={config.spriteId}
              image={image}
              x={config.x - config.size * 0.5}
              y={config.y - config.size * 0.5}
              width={config.size}
              height={config.size}
              screenWidth={screenWidth}
              screenHeight={screenHeight}
              clock={clock}
            />
          );
        })}
      </Group>
    </Canvas>
  );
}

export const StoneScatterLayer = React.memo(StoneScatterLayerImpl);

const styles = StyleSheet.create({
  canvas: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
});
