import type { ControlsAnchor } from '../../../core/layout/computeUnderseaThemeLayout';
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
