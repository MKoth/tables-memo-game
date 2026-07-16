import type { SentencePromptDisplaySlot } from '../../sentenceTransformation/domain/types';
import type { ZoneRect } from './computeExerciseLayout';
import {
  computeWordSpriteFontScale,
  rollBodyTint,
  sr,
} from '../../themes/undersea/carrier/wordSpriteVisualTokens';

const MIN_DIAMETER = 34;
const MAX_DIAMETER = 74;
export const GAP_RATIO = 0.26;
const POOL_GAP_RATIO = 0.18;
const POOL_MIN_DIAMETER = 45;
const POOL_MAX_COLUMNS = 6;
const POOL_ROW_GAP_RATIO = 0.3;

/** Vertical placement of the current-word bubble row inside the roamer zone. */
export const TRANSFORMATION_WORD_ROW_Y_RATIO = 0.2;
/** Vertical placement of the insert-variant bubble row inside the roamer zone. */
export const TRANSFORMATION_VARIANT_ROW_Y_RATIO = 0.65;
/** Vertical placement of pool letter bubbles inside the roamer zone. */
export const POOL_ROW_Y_RATIO = 0.5;

export type LetterLayout = {
  diameter: number;
  rowY: number;
  centers: number[];
};

export function computeLetterLayout(
  roamerRect: ZoneRect,
  count: number,
  rowYRatio = TRANSFORMATION_WORD_ROW_Y_RATIO,
  opts?: { gapRatio?: number; minDiameter?: number },
): LetterLayout {
  const rowY = roamerRect.y + roamerRect.h * rowYRatio;
  if (count <= 0) {
    return { diameter: MIN_DIAMETER, rowY, centers: [] };
  }

  const gapRatio = opts?.gapRatio ?? GAP_RATIO;
  const minDiameter = opts?.minDiameter ?? MIN_DIAMETER;
  const maxRowWidth = roamerRect.w * 0.9;
  const denom = count + (count - 1) * gapRatio;
  const widthLimited = maxRowWidth / denom;
  const heightLimited = roamerRect.h * 0.18;
  const diameter = Math.max(
    minDiameter,
    Math.min(MAX_DIAMETER, widthLimited, heightLimited),
  );
  const gap = diameter * gapRatio;
  const total = count * diameter + (count - 1) * gap;
  const startX = roamerRect.x + roamerRect.w * 0.5 - total * 0.5;

  const centers = Array.from(
    { length: count },
    (_, i) => startX + i * (diameter + gap) + diameter * 0.5,
  );

  return { diameter, rowY, centers };
}

export type PoolLetterPosition = {
  centerX: number;
  centerY: number;
};

export type PoolLetterLayout = {
  diameter: number;
  positions: PoolLetterPosition[];
};

export function computePoolLetterLayout(
  roamerRect: ZoneRect,
  count: number,
): PoolLetterLayout {
  if (count <= 0) {
    return { diameter: POOL_MIN_DIAMETER, positions: [] };
  }

  const maxRowWidth = roamerRect.w * 0.9;
  const maxColumns = Math.min(count, POOL_MAX_COLUMNS);
  const denom = maxColumns + (maxColumns - 1) * POOL_GAP_RATIO;
  const widthLimited = maxRowWidth / denom;
  const heightLimited = (roamerRect.h * 0.7) / Math.ceil(count / maxColumns);
  const diameter = Math.max(
    POOL_MIN_DIAMETER,
    Math.min(MAX_DIAMETER, widthLimited, heightLimited),
  );
  const gap = diameter * POOL_GAP_RATIO;
  const rowHeight = diameter * (1 + POOL_ROW_GAP_RATIO);

  const rows = Math.ceil(count / maxColumns);
  const totalBlockHeight = rows * rowHeight - diameter * POOL_ROW_GAP_RATIO;
  const blockCenterY = roamerRect.y + roamerRect.h * POOL_ROW_Y_RATIO;

  const positions: PoolLetterPosition[] = [];
  for (let i = 0; i < count; i++) {
    const row = Math.floor(i / maxColumns);
    const col = i % maxColumns;
    const lettersInRow = Math.min(maxColumns, count - row * maxColumns);
    const rowWidth = lettersInRow * diameter + (lettersInRow - 1) * gap;
    const rowStartX = roamerRect.x + roamerRect.w * 0.5 - rowWidth * 0.5;
    const centerX = rowStartX + col * (diameter + gap) + diameter * 0.5;
    const centerY = blockCenterY - totalBlockHeight * 0.5 + row * rowHeight + diameter * 0.5;
    positions.push({ centerX, centerY });
  }

  return { diameter, positions };
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
  translation: string;
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
  roamerRect: ZoneRect;
  conjugatedForm: string;
  roundPos: number;
};

