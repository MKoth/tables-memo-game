import type { SharedValue } from 'react-native-reanimated';
import type { ZoneRect } from '../../../../core/layout/computeExerciseLayout';
import type { BubbleAnimState } from '../bubbles/useBubbleAnimation';
import type { RoamerRuntimeEntry, SwimZone } from './types';

export type RoamerCaptureSharedState = {
  capturedFishIndex: SharedValue<number>;
  captureOriginX: SharedValue<number>;
  captureOriginY: SharedValue<number>;
  bubbleAnim: SharedValue<BubbleAnimState>;
  bubblePhase: SharedValue<number>;
  enterProgress: SharedValue<number>;
  escapeActive: SharedValue<boolean>;
  escapeStage: SharedValue<number>;
  escapeTargetX: SharedValue<number>;
  escapeTargetY: SharedValue<number>;
  offScreenTargetX: SharedValue<number>;
  offScreenTargetY: SharedValue<number>;
  /** 0=top, 1=bottom, 2=left, 3=right */
  escapeExitEdge: SharedValue<number>;
  escapeCompleteTriggered: SharedValue<boolean>;
  escapeOverlayDismissTriggered: SharedValue<boolean>;
};

export type UseRoamerFishSimulationParams = {
  width: number;
  height: number;
  roamerRect: ZoneRect;
  layoutKey: string;
  words: string[];
  captureState: RoamerCaptureSharedState;
  releaseRequestSv: SharedValue<number>;
  eliminatedFishSv: SharedValue<number[]>;
  onEscapeOverlayDismiss: () => void;
  onEscapeComplete: () => void;
  onSpeedIncrease?: () => void;
};

export type RoamerFishSimulation = {
  runtimeEntries: RoamerRuntimeEntry[];
  sharedPositions: SharedValue<number[]>;
  swimZone: SwimZone;
  armCapture: (fishIndex: number, originX: number, originY: number) => void;
  fishLength: number;
  fishThickness: number;
  swimZoneTop: number;
  swimZoneHeight: number;
  swimZoneLeft: number;
  swimZoneWidth: number;
  hitRadius: number;
  renderProps: {
    swimZoneX: number;
    swimZoneY: number;
    swimZoneW: number;
    swimZoneH: number;
    fishW: number;
    fishH: number;
    sourceAngle: number;
    tailFlex: {
      tailBendScale: number;
      tailTipBendScale: number;
      headBendScale: number;
    };
    turnDistort: {
      squashGain: number;
      bulgeGain: number;
    };
  };
};
