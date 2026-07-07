import type { SentencePromptDisplaySlot } from '../../domain/types';

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
  zoneLeft: number;
  zoneTop: number;
  zoneWidth: number;
  zoneHeight: number;
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
const REFERENCE_BODY_BELL_SIZE = 55;

function clamp(val: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, val));
}

function sr(a: number, b: number): number {
  let n = (a * 374761393 + b * 668265263) | 0;
  n = (n ^ (n >>> 13)) * 1274126177;
  n = n ^ (n >>> 16);
  return (n >>> 0) / 0xffffffff;
}

function rollBodyTint(index: number): Pick<
  SentenceSlotConfig,
  | 'tintMode'
  | 'tintStrength'
  | 'tintA'
  | 'tintB'
  | 'tintC'
  | 'animatedTint'
  | 'tintWaveSpeed'
  | 'labelFillColor'
  | 'labelStrokeColor'
> {
  const palette: ReadonlyArray<readonly [number, number, number]> = [
    [0.85, 0.55, 0.95],
    [0.55, 0.85, 1.0],
    [1.0, 0.7, 0.85],
    [0.9, 0.95, 1.1],
    [1.1, 0.85, 0.6],
    [0.7, 0.95, 0.75],
  ];
  const tintA = palette[index % palette.length]!;
  const tintB: readonly [number, number, number] = [
    tintA[0] * 0.85,
    tintA[1] * 0.85,
    tintA[2] * 0.85,
  ];
  const tintC: readonly [number, number, number] = [
    tintA[0] * 0.7,
    tintA[1] * 0.7,
    tintA[2] * 0.7,
  ];
  return {
    tintMode: 2,
    tintStrength: 0.85,
    tintA,
    tintB,
    tintC,
    animatedTint: true,
    tintWaveSpeed: 0.25 + sr(index, 11) * 0.35,
    labelFillColor: 'rgba(255,255,255,0.95)',
    labelStrokeColor: 'rgba(20,40,60,0.92)',
  };
}

function estimateSlotWidth(label: string, bellSize: number): number {
  const charWidth = bellSize * 0.22;
  const textWidth = Math.max(label.length * charWidth, bellSize * 0.45);
  return Math.max(bellSize, textWidth) + SLOT_GAP;
}

/**
 * Lay out sentence row jellyfish horizontally with line wrapping, vertically centered
 * in the jelly zone.
 */
export function computeSentenceRowLayout(input: SentenceRowLayoutInput): SentenceRowLayout {
  const { slots, zoneLeft, zoneTop, zoneWidth, zoneHeight } = input;
  const slotCount = slots.length;

  if (slotCount === 0) {
    return { xs: [], ys: [], scales: [], configs: [], fontScale: 1 };
  }

  const bellSize = clamp(
    Math.min(zoneWidth / Math.max(slotCount, 3), zoneHeight * 0.35),
    BODY_BELL_SIZE_MIN,
    BODY_BELL_SIZE_MAX,
  );
  const fontScale = bellSize / REFERENCE_BODY_BELL_SIZE;

  const configs: SentenceSlotConfig[] = slots.map((slot, index) => {
    const label = slot.kind === 'blank' ? '?' : slot.text;
    return {
      key: `slot-${index}`,
      index,
      label,
      kind: slot.kind,
      bellSize,
      phase: sr(index, 3) * Math.PI * 2,
      pulseSpeed: 2.2 + sr(index, 7) * 2.0,
      ...rollBodyTint(index),
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

export function findSentenceSlotAtTap(
  tapX: number,
  tapY: number,
  xs: readonly number[],
  ys: readonly number[],
  bellSizes: readonly number[],
): number {
  let bestIndex = -1;
  let bestDistSq = Number.POSITIVE_INFINITY;

  for (let index = 0; index < xs.length; index++) {
    const dx = tapX - (xs[index] ?? 0);
    const dy = tapY - (ys[index] ?? 0);
    const radius = (bellSizes[index] ?? 0) * 0.55;
    const distSq = dx * dx + dy * dy;
    if (distSq <= radius * radius && distSq < bestDistSq) {
      bestDistSq = distSq;
      bestIndex = index;
    }
  }

  return bestIndex;
}
