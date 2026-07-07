import React, { useCallback, useEffect, useMemo } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { Canvas, matchFont } from '@shopify/react-native-skia';
import { GestureDetector } from 'react-native-gesture-handler';
import { useSharedValue } from 'react-native-reanimated';
import { useTapGesture } from 'react-native-gesture-handler';
import { scheduleOnRN } from 'react-native-worklets';
import { useUnderseaThemeAssetsContext } from '../../../core/providers/UnderseaThemeAssetsProvider';
import { useUnderseaThemeLayout } from '../../../core/providers/UnderseaThemeLayoutProvider';
import { useUnderseaThemeClockQuantized } from '../../../core/clock/UnderseaThemeClockProvider';
import { CellJellyfish } from '../../../jellyfish/JellyfishTableLayer/components/CellJellyfish';
import { CellLabel } from '../../../jellyfish/JellyfishTableLayer/components/CellLabel';
import type { CellConfig } from '../../../jellyfish/JellyfishTableLayer/helpers/cellConfigBuilders';
import {
  BODY_FONT_SIZE,
  JELLYFISH_CLOCK_FPS,
  TAP_MAX_DISTANCE_PX,
} from '../../../jellyfish/JellyfishTableLayer/config/jellyfishTableLayerConfig';
import type { PersistentHighlightKind } from '../../../jellyfish/JellyfishTableLayer/presets/jellyfishTintPresets';
import type { SentencePromptDisplaySlot } from '../../domain/types';
import {
  computeSentenceRowLayout,
  type SentenceSlotConfig,
} from './computeSentenceRowLayout';
import { findSentenceSlotAtTap } from './sentenceRowWorklets';

export type JellyfishSentenceRowLayerProps = {
  displaySlots: SentencePromptDisplaySlot[];
  onTokenTap?: () => void;
};

function toCellConfig(slot: SentenceSlotConfig): CellConfig {
  return {
    key: slot.key,
    index: slot.index,
    gridCol: 0,
    gridRow: 0,
    isHeader: false,
    label: slot.label,
    translation: '',
    bellSize: slot.bellSize,
    phase: slot.phase,
    pulseSpeed: slot.pulseSpeed,
    labelFillColor: slot.labelFillColor,
    labelStrokeColor: slot.labelStrokeColor,
    tintMode: slot.tintMode,
    tintStrength: slot.tintStrength,
    tintA: slot.tintA,
    tintB: slot.tintB,
    tintC: slot.tintC,
    animatedTint: slot.animatedTint,
    tintWaveSpeed: slot.tintWaveSpeed,
  };
}

