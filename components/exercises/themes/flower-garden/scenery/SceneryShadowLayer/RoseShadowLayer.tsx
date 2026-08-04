import React, { useMemo } from 'react';
import type { SharedValue } from 'react-native-reanimated';
import { RoseShadowRect, type RoseDiscStatic } from './RoseShadowRect';
import type { RoseShadowStaticUniforms } from './pickSceneryShadowUniforms';

const MAX_ROSE_SHADOWS = 64;

export type RoseShadowLayerProps = {
  staticUniforms: RoseShadowStaticUniforms;
  roseRadiusFraction: number;
  layoutX: SharedValue<number[]> | null;
  layoutY: SharedValue<number[]> | null;
  bodySizes: readonly number[];
  width: number;
  height: number;
};

function RoseShadowLayerImpl({
  staticUniforms,
  roseRadiusFraction,
  layoutX,
  layoutY,
  bodySizes,
  width,
  height,
}: RoseShadowLayerProps) {
  const discs = useMemo<RoseDiscStatic[]>(() => {
    const n = Math.min(bodySizes.length, MAX_ROSE_SHADOWS);
    const out: RoseDiscStatic[] = [];
    for (let i = 0; i < n; i++) {
      out.push({
        index: i,
        radius: (bodySizes[i] ?? 0) * roseRadiusFraction,
        baseX: staticUniforms.roseShadowBase[i * 2] ?? 0,
        baseY: staticUniforms.roseShadowBase[i * 2 + 1] ?? 0,
      });
    }
    return out;
  }, [bodySizes, roseRadiusFraction, staticUniforms.roseShadowBase]);

  if (width <= 0 || height <= 0) return null;
  if (discs.length === 0) return null;

  return discs.map(disc => (
    <RoseShadowRect
      key={disc.index}
      disc={disc}
      staticUniforms={staticUniforms}
      layoutX={layoutX}
      layoutY={layoutY}
    />
  ));
}

export const RoseShadowLayer = React.memo(RoseShadowLayerImpl);
