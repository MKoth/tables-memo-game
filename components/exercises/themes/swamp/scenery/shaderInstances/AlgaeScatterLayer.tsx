import React from 'react';
import { StyleSheet } from 'react-native';
import { Canvas, Group } from '@shopify/react-native-skia';
import type { SharedValue } from 'react-native-reanimated';
import type { ScatterConfig } from '../scatter/types';
import { AlgaeInstance } from './AlgaeInstance';
import { AlgaeShadowInstance } from './AlgaeShadowInstance';

type AlgaeScatterLayerProps = {
  configs: readonly ScatterConfig[];
  images: readonly import('@shopify/react-native-skia').SkImage[];
  clock: SharedValue<number>;
};

function AlgaeScatterLayerImpl({ configs, images, clock }: AlgaeScatterLayerProps) {
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
            <AlgaeShadowInstance
              key={`shadow-${config.spriteId}`}
              image={image}
              x={config.x - config.size * 0.5}
              y={config.y - config.size * 0.5}
              width={config.size}
              height={config.size}
              offsetX={config.shadowOffsetX}
              offsetY={config.shadowOffsetY}
              shadowOpacity={config.shadowOpacity}
              shadowColor={config.shadowColor}
              clock={clock}
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
            <AlgaeInstance
              key={config.spriteId}
              image={image}
              x={config.x - config.size * 0.5}
              y={config.y - config.size * 0.5}
              width={config.size}
              height={config.size}
              clock={clock}
            />
          );
        })}
      </Group>
    </Canvas>
  );
}

export const AlgaeScatterLayer = React.memo(AlgaeScatterLayerImpl);

const styles = StyleSheet.create({
  canvas: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
});