export type SentenceRowLayout = {
  xs: number[];
  ys: number[];
  scales: number[];
  configs: SentenceSlotConfig[];
  fontScale: number;
  blankFootprintDiameter: number;
};

const SLOT_GAP = 10;
const LINE_GAP = 9;
const BODY_BELL_SIZE_MIN = 50;
const BODY_BELL_SIZE_MAX =90;
const TOKEN_SIZE_VARIATION = 0.86;

function clamp(val: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, val));
}

function estimateSlotWidth(
  label: string,
  bellSize: number,
  isBlank: boolean,
  blankFootprintDiameter: number,
): number {
  if (isBlank) {
    return blankFootprintDiameter + SLOT_GAP;
  }
  const charWidth = bellSize * 0.22;
  const textWidth = Math.max(label.length * charWidth, bellSize * 0.45);
  return Math.max(bellSize, textWidth) + SLOT_GAP;
}

/** Lay out sentence row wordSprite horizontally with line wrapping, vertically centered. */
export function computeSentenceRowLayout(input: SentenceRowLayoutInput): SentenceRowLayout {
  const { slots, jellyRect, roamerRect, conjugatedForm, roundPos } = input;
  const zoneLeft = jellyRect.x;
  const zoneTop = jellyRect.y;
  const zoneWidth = jellyRect.w;
  const zoneHeight = jellyRect.h;
  const slotCount = slots.length;

  if (slotCount === 0) {
    return {
      xs: [],
      ys: [],
      scales: [],
      configs: [],
      fontScale: 1,
      blankFootprintDiameter: 0,
    };
  }

  // Base bell size for the row (used for uniform font scale and as a baseline for rolls)
  const baseBellSize = clamp(
    Math.min(zoneWidth / Math.max(slotCount, 3), zoneHeight * 0.35),
    BODY_BELL_SIZE_MIN,
    BODY_BELL_SIZE_MAX,
  );
  const fontScale = computeWordSpriteFontScale(baseBellSize);

  // Blank footprint diameter: pack the conjugated form at the letter-bubble size for that length
  const letterLayout = computeLetterLayout(roamerRect, conjugatedForm.length);
  const gap = letterLayout.diameter * GAP_RATIO;
  const naturalWidth =
    conjugatedForm.length > 0
      ? conjugatedForm.length * letterLayout.diameter +
        (conjugatedForm.length - 1) * gap
      : letterLayout.diameter * 1.4;

  // Cap the footprint so it doesn't push everything off screen or look absurdly large.
  // We cap it relative to zone height to ensure wrapped lines still fit.
  const maxWidth = Math.min(zoneWidth * 0.45, zoneHeight * 0.65, BODY_BELL_SIZE_MAX * 2.0);
  const blankFootprintDiameter = Math.min(naturalWidth, maxWidth);

  const scales: number[] = new Array(slotCount).fill(1);
  const configs: SentenceSlotConfig[] = slots.map((slot, index) => {
    const isBlank = slot.kind === 'blank';
    const label = isBlank ? '?' : slot.text;
    const tint = rollBodyTint(index, roundPos);

    // Varied token sizes (stable for the round)
    // Blank is excluded from the size lottery and uses ~70% of footprint
    const sizeRoll = sr(index + 100, roundPos + 100);
    const scale = isBlank ? 1 : 1 + (sizeRoll - 0.5) * TOKEN_SIZE_VARIATION;

    // Ensure final size is at least BODY_BELL_SIZE_MIN
    const minScale = BODY_BELL_SIZE_MIN / baseBellSize;
    scales[index] = Math.max(scale, minScale);

    const bellSize = isBlank ? blankFootprintDiameter * 0.7 : baseBellSize;

    return {
      key: `slot-${index}`,
      index,
      label,
      kind: slot.kind,
      translation: slot.kind === 'token' && slot.translation ? slot.translation : '',
      bellSize,
      phase: sr(index, 3) * Math.PI * 2,
      pulseSpeed: 2.2 + sr(index, 7) * 2.0,
      ...tint,
      labelFillColor: 'rgba(255,255,255,0.95)',
      labelStrokeColor: 'rgba(20,40,60,0.92)',
    };
  });

  const slotWidths = configs.map((config, index) =>
    estimateSlotWidth(
      config.label,
      config.bellSize * (scales[index] ?? 1),
      config.kind === 'blank',
      blankFootprintDiameter,
    ),
  );

  type Line = { indices: number[]; width: number; maxBellSize: number };
  const lines: Line[] = [];
  let currentLine: Line = { indices: [], width: 0, maxBellSize: 0 };

  for (let index = 0; index < configs.length; index++) {
    const width = slotWidths[index] ?? baseBellSize;
    const bellSize = (configs[index]?.bellSize ?? baseBellSize) * (scales[index] ?? 1);
    const nextWidth =
      currentLine.indices.length === 0 ? width : currentLine.width + width;

    if (currentLine.indices.length > 0 && nextWidth > zoneWidth) {
      lines.push(currentLine);
      currentLine = { indices: [index], width, maxBellSize: bellSize };
    } else {
      currentLine.indices.push(index);
      currentLine.width = nextWidth;
      currentLine.maxBellSize = Math.max(currentLine.maxBellSize, bellSize);
    }
  }
  if (currentLine.indices.length > 0) {
    lines.push(currentLine);
  }

  // Use the largest bell size in the row (or baseline) for line height
  const rowMaxBellSize = Math.max(
    ...configs.map(
      (c, i) => (c.kind === 'blank' ? blankFootprintDiameter : c.bellSize * (scales[i] ?? 1)),
    ),
    baseBellSize,
  );
  const lineHeight = rowMaxBellSize + LINE_GAP;
  const blockHeight = lines.length * lineHeight - LINE_GAP;
  const blockTop = zoneTop + Math.max(0, (zoneHeight - blockHeight) * 0.5);

  const xs: number[] = new Array(slotCount).fill(zoneLeft + zoneWidth * 0.5);
  const ys: number[] = new Array(slotCount).fill(blockTop + rowMaxBellSize * 0.5);

  lines.forEach((line, lineIndex) => {
    const lineY = blockTop + lineIndex * lineHeight + rowMaxBellSize * 0.5;
    let cursorX = zoneLeft + (zoneWidth - line.width) * 0.5;

    line.indices.forEach((slotIndex) => {
      const width = slotWidths[slotIndex] ?? baseBellSize;
      xs[slotIndex] = cursorX + width * 0.5 - SLOT_GAP * 0.5;
      ys[slotIndex] = lineY;
      cursorX += width;
    });
  });

  return { xs, ys, scales, configs, fontScale, blankFootprintDiameter };
}

