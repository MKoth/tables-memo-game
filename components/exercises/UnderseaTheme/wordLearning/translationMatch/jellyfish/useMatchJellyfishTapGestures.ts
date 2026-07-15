import type { SharedValue } from 'react-native-reanimated';
import { useTapGesture } from 'react-native-gesture-handler';
import { scheduleOnRN } from 'react-native-worklets';
import { TAP_MAX_DISTANCE_PX } from '../../../jellyfish/JellyfishTableLayer/config/jellyfishTableLayerConfig';
import {
  findMatchJellyfishIndexAtTap,
  triggerMatchJellyfishFlash,
  triggerMatchJellyfishPrimaryFlash,
} from './jellyfishMatchWorklets';

type JsCallbacks = {
  onCorrectMatchJs: (hitIdx: number) => void;
  onWrongMatchJs: (hitIdx: number) => void;
  onNeutralTapJs: (hitIdx: number) => void;
};

type UseMatchJellyfishTapGesturesParams = {
  layoutX: SharedValue<number[]>;
  layoutY: SharedValue<number[]>;
  layoutScale: SharedValue<number[]>;
  bellSizes: number[];
  tintFlashPreset: SharedValue<number[]>;
  tintFlashUntil: SharedValue<number[]>;
  clock: SharedValue<number>;
  capturedEnglishSv: SharedValue<string>;
  matchedIndicesSv: SharedValue<number[]>;
  englishWordsByIndexSv: SharedValue<string[]>;
} & JsCallbacks;

export function useMatchJellyfishTapGestures({
  layoutX,
  layoutY,
  layoutScale,
  bellSizes,
  tintFlashPreset,
  tintFlashUntil,
  clock,
  capturedEnglishSv,
  matchedIndicesSv,
  englishWordsByIndexSv,
  onCorrectMatchJs,
  onWrongMatchJs,
  onNeutralTapJs,
}: UseMatchJellyfishTapGesturesParams) {
  const tapGesture = useTapGesture({
    numberOfTaps: 1,
    maxDuration: 400,
    maxDistance: TAP_MAX_DISTANCE_PX,
    onDeactivate: e => {
      'worklet';
      const tapX = e.x;
      const tapY = e.y;
      const hitIdx = findMatchJellyfishIndexAtTap(
        tapX,
        tapY,
        bellSizes,
        layoutX.value,
        layoutY.value,
        layoutScale.value,
        matchedIndicesSv.value,
      );
      if (hitIdx < 0) {
        return;
      }

      const capturedEnglish = capturedEnglishSv.value;
      const hasCaptured = capturedEnglish.length > 0;

      if (hasCaptured) {
        const englishWords = englishWordsByIndexSv.value;
        const matchingEnglish = englishWords[hitIdx] ?? '';
        const isCorrect = capturedEnglish === matchingEnglish;

        triggerMatchJellyfishFlash(
          hitIdx,
          isCorrect,
          tintFlashPreset,
          tintFlashUntil,
          clock,
        );

        if (isCorrect) {
          scheduleOnRN(onCorrectMatchJs, hitIdx);
        } else {
          scheduleOnRN(onWrongMatchJs, hitIdx);
        }
      } else {
        triggerMatchJellyfishPrimaryFlash(
          hitIdx,
          tintFlashPreset,
          tintFlashUntil,
          clock,
        );
        scheduleOnRN(onNeutralTapJs, hitIdx);
      }
    },
  });

  return tapGesture;
}