export function JellyfishSentenceRowLayer({
  displaySlots,
  onTokenTap,
}: JellyfishSentenceRowLayerProps) {
  const { images } = useUnderseaThemeAssetsContext();
  const { jellyRect, labelRotationRad } = useUnderseaThemeLayout();
  const clock = useUnderseaThemeClockQuantized(JELLYFISH_CLOCK_FPS);

  const layout = useMemo(
    () =>
      computeSentenceRowLayout({
        slots: displaySlots,
        zoneLeft: jellyRect.x,
        zoneTop: jellyRect.y,
        zoneWidth: jellyRect.w,
        zoneHeight: jellyRect.h,
      }),
    [displaySlots, jellyRect],
  );

  const fontFamily = Platform.select({ ios: 'Helvetica', default: 'sans-serif' });
  const bodyFont = useMemo(
    () =>
      matchFont({
        fontFamily,
        fontSize: BODY_FONT_SIZE * layout.fontScale,
        fontWeight: '500',
      }),
    [fontFamily, layout.fontScale],
  );

  const layoutX = useSharedValue<number[]>(layout.xs);
  const layoutY = useSharedValue<number[]>(layout.ys);
  const layoutScale = useSharedValue<number[]>(layout.scales);
  const zoneLeftSv = useSharedValue(jellyRect.x);
  const zoneTopSv = useSharedValue(jellyRect.y);
  const bellSizesSv = useSharedValue(layout.configs.map((config) => config.bellSize));
  const tintFlashPreset = useSharedValue<number[]>([]);
  const tintFlashUntil = useSharedValue<number[]>([]);
  const motionAngle = useSharedValue(0);
  const motionAmp = useSharedValue(0);
  const retainedLabelRotation = useSharedValue(0);

  useEffect(() => {
    layoutX.value = layout.xs;
    layoutY.value = layout.ys;
    layoutScale.value = layout.scales;
    zoneLeftSv.value = jellyRect.x;
    zoneTopSv.value = jellyRect.y;
    bellSizesSv.value = layout.configs.map((config) => config.bellSize);
    tintFlashPreset.value = layout.configs.map(() => -1);
    tintFlashUntil.value = layout.configs.map(() => 0);
  }, [jellyRect.x, jellyRect.y, layout, layoutScale, layoutX, layoutY, bellSizesSv, tintFlashPreset, tintFlashUntil, zoneLeftSv, zoneTopSv]);

  const cellConfigs = useMemo(
    () => layout.configs.map(toCellConfig),
    [layout.configs],
  );

  const slotKindsRef = React.useRef(layout.configs.map((config) => config.kind));
  slotKindsRef.current = layout.configs.map((config) => config.kind);
  const onTokenTapRef = React.useRef(onTokenTap);
  onTokenTapRef.current = onTokenTap;

  const handleTokenTapJs = useCallback((slotIndex: number) => {
    if (slotKindsRef.current[slotIndex] === 'token') {
      onTokenTapRef.current?.();
    }
  }, []);

  const tapGesture = useTapGesture({
    maxDistance: TAP_MAX_DISTANCE_PX,
    onDeactivate: (event) => {
      'worklet';
      const hitIndex = findSentenceSlotAtTap(
        event.x + zoneLeftSv.value,
        event.y + zoneTopSv.value,
        layoutX.value,
        layoutY.value,
        bellSizesSv.value,
      );
      if (hitIndex < 0) {
        return;
      }
      scheduleOnRN(handleTokenTapJs, hitIndex);
    },
  });

  const persistentHighlightFor = useCallback(
    (index: number): PersistentHighlightKind | null =>
      layout.configs[index]?.kind === 'blank' ? 'target' : null,
    [layout.configs],
  );

  if (displaySlots.length === 0) {
    return null;
  }

  return (
    <>
      <Canvas style={styles.canvas} pointerEvents="none">
        {cellConfigs.map((config) => (
          <CellJellyfish
            key={config.key}
            config={config}
            layoutX={layoutX}
            layoutY={layoutY}
            layoutScale={layoutScale}
            motionAngle={motionAngle}
            motionAmp={motionAmp}
            tintFlashPreset={tintFlashPreset}
            tintFlashUntil={tintFlashUntil}
            bellImage={images.jellyfishBell}
            tentacleImage={images.jellyfishTentacles}
            clock={clock}
            persistentHighlightKind={persistentHighlightFor(config.index)}
          />
        ))}
        {cellConfigs.map((config) => (
          <CellLabel
            key={`${config.key}-label`}
            config={config}
            font={bodyFont}
            layoutX={layoutX}
            layoutY={layoutY}
            layoutScale={layoutScale}
            motionAngle={motionAngle}
            motionAmp={motionAmp}
            retainedLabelRotation={retainedLabelRotation}
            tintFlashPreset={tintFlashPreset}
            tintFlashUntil={tintFlashUntil}
            clock={clock}
            labelBaseRotation={labelRotationRad}
            persistentHighlightKind={persistentHighlightFor(config.index)}
          />
        ))}
      </Canvas>
      <GestureDetector gesture={tapGesture}>
        <View
          style={[
            styles.gestureCapture,
            {
              left: jellyRect.x,
              top: jellyRect.y,
              width: jellyRect.w,
              height: jellyRect.h,
            },
          ]}
        />
      </GestureDetector>
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
