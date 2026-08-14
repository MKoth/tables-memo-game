/**
 * Screen-space layout for the exercise across device orientations.
 * Word-sprite and roamer zones split the screen; controls anchor to the roamer outer corner.
 */

import type { LayoutBounds } from './layoutBounds';
import {
  LAYOUT_ZONE_HEIGHT_RATIO,
  LAYOUT_ZONE_TOP_RATIO,
} from './zoneLayoutConstants';

export type ExerciseOrientation =
  | 'portrait'
  | 'landscapeLeft'
  | 'landscapeRight';

export type ZoneRect = {
  x: number;
  y: number;
  w: number;
  h: number;
};

export type ControlsAnchor = {
  /** Which screen edges the control cluster hugs (outer roamer corner). */
  edge: 'bottomRight' | 'bottomLeft' | 'topRight' | 'topLeft';
};

export type ExerciseZoneRatios = {
  /** Fraction of the screen taken by the roamer zone. `>= 1` makes both zones the full screen. */
  roamerFraction: number;
  wordSpriteInsetRatio: number;
  wordSpriteHeightFraction: number;
};

export type ExerciseLayout = {
  orientation: ExerciseOrientation;
  screenWidth: number;
  screenHeight: number;
  roamerRect: ZoneRect;
  spriteRect: ZoneRect;
  /** Bounds passed to wordSprite layout (zone in screen space). */
  spriteLayoutBounds: Omit<LayoutBounds, 'scaleMin' | 'scaleMax' | 'edgeSqueeze' | 'spreadBoost'>;
  labelRotationRad: number;
  controlsAnchor: ControlsAnchor;
  /** Stable key for sim/layout invalidation on rotation. */
  layoutKey: string;
};

const ROAMER_ZONE_FRACTION = 0.5;
const JELLY_INSET_RATIO = LAYOUT_ZONE_TOP_RATIO;
const JELLY_ZONE_FRACTION = LAYOUT_ZONE_HEIGHT_RATIO;

function rect(
  x: number,
  y: number,
  w: number,
  h: number,
): ZoneRect {
  return { x, y, w, h };
}

function portraitLayout(
  width: number,
  height: number,
  ratios: ExerciseZoneRatios,
): { roamer: ZoneRect; sprite: ZoneRect } {
  const splitY = height * ratios.roamerFraction;
  return {
    sprite: rect(
      0,
      height * ratios.wordSpriteInsetRatio,
      width,
      height * ratios.wordSpriteHeightFraction,
    ),
    roamer: rect(0, splitY, width, height - splitY),
  };
}

function landscapeLayout(
  width: number,
  height: number,
  ratios: ExerciseZoneRatios,
): { roamer: ZoneRect; sprite: ZoneRect } {
  const splitX = width * ratios.roamerFraction;
  const inset = height * ratios.wordSpriteInsetRatio;
  return {
    roamer: rect(0, 0, splitX, height),
    sprite: rect(splitX, inset, width - splitX, height - inset),
  };
}

function computeControlsAnchor(orientation: ExerciseOrientation): ControlsAnchor {
  if (orientation === 'portrait') {
    return { edge: 'bottomRight' };
  }
  return { edge: 'bottomLeft' };
}

export type EscapeExitEdge = 'top' | 'bottom' | 'left' | 'right';

/** Numeric code for worklets: 0=top, 1=bottom, 2=left, 3=right. */
export function escapeExitEdgeCode(edge: EscapeExitEdge): number {
  switch (edge) {
    case 'top':
      return 0;
    case 'bottom':
      return 1;
    case 'left':
      return 2;
    case 'right':
      return 3;
  }
}

export function computeExerciseLayout(
  screenWidth: number,
  screenHeight: number,
  orientation: ExerciseOrientation,
  zoneRatios: ExerciseZoneRatios = {
    roamerFraction: ROAMER_ZONE_FRACTION,
    wordSpriteInsetRatio: JELLY_INSET_RATIO,
    wordSpriteHeightFraction: JELLY_ZONE_FRACTION,
  },
): ExerciseLayout {
  let roamerRect: ZoneRect;
  let spriteRect: ZoneRect;

  if (zoneRatios.roamerFraction >= 1) {
    roamerRect = rect(0, 0, screenWidth, screenHeight);
    spriteRect = roamerRect;
  } else {
    switch (orientation) {
      case 'portrait': {
        const zones = portraitLayout(screenWidth, screenHeight, zoneRatios);
        roamerRect = zones.roamer;
        spriteRect = zones.sprite;
        break;
      }
      case 'landscapeLeft':
      case 'landscapeRight': {
        const zones = landscapeLayout(screenWidth, screenHeight, zoneRatios);
        roamerRect = zones.roamer;
        spriteRect = zones.sprite;
        break;
      }
    }
  }

  const spriteLayoutBounds: ExerciseLayout['spriteLayoutBounds'] = {
    width: spriteRect.w,
    height: screenHeight,
    nGridCols: 0,
    nGridRows: 0,
    zoneLeft: spriteRect.x,
    zoneTop: spriteRect.y,
    zoneHeight: spriteRect.h,
  };

  return {
    orientation,
    screenWidth,
    screenHeight,
    roamerRect,
    spriteRect,
    spriteLayoutBounds,
    labelRotationRad: 0,
    controlsAnchor: computeControlsAnchor(orientation),
    layoutKey: `${orientation}:${Math.round(screenWidth)}x${Math.round(screenHeight)}`,
  };
}

/** Off-screen escape point beyond the screen edge on the roamer side away from word-sprite. */
export function computeOffScreenEscapeTarget(
  roamerRect: ZoneRect,
  screenWidth: number,
  screenHeight: number,
  orientation: ExerciseOrientation,
): { x: number; y: number; exitEdge: EscapeExitEdge } {
  const margin = 120 * 1.5;
  const cx = roamerRect.x + roamerRect.w * 0.5;
  const cy = roamerRect.y + roamerRect.h * 0.5;

  switch (orientation) {
    case 'portrait':
      return { x: cx, y: -margin, exitEdge: 'top' };
    case 'landscapeLeft':
    case 'landscapeRight':
      return { x: screenWidth + margin, y: cy, exitEdge: 'right' };
  }
}
