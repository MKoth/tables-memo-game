import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  Canvas,
  Line,
  Path,
  Skia,
  vec,
} from '@shopify/react-native-skia';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useExerciseLayout } from '../core/providers/ExerciseLayoutProvider';
import { useExerciseStore } from '../core/store/createExerciseStore';
import { DropPanel } from './DropPanel';
import {
  CORNER_BUTTON_GAP,
  HELP_BUTTON_SIZE,
  HELP_BUTTON_Z,
  HELP_MARGIN,
  TOOLTIP_CORNER_RADIUS,
  TOOLTIP_MIN_WIDTH,
} from './constants';
import { computeControlsPosition } from './controlsPosition';

type ExerciseIconButtonProps = {
  onPress: () => void;
  disabled?: boolean;
  accessibilityLabel: string;
  children: React.ReactNode;
};

function ExerciseIconButton({
  onPress,
  disabled = false,
  accessibilityLabel,
  children,
}: ExerciseIconButtonProps) {
  return (
    <View style={styles.helpButtonShell}>
      <DropPanel width={HELP_BUTTON_SIZE} height={HELP_BUTTON_SIZE} />
      <Pressable
        onPress={onPress}
        disabled={disabled}
        style={({ pressed }) => [
          styles.helpButtonHit,
          pressed && !disabled && styles.helpButtonPressed,
        ]}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}>
        {children}
      </Pressable>
    </View>
  );
}

const SOUND_ICON_COLOR = '#ffffff';

function SoundIcon({ muted, size = 26 }: { muted: boolean; size?: number }) {
  const speakerPath = useMemo(() => {
    const path = Skia.Path.Make();
    path.addRect({ x: 2, y: 8, width: 5, height: 10 });
    path.moveTo(7, 9);
    path.lineTo(12, 6);
    path.lineTo(12, 20);
    path.lineTo(7, 17);
    path.close();
    return path;
  }, []);

  const waveNearPath = useMemo(() => {
    const path = Skia.Path.Make();
    path.addArc({ x: 12, y: 4, width: 8, height: 18 }, -55, 110);
    return path;
  }, []);

  const waveFarPath = useMemo(() => {
    const path = Skia.Path.Make();
    path.addArc({ x: 14, y: 2, width: 10, height: 22 }, -55, 110);
    return path;
  }, []);

  return (
    <Canvas style={{ width: size, height: size }}>
      <Path path={speakerPath} color={SOUND_ICON_COLOR} style="fill" />
      {!muted && (
        <>
          <Path
            path={waveNearPath}
            color={SOUND_ICON_COLOR}
            style="stroke"
            strokeWidth={1.8}
            strokeCap="round"
          />
          <Path
            path={waveFarPath}
            color={SOUND_ICON_COLOR}
            style="stroke"
            strokeWidth={1.8}
            strokeCap="round"
          />
        </>
      )}
      {muted && (
        <Line
          p1={vec(14, 6)}
          p2={vec(23, 21)}
          color={SOUND_ICON_COLOR}
          style="stroke"
          strokeWidth={2.2}
          strokeCap="round"
        />
      )}
    </Canvas>
  );
}

export type ExerciseHelpButtonProps = {
  onPress: () => void;
  disabled?: boolean;
};

export type ExerciseSoundToggleButtonProps = {
  enabled: boolean;
  onToggle: () => void;
};

export function ExerciseSoundToggleButton({
  enabled,
  onToggle,
}: ExerciseSoundToggleButtonProps) {
  return (
    <ExerciseIconButton
      onPress={onToggle}
      accessibilityLabel={enabled ? 'Mute sound' : 'Unmute sound'}>
      <SoundIcon muted={!enabled} />
    </ExerciseIconButton>
  );
}

export function ExerciseHelpButton({
  onPress,
  disabled = false,
}: ExerciseHelpButtonProps) {
  return (
    <ExerciseIconButton
      onPress={onPress}
      disabled={disabled}
      accessibilityLabel="Show instructions">
      <Text style={styles.helpButtonText}>?</Text>
    </ExerciseIconButton>
  );
}

export type ExerciseCornerControlsProps = {
  soundEnabled?: boolean;
  onSoundToggle?: () => void;
  onHelpPress?: () => void;
  helpVisible?: boolean;
  helpDisabled?: boolean;
};

