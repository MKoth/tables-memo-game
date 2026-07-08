import type { SentencePromptDisplaySlot } from '../../sentenceTransformation/domain/types';
import type { ZoneRect } from './computeUnderseaThemeLayout';
import {
  computeJellyfishFontScale,
  rollBodyTint,
  sr,
} from '../../jellyfish/jellyfishVisualTokens';

const MIN_DIAMETER = 34;
const MAX_DIAMETER = 74;
const GAP_RATIO = 0.26;

/** Vertical placement of the current-word bubble row inside the koi zone. */
export const TRANSFORMATION_WORD_ROW_Y_RATIO = 0.2;
/** Vertical placement of the insert-variant bubble row inside the koi zone. */
export const TRANSFORMATION_VARIANT_ROW_Y_RATIO = 0.65;

export type LetterLayout = {
  diameter: number;
  rowY: number;
  centers: number[];
};

export function computeLetterLayout(
  koiRect: ZoneRect,
  count: number,
  rowYRatio = TRANSFORMATION_WORD_ROW_Y_RATIO,
): LetterLayout {
  const rowY = koiRect.y + koiRect.h * rowYRatio;
  if (count <= 0) {
    return { diameter: MIN_DIAMETER, rowY, centers: [] };
  }

  const maxRowWidth = koiRect.w * 0.9;
  const denom = count + (count - 1) * GAP_RATIO;
  const widthLimited = maxRowWidth / denom;
  const heightLimited = koiRect.h * 0.18;
  const diameter = Math.max(
    MIN_DIAMETER,
    Math.min(MAX_DIAMETER, widthLimited, heightLimited),
  );
  const gap = diameter * GAP_RATIO;
  const total = count * diameter + (count - 1) * gap;
  const startX = koiRect.x + koiRect.w * 0.5 - total * 0.5;

  const centers = Array.from(
    { length: count },
    (_, i) => startX + i * (diameter + gap) + diameter * 0.5,
  );

  return { diameter, rowY, centers };
}

export type InsertPreviewLayout = {
  insertIndex: number;
  insertLength: number;
  targetLetterCount: number;
};

export function previewCenterForLetter(
  position: number,
  preview: InsertPreviewLayout,
  targetLayout: LetterLayout,
): number {
  const targetIndex =
    position < preview.insertIndex ? position : position + preview.insertLength;
  return targetLayout.centers[targetIndex] ?? 0;
}

export type SentenceSlotConfig = {
  key: string;
  index: number;
  label: string;
  kind: 'token' | 'blank';
  bellSize: number;
  phase: number;
  pulseSpeed: number;
  tintMode: 0 | 1 | 2;
  tintStrength: number;
  tintA: readonly [number, number, number];
  tintB: readonly [number, number, number];
  tintC: readonly [number, number, number];
  animatedTint: boolean;
  tintWaveSpeed: number;
  labelFillColor: string;
  labelStrokeColor: string;
};

export type SentenceRowLayoutInput = {
  slots: SentencePromptDisplaySlot[];
  jellyRect: ZoneRect;
};

export type SentenceRowLayout = {
  xs: number[];
  ys: number[];
  scales: number[];
  configs: SentenceSlotConfig[];
  fontScale: number;
};

const SLOT_GAP = 10;
const LINE_GAP = 18;
const BODY_BELL_SIZE_MIN = 28;
const BODY_BELL_SIZE_MAX = 72;

function clamp(val: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, val));
}

function estimateSlotWidth(label: string, bellSize: number): number {
  const charWidth = bellSize * 0.22;
  const textWidth = Math.max(label.length * charWidth, bellSize * 0.45);
  return Math.max(bellSize, textWidth) + SLOT_GAP;
}

