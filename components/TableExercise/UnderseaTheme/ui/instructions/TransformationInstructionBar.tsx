import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useUnderseaThemeLayout } from '../../core/providers/UnderseaThemeLayoutProvider';
import { UiDropPanel } from './UiDropPanel';
import { INSTRUCTION_BAR_Z, TOOLTIP_CORNER_RADIUS } from './constants';
import { computeInstructionBarPosition } from './helpers/controlsPosition';

export type TransformationInstructionBarProps = {
  message: string;
  zIndex?: number;
};

/**
 * Non-interactive instruction text anchored to the bottom of the koi zone.
 * Orientation-aware via `computeUnderseaThemeLayout` zone rects.
 */
export function TransformationInstructionBar({
  message,
  zIndex = INSTRUCTION_BAR_Z,
}: TransformationInstructionBarProps) {
  const insets = useSafeAreaInsets();
  const layout = useUnderseaThemeLayout();
  const position = computeInstructionBarPosition(layout, insets);
  const [panelHeight, setPanelHeight] = useState(72);

  return (
    <View
      style={[
        styles.anchor,
        {
          left: position.left,
          top: position.top,
          width: position.width,
          zIndex,
        },
      ]}
      pointerEvents="none">
      <View
        style={styles.shell}
        onLayout={(event) => {
          const { height } = event.nativeEvent.layout;
          if (height > 0) {
            setPanelHeight(height);
          }
        }}>
        <UiDropPanel
          width={position.width}
          height={panelHeight}
          cornerRadius={TOOLTIP_CORNER_RADIUS}
        />
        <View style={styles.content}>
          <Text style={styles.message}>{message}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  anchor: {
    position: 'absolute',
  },
  shell: {
    position: 'relative',
    overflow: 'hidden',
  },
  content: {
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  message: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '600',
    color: '#ffffff',
    textAlign: 'center',
    textShadowColor: 'rgba(10, 40, 64, 0.35)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
});
