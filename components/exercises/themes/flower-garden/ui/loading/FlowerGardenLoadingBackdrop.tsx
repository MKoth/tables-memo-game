import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import type { SkImage } from '@shopify/react-native-skia';
import type { ThemeLoadingBackdropProps } from '../../../../themeContract';
import {
  FlowerGardenBackgroundCanvas,
} from '../../scenery/FlowerGardenBackgroundCanvas/FlowerGardenBackgroundCanvas';
import {
  GroundScatterShaderLayer,
  type GroundScatterGroup,
} from '../../scenery/GroundScatterLayer/GroundScatterShaderLayer';
import { useGroundScatterConfigs } from '../../scenery/GroundScatterLayer/useGroundScatterConfigs';

const FALLBACK_COLOR = '#0f2214';

const grassOnlyMaskConfig = {
  centerX: 0,
  centerY: 0,
  minDiameter: 0,
  maxDiameter: 0,
};

export function FlowerGardenLoadingBackdrop({
  width,
  height,
  backgroundImage,
  decorationImages,
  scatterImages,
}: ThemeLoadingBackdropProps) {
  const grassImage = decorationImages?.grass as SkImage | undefined;
  const cloverImages = scatterImages?.clovers;
  const mossStoneImages = scatterImages?.mossStones;
  const petalImages = scatterImages?.petals;

  const stoneConfigs = useGroundScatterConfigs({
    kind: 'even',
    variantCount: mossStoneImages?.length ?? 6,
  });
  const cloverConfigs = useGroundScatterConfigs({
    kind: 'edge',
    variantCount: cloverImages?.length ?? 4,
  });
  const petalConfigs = useGroundScatterConfigs({
    kind: 'band',
    variantCount: petalImages?.length ?? 6,
    bandZone: null,
  });

  const groundDecorReady =
    cloverImages != null &&
    cloverImages.length >= 4 &&
    mossStoneImages != null &&
    mossStoneImages.length >= 6 &&
    petalImages != null &&
    petalImages.length >= 6;

  const groups = useMemo<GroundScatterGroup[]>(() => {
    if (!groundDecorReady) {
      return [];
    }
    return [
      { configs: stoneConfigs, images: mossStoneImages! },
      { configs: petalConfigs, images: petalImages! },
      { configs: cloverConfigs, images: cloverImages! },
    ];
  }, [groundDecorReady, stoneConfigs, mossStoneImages, petalConfigs, petalImages, cloverConfigs, cloverImages]);

  return (
    <View style={styles.container}>
      {backgroundImage != null && grassImage != null ? (
        <FlowerGardenBackgroundCanvas
          earthImage={backgroundImage}
          grassImage={grassImage}
          width={width}
          height={height}
          grassScale={1.2}
          maskConfig={grassOnlyMaskConfig}
        />
      ) : (
        <View
          style={[styles.fallback, { width, height }]}
          pointerEvents="none"
        />
      )}
      {groups.length > 0 && (
        <GroundScatterShaderLayer
          groups={groups}
          viewportRect={{ x: 0, y: 0, width, height }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFill,
  },
  fallback: {
    backgroundColor: FALLBACK_COLOR,
  },
});