/** Lay out sentence row jellyfish horizontally with line wrapping, vertically centered. */
export function computeSentenceRowLayout(input: SentenceRowLayoutInput): SentenceRowLayout {
  const { slots, jellyRect } = input;
  const zoneLeft = jellyRect.x;
  const zoneTop = jellyRect.y;
  const zoneWidth = jellyRect.w;
  const zoneHeight = jellyRect.h;
  const slotCount = slots.length;

  if (slotCount === 0) {
    return { xs: [], ys: [], scales: [], configs: [], fontScale: 1 };
  }

  const bellSize = clamp(
    Math.min(zoneWidth / Math.max(slotCount, 3), zoneHeight * 0.35),
    BODY_BELL_SIZE_MIN,
    BODY_BELL_SIZE_MAX,
  );
  const fontScale = computeJellyfishFontScale(bellSize);

  const configs: SentenceSlotConfig[] = slots.map((slot, index) => {
    const label = slot.kind === 'blank' ? '?' : slot.text;
    const tint = rollBodyTint(index);
    return {
      key: `slot-${index}`,
      index,
      label,
      kind: slot.kind,
      bellSize,
      phase: sr(index, 3) * Math.PI * 2,
      pulseSpeed: 2.2 + sr(index, 7) * 2.0,
      ...tint,
      labelFillColor: 'rgba(255,255,255,0.95)',
      labelStrokeColor: 'rgba(20,40,60,0.92)',
    };
  });

  const slotWidths = configs.map((config) => estimateSlotWidth(config.label, bellSize));

  type Line = { indices: number[]; width: number };
  const lines: Line[] = [];
  let currentLine: Line = { indices: [], width: 0 };

  for (let index = 0; index < configs.length; index++) {
    const width = slotWidths[index] ?? bellSize;
    const nextWidth =
      currentLine.indices.length === 0 ? width : currentLine.width + width;

    if (currentLine.indices.length > 0 && nextWidth > zoneWidth) {
      lines.push(currentLine);
      currentLine = { indices: [index], width };
    } else {
      currentLine.indices.push(index);
      currentLine.width = nextWidth;
    }
  }
  if (currentLine.indices.length > 0) {
    lines.push(currentLine);
  }

  const lineHeight = bellSize + LINE_GAP;
  const blockHeight = lines.length * lineHeight - LINE_GAP;
  const blockTop = zoneTop + Math.max(0, (zoneHeight - blockHeight) * 0.5);

  const xs: number[] = new Array(slotCount).fill(zoneLeft + zoneWidth * 0.5);
  const ys: number[] = new Array(slotCount).fill(blockTop + bellSize * 0.5);
  const scales: number[] = new Array(slotCount).fill(1);

  lines.forEach((line, lineIndex) => {
    const lineY = blockTop + lineIndex * lineHeight + bellSize * 0.5;
    let cursorX = zoneLeft + (zoneWidth - line.width) * 0.5;

    line.indices.forEach((slotIndex) => {
      const width = slotWidths[slotIndex] ?? bellSize;
      xs[slotIndex] = cursorX + width * 0.5 - SLOT_GAP * 0.5;
      ys[slotIndex] = lineY;
      cursorX += width;
    });
  });

  return { xs, ys, scales, configs, fontScale };
}

export function blankSlotCenter(
  slots: SentencePromptDisplaySlot[],
  jellyRect: ZoneRect,
): { x: number; y: number; bellSize: number } | null {
  const blankIndex = slots.findIndex((slot) => slot.kind === 'blank');
  if (blankIndex < 0) {
    return null;
  }

  const layout = computeSentenceRowLayout({ slots, jellyRect });

  return {
    x: layout.xs[blankIndex] ?? jellyRect.x + jellyRect.w * 0.5,
    y: layout.ys[blankIndex] ?? jellyRect.y + jellyRect.h * 0.5,
    bellSize: layout.configs[blankIndex]?.bellSize ?? 40,
  };
}

export type RoundResolutionFlightLayout = {
  fromCenterX: number;
  fromCenterY: number;
  fromDiameter: number;
  toCenterX: number;
  toCenterY: number;
  toDiameter: number;
};

export type RoundResolutionFlightInput = {
  slots: SentencePromptDisplaySlot[];
  jellyRect: ZoneRect;
  koiRect: ZoneRect;
  wordLength: number;
};

/** Fly-from (koi letter row) and fly-to (blank slot) geometry for round resolve phase. */
export function computeRoundResolutionFlight(
  input: RoundResolutionFlightInput,
): RoundResolutionFlightLayout | null {
  const { slots, jellyRect, koiRect, wordLength } = input;
  const blank = blankSlotCenter(slots, jellyRect);
  if (blank == null) {
    return null;
  }

  const letterLayout = computeLetterLayout(koiRect, wordLength);
  const fromCenterX =
    letterLayout.centers.length > 0
      ? (letterLayout.centers[0]! +
          letterLayout.centers[letterLayout.centers.length - 1]!) *
        0.5
      : koiRect.x + koiRect.w * 0.5;

  return {
    fromCenterX,
    fromCenterY: letterLayout.rowY,
    fromDiameter: letterLayout.diameter,
    toCenterX: blank.x,
    toCenterY: blank.y,
    toDiameter: blank.bellSize * 0.9,
  };
}
