import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useExerciseLayout } from '../core/providers/ExerciseLayoutProvider';
import { DropPanel } from './DropPanel';
import { INSTRUCTION_BAR_Z, TOOLTIP_CORNER_RADIUS } from './constants';
import { computeInstructionBarPosition } from './controlsPosition';

export type TransformationInstructionBarProps = {
  message: string;
  zIndex?: number;
  centerY?: number;
};

export function TransformationInstructionBar({
  message,
  zIndex = INSTRUCTION_BAR_Z,
  centerY,
}: TransformationInstructionBarProps) {
  const insets = useSafeAreaInsets();
  const layout = useExerciseLayout();
  const position = computeInstructionBarPosition(layout, insets);
  const [panelHeight, setPanelHeight] = useState(72);
  const top = centerY != null ? centerY - panelHeight * 0.5 : position.top;

  return (
    <View
      style={[
        styles.anchor,
        {
          left: position.left,
          top,
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
        <DropPanel
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
