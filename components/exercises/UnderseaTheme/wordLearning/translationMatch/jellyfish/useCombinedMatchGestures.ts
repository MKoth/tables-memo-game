import type { SharedValue } from 'react-native-reanimated';
import { useTapGesture } from 'react-native-gesture-handler';
import { scheduleOnRN } from 'react-native-worklets';
import { TAP_MAX_DISTANCE_PX } from '../../../jellyfish/JellyfishTableLayer/config/jellyfishTableLayerConfig';
import { findKoiIndexAtTap } from '../../../koi/gestures/koiTapWorklets';
import {
  findMatchJellyfishIndexAtTap,
  triggerMatchJellyfishFlash,
  triggerMatchJellyfishPrimaryFlash,
} from './jellyfishMatchWorklets';
import {
  BubblePhase,
  isTapInsideBubble,
  type BubbleAnimState,
} from '../../../koi/bubbles';

export type JellyfishTapData = {
  layoutX: SharedValue<number[]>;
  layoutY: SharedValue<number[]>;
  layoutScale: SharedValue<number[]>;
  bellSizes: number[];
  tintFlashPreset: SharedValue<number[]>;
  tintFlashUntil: SharedValue<number[]>;
  clock: SharedValue<number>;
  matchedIndicesSv: SharedValue<number[]>;
  capturedEnglishSv: SharedValue<string>;
  englishWordsByIndexSv: SharedValue<string[]>;
};

export type KoiTapData = {
  positionsSv: SharedValue<number[]>;
  count: number;
  hitRadius: number;
  eliminatedFishSv: SharedValue<number[]>;
  words: string[];
  onFishSelect: (word: string, fishIndex: number, originX: number, originY: number) => void;
  bubbleAnim?: SharedValue<BubbleAnimState>;
  bubblePhase?: SharedValue<number>;
  escapeActiveSv?: SharedValue<boolean>;
  startBurst?: () => void;
};

type UseCombinedMatchGesturesParams = {
  jellyfishTapDataRef: React.MutableRefObject<JellyfishTapData | null>;
  koiTapDataRef: React.MutableRefObject<KoiTapData | null>;
  onCorrectMatchJs: (hitIdx: number) => void;
  onWrongMatchJs: (hitIdx: number) => void;
  onNeutralTapJs: (hitIdx: number) => void;
};

export function useCombinedMatchGestures({
  jellyfishTapDataRef,
  koiTapDataRef,
  onCorrectMatchJs,
  onWrongMatchJs,
  onNeutralTapJs,
}: UseCombinedMatchGesturesParams) {
  const tapGesture = useTapGesture({
    numberOfTaps: 1,
    maxDuration: 400,
    maxDistance: TAP_MAX_DISTANCE_PX,
    onDeactivate: e => {
      'worklet';
      const tapX = e.x;
      const tapY = e.y;

      const jData = jellyfishTapDataRef.current;
      if (jData == null) {
        return;
      }

      const capturedEnglish = jData.capturedEnglishSv.value;
      const hasCaptured = capturedEnglish.length > 0;

      if (hasCaptured) {
        const kData = koiTapDataRef.current;

        if (
          kData != null &&
          kData.bubbleAnim != null &&
          kData.bubblePhase != null &&
          kData.bubblePhase.value === BubblePhase.Idle &&
          (kData.escapeActiveSv == null || !kData.escapeActiveSv.value) &&
          isTapInsideBubble(tapX, tapY, kData.bubbleAnim.value)
        ) {
          if (kData.startBurst != null) {
            scheduleOnRN(kData.startBurst);
          }
          return;
        }

        const hitIdx = findMatchJellyfishIndexAtTap(
          tapX,
          tapY,
          jData.bellSizes,
          jData.layoutX.value,
          jData.layoutY.value,
          jData.layoutScale.value,
          jData.matchedIndicesSv.value,
        );
        if (hitIdx < 0) {
          return;
        }

        const englishWords = jData.englishWordsByIndexSv.value;
        const matchingEnglish = englishWords[hitIdx] ?? '';
        const isCorrect = capturedEnglish === matchingEnglish;

        triggerMatchJellyfishFlash(
          hitIdx,
          isCorrect,
          jData.tintFlashPreset,
          jData.tintFlashUntil,
          jData.clock,
        );

        if (isCorrect) {
          scheduleOnRN(onCorrectMatchJs, hitIdx);
        } else {
          scheduleOnRN(onWrongMatchJs, hitIdx);
        }
      } else {
        let jellyHitIdx = -1;
        let koiHitIdx = -1;
        let koiOriginX = 0;
        let koiOriginY = 0;

        jellyHitIdx = findMatchJellyfishIndexAtTap(
          tapX,
          tapY,
          jData.bellSizes,
          jData.layoutX.value,
          jData.layoutY.value,
          jData.layoutScale.value,
          jData.matchedIndicesSv.value,
        );

        const kData = koiTapDataRef.current;
        if (kData != null) {
          const positions = kData.positionsSv.value;
          koiHitIdx = findKoiIndexAtTap(
            tapX,
            tapY,
            positions,
            kData.count,
            kData.hitRadius,
            kData.eliminatedFishSv.value,
          );
          if (koiHitIdx >= 0) {
            koiOriginX = positions[koiHitIdx * 2] ?? 0;
            koiOriginY = positions[koiHitIdx * 2 + 1] ?? 0;
          }
        }

        if (jellyHitIdx >= 0) {
          triggerMatchJellyfishPrimaryFlash(
            jellyHitIdx,
            jData.tintFlashPreset,
            jData.tintFlashUntil,
            jData.clock,
          );
          scheduleOnRN(onNeutralTapJs, jellyHitIdx);
        }

        if (koiHitIdx >= 0 && kData != null) {
          const word = kData.words[koiHitIdx] ?? '';
          scheduleOnRN(kData.onFishSelect, word, koiHitIdx, koiOriginX, koiOriginY);
        }
      }
    },
  });

  return tapGesture;
}
