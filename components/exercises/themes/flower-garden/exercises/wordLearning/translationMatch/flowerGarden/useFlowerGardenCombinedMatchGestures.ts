import type { SharedValue } from 'react-native-reanimated';
import { useTapGesture } from 'react-native-gesture-handler';
import { scheduleOnRN } from 'react-native-worklets';
import type { ThemeCombinedMatchGestureParams } from '../../../../../../themeContract';
import { TAP_MAX_DISTANCE_PX } from '../../../../carrier/FlowerGardenWordSpriteTableLayer/config/flowerTableLayerConfig';
import { findRoamerIndexAtTap } from '../../../../orb/roamerTapWorklets';
import type { OrbAnimState } from '../../../../orb/orbAnimTypes';
import {
  findFlowerMatchRoseIndexAtTap,
  isTapInsideFlowerOrb,
  triggerFlowerMatchRoseFlash,
  triggerFlowerMatchRosePrimaryFlash,
} from '../roseWorklets';

export type FlowerGardenMatchRoseTapData = {
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

export type FlowerGardenMatchRoamerTapData = {
  sharedPositions: SharedValue<number[]>;
  roamerCount: number;
  hitRadius: number;
  eliminatedIndices: number[];
  words: string[];
  onRoamerSelect: (roamerIndex: number, originX: number, originY: number) => void;
  orbAnim: SharedValue<OrbAnimState>;
  orbPhase: SharedValue<number>;
  startBurst: () => void;
};

export function useFlowerGardenCombinedMatchGestures({
  wordSpriteTapDataRef,
  roamerTapDataRef,
  onCorrectMatchJs,
  onWrongMatchJs,
  onNeutralTapJs,
}: ThemeCombinedMatchGestureParams) {
  const tapGesture = useTapGesture({
    numberOfTaps: 1,
    maxDuration: 400,
    maxDistance: TAP_MAX_DISTANCE_PX,
    onDeactivate: e => {
      'worklet';
      const tapX = e.x;
      const tapY = e.y;

      const roseData = wordSpriteTapDataRef.current as FlowerGardenMatchRoseTapData | null;
      if (roseData == null) {
        return;
      }

      const capturedEnglish = roseData.capturedEnglishSv.value;
      const hasCaptured = capturedEnglish.length > 0;

      if (hasCaptured) {
        const rData = roamerTapDataRef.current as FlowerGardenMatchRoamerTapData | null;

        if (
          rData != null &&
          isTapInsideFlowerOrb(tapX, tapY, rData.orbPhase.value, rData.orbAnim.value)
        ) {
          scheduleOnRN(rData.startBurst);
          return;
        }

        const hitIdx = findFlowerMatchRoseIndexAtTap(
          tapX,
          tapY,
          roseData.bellSizes,
          roseData.layoutX.value,
          roseData.layoutY.value,
          roseData.layoutScale.value,
          roseData.matchedIndicesSv.value,
        );
        if (hitIdx < 0) {
          return;
        }

        const englishWords = roseData.englishWordsByIndexSv.value;
        const matchingEnglish = englishWords[hitIdx] ?? '';
        const isCorrect = capturedEnglish === matchingEnglish;

        triggerFlowerMatchRoseFlash(
          hitIdx,
          isCorrect,
          roseData.tintFlashPreset,
          roseData.tintFlashUntil,
          roseData.clock,
        );

        if (isCorrect) {
          scheduleOnRN(onCorrectMatchJs, hitIdx);
        } else {
          scheduleOnRN(onWrongMatchJs, hitIdx);
        }
      } else {
        let roseHitIdx = -1;
        let roamerHitIdx = -1;
        let roamerOriginX = 0;
        let roamerOriginY = 0;

        roseHitIdx = findFlowerMatchRoseIndexAtTap(
          tapX,
          tapY,
          roseData.bellSizes,
          roseData.layoutX.value,
          roseData.layoutY.value,
          roseData.layoutScale.value,
          roseData.matchedIndicesSv.value,
        );

        const rData = roamerTapDataRef.current as FlowerGardenMatchRoamerTapData | null;
        if (rData != null) {
          const positions = rData.sharedPositions.value;
          roamerHitIdx = findRoamerIndexAtTap(
            tapX,
            tapY,
            positions,
            rData.roamerCount,
            rData.hitRadius,
            rData.eliminatedIndices,
          );
          if (roamerHitIdx >= 0) {
            roamerOriginX = positions[roamerHitIdx * 2] ?? 0;
            roamerOriginY = positions[roamerHitIdx * 2 + 1] ?? 0;
          }
        }

        if (roseHitIdx >= 0) {
          triggerFlowerMatchRosePrimaryFlash(
            roseHitIdx,
            roseData.tintFlashPreset,
            roseData.tintFlashUntil,
            roseData.clock,
          );
          scheduleOnRN(onNeutralTapJs, roseHitIdx);
        }

        if (roamerHitIdx >= 0 && rData != null) {
          scheduleOnRN(rData.onRoamerSelect, roamerHitIdx, roamerOriginX, roamerOriginY);
        }
      }
    },
  });

  return tapGesture;
}
