import type { ZoneRect } from '../../../../core';

export const GROUND_BAND_HEIGHT_RATIO = 0.08;

export function computeGroundBand(
  spriteRect: ZoneRect,
  screenHeight: number,
  heightRatio: number = GROUND_BAND_HEIGHT_RATIO,
): ZoneRect {
  const bandHeight = Math.max(40, screenHeight * heightRatio);
  return {
    x: spriteRect.x,
    y: spriteRect.y + spriteRect.h,
    w: spriteRect.w,
    h: bandHeight,
  };
}
