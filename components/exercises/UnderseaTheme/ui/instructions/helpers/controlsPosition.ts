import type { ControlsAnchor, ExerciseLayout } from '../../../../core/layout/computeExerciseLayout';
import { HELP_BUTTON_SIZE } from '../constants';

export type EdgeInsets = {
  top: number;
  bottom: number;
  left: number;
  right: number;
};

export function computeControlsPosition(
  anchor: ControlsAnchor,
  insets: EdgeInsets,
  margin: number,
): {
  top?: number;
  bottom?: number;
  left?: number;
  right?: number;
} {
  switch (anchor.edge) {
    case 'bottomRight':
      return { bottom: insets.bottom + margin, right: insets.right + margin };
    case 'bottomLeft':
      return { bottom: insets.bottom + margin, left: insets.left + margin };
    case 'topRight':
      return { top: insets.top + margin, right: insets.right + margin };
    case 'topLeft':
      return { top: insets.top + margin, left: insets.left + margin };
  }
}

export function computeTooltipPosition(
  anchor: ControlsAnchor,
  insets: EdgeInsets,
  margin: number,
): {
  top?: number;
  bottom?: number;
  left?: number;
  right?: number;
} {
  const offset = margin + HELP_BUTTON_SIZE + 12;
  switch (anchor.edge) {
    case 'bottomRight':
      return { bottom: insets.bottom + offset, right: insets.right + margin };
    case 'bottomLeft':
      return { bottom: insets.bottom + offset, left: insets.left + margin };
    case 'topRight':
      return { top: insets.top + offset, right: insets.right + margin };
    case 'topLeft':
      return { top: insets.top + offset, left: insets.left + margin };
  }
}

const INSTRUCTION_BAR_HORIZONTAL_MARGIN = 16;
const INSTRUCTION_BAR_BOTTOM_MARGIN = 20;

/** Positions the transformation instruction bar inside the koi interaction zone. */
export function computeInstructionBarPosition(
  layout: ExerciseLayout,
  insets: EdgeInsets,
): {
  left: number;
  top: number;
  width: number;
} {
  const { koiRect } = layout;
  const horizontalMargin = INSTRUCTION_BAR_HORIZONTAL_MARGIN + insets.left;
  const width = Math.max(0, koiRect.w - horizontalMargin * 2);
  const top = Math.max(
    koiRect.y + 12,
    koiRect.y + koiRect.h - 88 - INSTRUCTION_BAR_BOTTOM_MARGIN - insets.bottom,
  );

  return {
    left: koiRect.x + horizontalMargin,
    top,
    width,
  };
}
