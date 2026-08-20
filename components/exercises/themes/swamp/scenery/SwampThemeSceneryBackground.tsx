import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Canvas, Fill, type SkImage } from '@shopify/react-native-skia';
import type { SharedValue } from 'react-native-reanimated';
import type { SwampThemeImages } from '../core/assets/swampThemeAssets';
import { SwampThemeFloorCanvas } from './seafloor/SwampThemeFloorCanvas';
import { useScatterConfigs } from './scatter/useScatterConfigs';
import { AlgaeScatterLayer, StoneScatterLayer } from './shaderInstances';
import { STONE_SCATTER_PARAMS, ALGAE_SCATTER_PARAMS } from './params';
import { useDropParticles } from './useDropParticles';
import { DropLayer } from './DropLayer';


const LOADING_DIM_OVERLAY = 'rgba(20, 30, 15, 0.28)';

type SwampThemeSceneryBackgroundProps = {
  seafloorImage: SkImage;
  stoneImages: SwampThemeImages['stones'] | null;
  algaeImages: SwampThemeImages['algae'] | null;
  dropImages: SwampThemeImages['drops'] | null;
  width: number;
  height: number;
  clock: SharedValue<number>;
  dimOverlay?: boolean;
};

function SwampDecorScatter({
  stoneImages,
  algaeImages,
  width,
  height,
  clock,
  waveCenters,
  waveRadii,
  waveStrengths,
  waveWidths,
  waveCount,
  waveDecay,
}: {
  stoneImages: SwampThemeImages['stones'];
  algaeImages: SwampThemeImages['algae'];
  width: number;
  height: number;
  clock: SharedValue<number>;
  waveCenters: SharedValue<number[]>;
  waveRadii: SharedValue<number[]>;
  waveStrengths: SharedValue<number[]>;
  waveWidths: SharedValue<number[]>;
  waveCount: SharedValue<number>;
  waveDecay: number;
}) {
  const stoneVariants = Object.keys(stoneImages).length;
  const algaeVariants = Object.keys(algaeImages).length;

  const stoneConfigs = useScatterConfigs({
    ...STONE_SCATTER_PARAMS,
    variantCount: stoneVariants,
    seed: 'swamp-stones-v1',
  });

  const algaeConfigs = useScatterConfigs({
    ...ALGAE_SCATTER_PARAMS,
    variantCount: algaeVariants,
    seed: 'swamp-algae-v1',
  });

  const stoneImagesArray = Object.values(stoneImages);
  const algaeImagesArray = Object.values(algaeImages);

  return (
    <>
      <StoneScatterLayer
        configs={stoneConfigs}
        images={stoneImagesArray}
        screenWidth={width}
        screenHeight={height}
        clock={clock}
        waveCenters={waveCenters}
        waveRadii={waveRadii}
        waveStrengths={waveStrengths}
        waveWidths={waveWidths}
        waveCount={waveCount}
        waveDecay={waveDecay}
      />
      <AlgaeScatterLayer
        configs={algaeConfigs}
        images={algaeImagesArray}
        screenWidth={width}
        screenHeight={height}
        clock={clock}
        waveCenters={waveCenters}
        waveRadii={waveRadii}
        waveStrengths={waveStrengths}
        waveWidths={waveWidths}
        waveCount={waveCount}
        waveDecay={waveDecay}
      />
    </>
  );
}

export function SwampThemeSceneryBackground({
  seafloorImage,
  stoneImages,
  algaeImages,
  dropImages,
  width,
  height,
  clock,
  dimOverlay = false,
}: SwampThemeSceneryBackgroundProps) {
  const showForeground = stoneImages != null && algaeImages != null;

  const { dropFlat, waveCenters, waveRadii, waveStrengths, waveWidths, waveCount, waveDecay } = useDropParticles({
    screenBounds: { width, height },
    clock,
  });

  const showDrops = dropImages != null && Object.keys(dropImages).length > 0;
  const dropImagesArray = showDrops ? Object.values(dropImages!) : [];

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <SwampThemeFloorCanvas
        image={seafloorImage}
        width={width}
        height={height}
        clock={clock}
        waveCenters={waveCenters}
        waveRadii={waveRadii}
        waveStrengths={waveStrengths}
        waveWidths={waveWidths}
        waveCount={waveCount}
        waveDecay={waveDecay}
      />
      {showForeground && (
        <SwampDecorScatter
          stoneImages={stoneImages}
          algaeImages={algaeImages}
          width={width}
          height={height}
          clock={clock}
          waveCenters={waveCenters}
          waveRadii={waveRadii}
          waveStrengths={waveStrengths}
          waveWidths={waveWidths}
          waveCount={waveCount}
          waveDecay={waveDecay}
        />
      )}
      {showDrops && (
        <DropLayer
          dropImages={dropImagesArray}
          width={width}
          height={height}
          clock={clock}
          dropFlat={dropFlat}
        />
      )}
      {dimOverlay && (
        <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
          <Fill color={LOADING_DIM_OVERLAY} />
        </Canvas>
      )}
    </View>
  );
}