export function ExerciseCornerControls({
  soundEnabled: soundEnabledProp,
  onSoundToggle: onSoundToggleProp,
  onHelpPress: onHelpPressProp,
  helpVisible: helpVisibleProp,
  helpDisabled: helpDisabledProp,
}: ExerciseCornerControlsProps = {}) {
  const storeSoundEnabled = useExerciseStore((state) => state.soundEnabled);
  const storeToggleSound = useExerciseStore((state) => state.toggleSound);
  const storeHelpVisible = useExerciseStore((state) => state.helpVisible);
  const storeStartTutorial = useExerciseStore((state) => state.startTutorial);
  const tutorialStep = useExerciseStore((state) => state.tutorialStep);

  const soundEnabled = soundEnabledProp ?? storeSoundEnabled;
  const onSoundToggle = onSoundToggleProp ?? storeToggleSound;
  const helpVisible = helpVisibleProp ?? storeHelpVisible;
  const onHelpPress = onHelpPressProp ?? storeStartTutorial;
  const helpDisabled = helpDisabledProp ?? tutorialStep !== 'idle';
  const insets = useSafeAreaInsets();
  const { controlsAnchor } = useExerciseLayout();
  const position = computeControlsPosition(controlsAnchor, insets, HELP_MARGIN);

  return (
    <View
      style={[
        styles.helpAnchor,
        position,
        { zIndex: HELP_BUTTON_Z },
      ]}
      pointerEvents="box-none">
      <View style={styles.cornerRow}>
        <ExerciseSoundToggleButton enabled={soundEnabled} onToggle={onSoundToggle} />
        {helpVisible && (
          <ExerciseHelpButton onPress={onHelpPress} disabled={helpDisabled} />
        )}
      </View>
    </View>
  );
}

export type InstructionTooltipProps = {
  message: string;
  stepLabel?: string;
  actionLabel: string;
  onAction: () => void;
  top?: number;
  bottom?: number;
  left?: number;
  right?: number;
};

export function InstructionTooltip({
  message,
  stepLabel,
  actionLabel,
  onAction,
  top,
  bottom,
  left,
  right,
}: InstructionTooltipProps) {
  const [panelSize, setPanelSize] = useState({ width: TOOLTIP_MIN_WIDTH, height: 120 });

  return (
    <View
      style={[styles.tooltipAnchor, { top, bottom, left, right }]}
      pointerEvents="box-none">
      <View
        style={styles.tooltipShell}
        onLayout={event => {
          const { width, height } = event.nativeEvent.layout;
          if (width > 0 && height > 0) {
            setPanelSize({ width, height });
          }
        }}>
        <DropPanel
          width={panelSize.width}
          height={panelSize.height}
          cornerRadius={TOOLTIP_CORNER_RADIUS}
        />
        <View style={styles.tooltipContent} pointerEvents="auto">
          <Text style={styles.tooltipMessage}>{message}</Text>
          {stepLabel != null && (
            <Text style={styles.stepLabel}>{stepLabel}</Text>
          )}
          <Pressable
            onPress={onAction}
            hitSlop={8}
            accessibilityRole="link">
            <Text style={styles.actionLink}>{actionLabel}</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  helpAnchor: {
    position: 'absolute',
  },
  cornerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: CORNER_BUTTON_GAP,
  },
  helpButtonShell: {
    width: HELP_BUTTON_SIZE,
    height: HELP_BUTTON_SIZE,
    overflow: 'hidden',
  },
  helpButtonHit: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  helpButtonPressed: {
    opacity: 0.82,
    transform: [{ scale: 0.96 }],
  },
  helpButtonText: {
    fontSize: 28,
    fontWeight: '800',
    color: '#ffffff',
    marginTop: -2,
    textShadowColor: 'rgba(10, 40, 64, 0.45)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  tooltipAnchor: {
    position: 'absolute',
    maxWidth: 280,
    alignItems: 'flex-end',
  },
  tooltipShell: {
    minWidth: TOOLTIP_MIN_WIDTH,
    position: 'relative',
    overflow: 'hidden',
  },
  tooltipContent: {
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
  tooltipMessage: {
    fontSize: 15,
    lineHeight: 21,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 10,
    textShadowColor: 'rgba(10, 40, 64, 0.35)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  stepLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.75)',
    marginBottom: 8,
    textAlign: 'center',
  },
  actionLink: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
    textAlign: 'center',
    textDecorationLine: 'underline',
    textShadowColor: 'rgba(10, 40, 64, 0.35)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
});
