/**
 * Screen-space layout for the undersea exercise across device orientations.
 * Koi and jellyfish zones split the screen; controls anchor to the koi outer corner.
 */

import type { LayoutBounds } from './layoutBounds';
import {
  LAYOUT_ZONE_HEIGHT_RATIO,
  LAYOUT_ZONE_TOP_RATIO,
} from './zoneLayoutConstants';

export type UnderseaThemeOrientation =
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
  /** Which screen edges the control cluster hugs (outer koi corner). */
  edge: 'bottomRight' | 'bottomLeft' | 'topRight' | 'topLeft';
};

export type UnderseaThemeLayout = {
  orientation: UnderseaThemeOrientation;
  screenWidth: number;
  screenHeight: number;
  koiRect: ZoneRect;
  jellyRect: ZoneRect;
  /** Bounds passed to jellyfish layout (zone in screen space). */
  jellyLayoutBounds: Omit<LayoutBounds, 'scaleMin' | 'scaleMax' | 'edgeSqueeze' | 'spreadBoost'>;
  labelRotationRad: number;
  controlsAnchor: ControlsAnchor;
  /** Stable key for sim/layout invalidation on rotation. */
  layoutKey: string;
};

const KOI_ZONE_FRACTION = 0.5;
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

function portraitLayout(width: number, height: number): {
  koi: ZoneRect;
  jelly: ZoneRect;
} {
  const splitY = height * KOI_ZONE_FRACTION;
  return {
    jelly: rect(0, height * JELLY_INSET_RATIO, width, height * JELLY_ZONE_FRACTION),
    koi: rect(0, splitY, width, height - splitY),
  };
}

function landscapeLayout(width: number, height: number): {
  koi: ZoneRect;
  jelly: ZoneRect;
} {
  const splitX = width * KOI_ZONE_FRACTION;
  const inset = height * JELLY_INSET_RATIO;
  return {
    koi: rect(0, 0, splitX, height),
    jelly: rect(splitX, inset, width - splitX, height - inset),
  };
}

function computeControlsAnchor(orientation: UnderseaThemeOrientation): ControlsAnchor {
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

export function computeUnderseaThemeLayout(
  screenWidth: number,
  screenHeight: number,
  orientation: UnderseaThemeOrientation,
): UnderseaThemeLayout {
  let koiRect: ZoneRect;
  let jellyRect: ZoneRect;

  switch (orientation) {
    case 'portrait': {
      const zones = portraitLayout(screenWidth, screenHeight);
      koiRect = zones.koi;
      jellyRect = zones.jelly;
      break;
    }
    case 'landscapeLeft':
    case 'landscapeRight': {
      const zones = landscapeLayout(screenWidth, screenHeight);
      koiRect = zones.koi;
      jellyRect = zones.jelly;
      break;
    }
  }

  const jellyLayoutBounds: UnderseaThemeLayout['jellyLayoutBounds'] = {
    width: jellyRect.w,
    height: screenHeight,
    nGridCols: 0,
    nGridRows: 0,
    zoneLeft: jellyRect.x,
    zoneTop: jellyRect.y,
    zoneHeight: jellyRect.h,
  };

  return {
    orientation,
    screenWidth,
    screenHeight,
    koiRect,
    jellyRect,
    jellyLayoutBounds,
    labelRotationRad: 0,
    controlsAnchor: computeControlsAnchor(orientation),
    layoutKey: `${orientation}:${Math.round(screenWidth)}x${Math.round(screenHeight)}`,
  };
}

/** Off-screen escape point beyond the screen edge on the koi side away from jelly. */
export function computeOffScreenEscapeTarget(
  koiRect: ZoneRect,
  screenWidth: number,
  screenHeight: number,
  orientation: UnderseaThemeOrientation,
): { x: number; y: number; exitEdge: EscapeExitEdge } {
  const margin = 120 * 1.5;
  const cx = koiRect.x + koiRect.w * 0.5;
  const cy = koiRect.y + koiRect.h * 0.5;

  switch (orientation) {
    case 'portrait':
      return { x: cx, y: -margin, exitEdge: 'top' };
    case 'landscapeLeft':
    case 'landscapeRight':
      return { x: screenWidth + margin, y: cy, exitEdge: 'right' };
  }
}
