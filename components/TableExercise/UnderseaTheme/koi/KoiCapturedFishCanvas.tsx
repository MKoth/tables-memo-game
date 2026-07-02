import React, { useMemo } from 'react';
import { Group, Skia } from '@shopify/react-native-skia';
import type { SkImage } from '@shopify/react-native-skia';
import type { SharedValue } from 'react-native-reanimated';
import { useDerivedValue, useSharedValue } from 'react-native-reanimated';
import {
  BUBBLE_FISH_CLIP_INSET,
  BUBBLE_FISH_SCALE,
  BUBBLE_SHADOW_OFFSET_MULT,
} from './bubbleAnimPresets';
import {
  KOI_SHADOW_COLOR,
  KOI_SHADOW_OFFSET_X,
  KOI_SHADOW_OFFSET_Y,
  KOI_SHADOW_OPACITY,
  KOI_SHADOW_SOFTNESS,
} from './config/koiFishLayerConfig';
import { KoiInstance, KoiShadowInstance } from './fish/KoiInstance';
import type { KoiRuntimeEntry } from './simulation/types';
import type { BubbleAnimState } from './useBubbleAnimation';

function lerp(a: number, b: number, t: number): number {
  'worklet';
  return a + (b - a) * t;
}

export type KoiCapturedFishCanvasProps = {
  entry: KoiRuntimeEntry;
  anim: SharedValue<BubbleAnimState>;
  escapeActive?: SharedValue<boolean>;
  image: SkImage;
  maskImage: SkImage;
  overlayMaskImage: SkImage;
  renderProps: {
    swimZoneX: number;
    swimZoneY: number;
    swimZoneW: number;
    swimZoneH: number;
    fishW: number;
    fishH: number;
    sourceAngle: number;
    tailFlex: {
      tailBendScale: number;
      tailTipBendScale: number;
      headBendScale: number;
    };
    turnDistort: {
      squashGain: number;
      bulgeGain: number;
    };
  };
};

export function KoiCapturedFishCanvas({
  entry,
  anim,
  escapeActive,
  image,
  maskImage,
  overlayMaskImage,
  renderProps,
}: KoiCapturedFishCanvasProps) {
  const { spawn, runtime } = entry;
  /** Bubble clip handles visibility — never clamp captured fish to swim zone. */
  const captureFreeBounds = useSharedValue(true);

  const clipPath = useDerivedValue(() => {
    if (escapeActive?.value) {
      const path = Skia.Path.Make();
      path.addRect({ x: -1e6, y: -1e6, width: 2e6, height: 2e6 });
      return path;
    }
    const { centerX, centerY, diameter, captureVisualT } = anim.value;
    const path = Skia.Path.Make();
    if (captureVisualT <= 0.001) {
      path.addRect({ x: -1e6, y: -1e6, width: 2e6, height: 2e6 });
      return path;
    }
    const radius = diameter * 0.5 * (1 - BUBBLE_FISH_CLIP_INSET);
    path.addCircle(centerX, centerY, radius);
    return path;
  });

  const fishWScale = useDerivedValue(() =>
    lerp(1, BUBBLE_FISH_SCALE, anim.value.captureVisualT),
  );

  const shadowOffsetX = useDerivedValue(() =>
    lerp(
      KOI_SHADOW_OFFSET_X,
      KOI_SHADOW_OFFSET_X * BUBBLE_SHADOW_OFFSET_MULT,
      anim.value.captureVisualT,
    ),
  );

  const shadowOffsetY = useDerivedValue(() =>
    lerp(
      KOI_SHADOW_OFFSET_Y,
      KOI_SHADOW_OFFSET_Y * BUBBLE_SHADOW_OFFSET_MULT,
      anim.value.captureVisualT,
    ),
  );

  const fishState = useMemo(
    () => ({
      x: runtime.x,
      y: runtime.y,
      angle: runtime.angle,
      amplitude: runtime.amplitude,
      turnArc: runtime.turnArc,
      wavePhase: runtime.wavePhase,
      finSquashLeft: runtime.finSquashLeft,
      finSquashRight: runtime.finSquashRight,
      finVariantLeft: runtime.finVariantLeft,
      finVariantRight: runtime.finVariantRight,
    }),
    [runtime],
  );

  return (
    <Group clip={clipPath}>
      <KoiShadowInstance
        image={image}
        maskImage={maskImage}
        overlayMaskImage={overlayMaskImage}
        spotColor={spawn.spotColor}
        bodyColor={spawn.bodyColor}
        bodyTintStrength={spawn.bodyTintStrength}
        overlayColor={spawn.overlayColor}
        overlayStrength={spawn.overlayStrength}
        {...renderProps}
        phase={spawn.phase}
        state={fishState}
        fishWScale={fishWScale}
        freeBounds={captureFreeBounds}
        offsetX={shadowOffsetX}
        offsetY={shadowOffsetY}
        shadowColor={KOI_SHADOW_COLOR}
        shadowOpacity={KOI_SHADOW_OPACITY}
        shadowSoftness={KOI_SHADOW_SOFTNESS}
      />
      <KoiInstance
        image={image}
        maskImage={maskImage}
        overlayMaskImage={overlayMaskImage}
        spotColor={spawn.spotColor}
        bodyColor={spawn.bodyColor}
        bodyTintStrength={spawn.bodyTintStrength}
        overlayColor={spawn.overlayColor}
        overlayStrength={spawn.overlayStrength}
        {...renderProps}
        phase={spawn.phase}
        state={fishState}
        fishWScale={fishWScale}
        freeBounds={captureFreeBounds}
      />
    </Group>
  );
}