export function blankSlotCenter(
  slots: SentencePromptDisplaySlot[],
  jellyRect: ZoneRect,
  roamerRect: ZoneRect,
  conjugatedForm: string,
  roundPos: number,
): { x: number; y: number; bellSize: number; footprintDiameter: number } | null {
  const blankIndex = slots.findIndex((slot) => slot.kind === 'blank');
  if (blankIndex < 0) {
    return null;
  }

  const layout = computeSentenceRowLayout({
    slots,
    jellyRect,
    roamerRect,
    conjugatedForm,
    roundPos,
  });

  return {
    x: layout.xs[blankIndex] ?? jellyRect.x + jellyRect.w * 0.5,
    y: layout.ys[blankIndex] ?? jellyRect.y + jellyRect.h * 0.5,
    bellSize: layout.configs[blankIndex]?.bellSize ?? 40,
    footprintDiameter: layout.blankFootprintDiameter,
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
  roamerRect: ZoneRect;
  conjugatedForm: string;
  roundPos: number;
};

/** Fly-from (roamer letter row) and fly-to (blank slot) geometry for round resolve phase. */
export function computeRoundResolutionFlight(
  input: RoundResolutionFlightInput,
): RoundResolutionFlightLayout | null {
  const { slots, jellyRect, roamerRect, conjugatedForm, roundPos } = input;
  const blank = blankSlotCenter(slots, jellyRect, roamerRect, conjugatedForm, roundPos);
  if (blank == null) {
    return null;
  }

  const letterLayout = computeLetterLayout(roamerRect, conjugatedForm.length);
  const fromCenterX =
    letterLayout.centers.length > 0
      ? (letterLayout.centers[0]! +
          letterLayout.centers[letterLayout.centers.length - 1]!) *
        0.5
      : roamerRect.x + roamerRect.w * 0.5;

  return {
    fromCenterX,
    fromCenterY: letterLayout.rowY,
    fromDiameter: blank.footprintDiameter,
    toCenterX: blank.x,
    toCenterY: blank.y,
    toDiameter: blank.footprintDiameter,
  };
}
