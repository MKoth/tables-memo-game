import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

export const UI_DROP_FILL = 'rgba(82, 173, 245, 0.42)';
export const UI_DROP_BORDER = 'rgba(191, 235, 255, 0.55)';

export type DropPanelProps = {
  width: number;
  height: number;
  cornerRadius?: number;
};

export function DropPanel({
  width,
  height,
  cornerRadius,
}: DropPanelProps) {
  const cornerR = cornerRadius ?? Math.min(width, height) * 0.5;

  const panelStyle = useMemo(
    () => [
      styles.panel,
      {
        width,
        height,
        borderRadius: cornerR,
      },
    ],
    [width, height, cornerR],
  );

  return <View style={panelStyle} pointerEvents="none" />;
}

const styles = StyleSheet.create({
  panel: {
    position: 'absolute',
    left: 0,
    top: 0,
    backgroundColor: UI_DROP_FILL,
    borderWidth: 1.5,
    borderColor: UI_DROP_BORDER,
  },
});
