import type { SharedValue } from 'react-native-reanimated';
import { useTapGesture } from 'react-native-gesture-handler';
import { scheduleOnRN } from 'react-native-worklets';
import { TAP_MAX_DISTANCE_PX } from '../../../../carrier/WordSpriteTableLayer/config/wordSpriteTableLayerConfig';
import { findRoamerIndexAtTap } from '../../../../roamer/gestures/roamerTapWorklets';
import {
  findMatchWordSpriteIndexAtTap,
  triggerMatchWordSpriteFlash,
  triggerMatchWordSpritePrimaryFlash,
} from './wordSpriteMatchWorklets';
import {
  BubblePhase,
  isTapInsideBubble,
  type BubbleAnimState,
} from '../../../../roamer/bubbles';

export type WordSpriteTapData = {
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

export type RoamerTapData = {
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
  wordSpriteTapDataRef: React.MutableRefObject<WordSpriteTapData | null>;
  roamerTapDataRef: React.MutableRefObject<RoamerTapData | null>;
  onCorrectMatchJs: (hitIdx: number) => void;
  onWrongMatchJs: (hitIdx: number) => void;
  onNeutralTapJs: (hitIdx: number) => void;
};

export function useCombinedMatchGestures({
  wordSpriteTapDataRef,
  roamerTapDataRef,
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

      const jData = wordSpriteTapDataRef.current;
      if (jData == null) {
        return;
      }

      const capturedEnglish = jData.capturedEnglishSv.value;
      const hasCaptured = capturedEnglish.length > 0;

      if (hasCaptured) {
        const kData = roamerTapDataRef.current;

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

        const hitIdx = findMatchWordSpriteIndexAtTap(
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

        triggerMatchWordSpriteFlash(
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
        let roamerHitIdx = -1;
        let roamerOriginX = 0;
        let roamerOriginY = 0;

        jellyHitIdx = findMatchWordSpriteIndexAtTap(
          tapX,
          tapY,
          jData.bellSizes,
          jData.layoutX.value,
          jData.layoutY.value,
          jData.layoutScale.value,
          jData.matchedIndicesSv.value,
        );

        const kData = roamerTapDataRef.current;
        if (kData != null) {
          const positions = kData.positionsSv.value;
          roamerHitIdx = findRoamerIndexAtTap(
            tapX,
            tapY,
            positions,
            kData.count,
            kData.hitRadius,
            kData.eliminatedFishSv.value,
          );
          if (roamerHitIdx >= 0) {
            roamerOriginX = positions[roamerHitIdx * 2] ?? 0;
            roamerOriginY = positions[roamerHitIdx * 2 + 1] ?? 0;
          }
        }

        if (jellyHitIdx >= 0) {
          triggerMatchWordSpritePrimaryFlash(
            jellyHitIdx,
            jData.tintFlashPreset,
            jData.tintFlashUntil,
            jData.clock,
          );
          scheduleOnRN(onNeutralTapJs, jellyHitIdx);
        }

        if (roamerHitIdx >= 0 && kData != null) {
          const word = kData.words[roamerHitIdx] ?? '';
          scheduleOnRN(kData.onFishSelect, word, roamerHitIdx, roamerOriginX, roamerOriginY);
        }
      }
    },
  });

  return tapGesture;
}
