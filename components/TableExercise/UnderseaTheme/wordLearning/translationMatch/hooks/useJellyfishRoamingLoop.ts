import { useCallback, useEffect, useRef } from 'react';
import { useFrameCallback, useSharedValue } from 'react-native-reanimated';
import type { SharedValue } from 'react-native-reanimated';
import {
  JELLYFISH_SPEED,
  JELLYFISH_SPEED_VARIANCE,
  JELLYFISH_STATE_IDLE,
  JELLYFISH_STATE_SWIMMING,
  pickRoamingTarget,
  stepJellyfish,
  type JellyfishState,
  type Zone,
} from '../domain/jellyfishRoaming';

const TILT_LERP_FACTOR = 0.12;
const EXIT_SPEED_MULTIPLIER = 6;
const EXIT_MARGIN = 120;

type JellyfishRoamingLoopParams = {
  count: number;
  zoneWidth: number;
  zoneHeight: number;
  matchedIndicesSv?: SharedValue<number[]>;
  exitTargetsSv?: SharedValue<Record<number, { tx: number; ty: number }>>;
};

export type JellyfishRoamingLoopResult = {
  layoutX: SharedValue<number[]>;
  layoutY: SharedValue<number[]>;
  layoutScale: SharedValue<number[]>;
  tiltAngles: SharedValue<number[]>;
  tiltAmps: SharedValue<number[]>;
};

export function useJellyfishRoamingLoop({
  count,
  zoneWidth,
  zoneHeight,
  matchedIndicesSv,
  exitTargetsSv,
}: JellyfishRoamingLoopParams): JellyfishRoamingLoopResult {
  const layoutX = useSharedValue<number[]>([]);
  const layoutY = useSharedValue<number[]>([]);
  const layoutScale = useSharedValue<number[]>([]);
  const tiltAngles = useSharedValue<number[]>([]);
  const tiltAmps = useSharedValue<number[]>([]);
  const targetX = useSharedValue<number[]>([]);
  const targetY = useSharedValue<number[]>([]);
  const statesSv = useSharedValue<number[]>([]);
  const stateTimersSv = useSharedValue<number[]>([]);

  const zoneWidthSv = useSharedValue(zoneWidth);
  const zoneHeightSv = useSharedValue(zoneHeight);

  const lastTsRef = useRef(0);

  zoneWidthSv.value = zoneWidth;
  zoneHeightSv.value = zoneHeight;

  const initSharedValues = useCallback(() => {
    if (zoneWidth === 0 || zoneHeight === 0) {
      return;
    }

    const xs: number[] = [];
    const ys: number[] = [];
    const scales: number[] = [];
    const hds: number[] = [];
    const amps: number[] = [];
    const txs: number[] = [];
    const tys: number[] = [];
    const sts: number[] = [];
    const tims: number[] = [];
    const zone: Zone = { x: 0, y: 0, w: zoneWidth, h: zoneHeight };

    for (let i = 0; i < count; i++) {
      const x = 80 + Math.random() * (zoneWidth - 160);
      const y = 80 + Math.random() * (zoneHeight - 160);
      xs.push(x);
      ys.push(y);
      scales.push(1);
      hds.push(Math.random() * Math.PI * 2);
      amps.push(0.06);

      const target = pickRoamingTarget(zone, null, Math.random);
      txs.push(target.x);
      tys.push(target.y);
      sts.push(JELLYFISH_STATE_SWIMMING);
      tims.push(2 + Math.random() * 4);
    }

    layoutX.value = xs;
    layoutY.value = ys;
    layoutScale.value = scales;
    tiltAngles.value = hds;
    tiltAmps.value = amps;
    targetX.value = txs;
    targetY.value = tys;
    statesSv.value = sts;
    stateTimersSv.value = tims;
  }, [count, zoneWidth, zoneHeight, layoutX, layoutY, layoutScale, tiltAngles, tiltAmps, targetX, targetY, statesSv, stateTimersSv]);

  useEffect(() => {
    initSharedValues();
  }, [initSharedValues]);

  useFrameCallback(({ timeSinceFirstFrame }) => {
    'worklet';
    const currentFrameMs = timeSinceFirstFrame ?? 0;
    const dtRaw = currentFrameMs - lastTsRef.current;
    lastTsRef.current = currentFrameMs;

    if (dtRaw <= 0 || dtRaw > 500) {
      return;
    }

    const dt = dtRaw / 1000;
    const xs = layoutX.value;
    const ys = layoutY.value;
    const hds = tiltAngles.value;
    const txs = targetX.value;
    const tys = targetY.value;
    const sts = statesSv.value;
    const tims = stateTimersSv.value;
    const n = Math.min(xs.length, ys.length, hds.length, txs.length, tys.length, sts.length, tims.length, count);

    const matched = matchedIndicesSv?.value ?? [];
    const exits = exitTargetsSv?.value ?? {};

    const zone: Zone = {
      x: 0,
      y: 0,
      w: zoneWidthSv.value,
      h: zoneHeightSv.value,
    };

    const states: JellyfishState[] = [];
    for (let i = 0; i < n; i++) {
      states.push({
        x: xs[i] ?? 0,
        y: ys[i] ?? 0,
        targetX: txs[i] ?? 0,
        targetY: tys[i] ?? 0,
        heading: hds[i] ?? 0,
        state: sts[i] ?? JELLYFISH_STATE_SWIMMING,
        stateTimer: tims[i] ?? 0,
      });
    }

    const newXs: number[] = [];
    const newYs: number[] = [];
    const newHds: number[] = [];
    const newAmps: number[] = [];
    const newTxs: number[] = [];
    const newTys: number[] = [];
    const newSts: number[] = [];
    const newTims: number[] = [];

    const isMatched = (idx: number): boolean => {
      for (let m = 0; m < matched.length; m++) {
        if (matched[m] === idx) {
          return true;
        }
      }
      return false;
    };

    for (let i = 0; i < n; i++) {
      const hasExitTarget = exits[i] != null;

      if (isMatched(i) && !hasExitTarget) {
        newXs.push(xs[i] ?? 0);
        newYs.push(ys[i] ?? 0);
        newHds.push(hds[i] ?? 0);
        newAmps.push(0);
        newTxs.push(txs[i] ?? 0);
        newTys.push(tys[i] ?? 0);
        newSts.push(JELLYFISH_STATE_IDLE);
        newTims.push(tims[i] ?? 0);
        continue;
      }

      if (hasExitTarget) {
        const exit = exits[i]!;
        const cx = xs[i] ?? 0;
        const cy = ys[i] ?? 0;
        const dx = exit.tx - cx;
        const dy = exit.ty - cy;
        const dist = Math.hypot(dx, dy);
        const speed = JELLYFISH_SPEED * EXIT_SPEED_MULTIPLIER;
        const moveDist = speed * dt;

        let newX: number;
        let newY: number;
        if (dist <= moveDist) {
          newX = exit.tx;
          newY = exit.ty;
        } else {
          const angle = Math.atan2(dy, dx);
          newX = cx + Math.cos(angle) * moveDist;
          newY = cy + Math.sin(angle) * moveDist;
        }

        const offScreen =
          newX < -EXIT_MARGIN ||
          newX > zone.w + EXIT_MARGIN ||
          newY < -EXIT_MARGIN ||
          newY > zone.h + EXIT_MARGIN;

        if (offScreen) {
          newXs.push(newX);
          newYs.push(newY);
          newHds.push(Math.atan2(dy, dx));
          newAmps.push(0);
          newTxs.push(exit.tx);
          newTys.push(exit.ty);
          newSts.push(JELLYFISH_STATE_IDLE);
          newTims.push(0);
        } else {
          newXs.push(newX);
          newYs.push(newY);
          newHds.push(Math.atan2(dy, dx));
          newAmps.push(0.04);
          newTxs.push(exit.tx);
          newTys.push(exit.ty);
          newSts.push(JELLYFISH_STATE_SWIMMING);
          newTims.push(10);
        }
        continue;
      }

      const state = states[i];
      if (state == null) {
        newXs.push(0);
        newYs.push(0);
        newHds.push(0);
        newAmps.push(0);
        newTxs.push(0);
        newTys.push(0);
        newSts.push(JELLYFISH_STATE_IDLE);
        newTims.push(0);
        continue;
      }

      const speed =
        JELLYFISH_SPEED +
        (Math.random() - 0.5) * JELLYFISH_SPEED_VARIANCE * 2;

      const next = stepJellyfish(
        state,
        dt,
        speed,
        zone,
        null,
        states,
        i,
        Math.random,
      );

      newXs.push(next.x);
      newYs.push(next.y);
      newHds.push(next.heading);
      newAmps.push(next.state === JELLYFISH_STATE_IDLE ? 0 : 0.06);
      newTxs.push(next.targetX);
      newTys.push(next.targetY);
      newSts.push(next.state);
      newTims.push(next.stateTimer);
    }

    const prevHds = tiltAngles.value;
    const prevAmps = tiltAmps.value;
    const smoothedHds: number[] = [];
    const smoothedAmps: number[] = [];

    for (let i = 0; i < n; i++) {
      const rawHd = newHds[i] ?? 0;
      const rawAmp = newAmps[i] ?? 0;
      const prevHd = prevHds[i] ?? rawHd;
      const prevAmp = prevAmps[i] ?? rawAmp;

      let diff = rawHd - prevHd;
      while (diff > Math.PI) {
        diff -= Math.PI * 2;
      }
      while (diff < -Math.PI) {
        diff += Math.PI * 2;
      }
      smoothedHds.push(prevHd + diff * TILT_LERP_FACTOR);
      smoothedAmps.push(prevAmp + (rawAmp - prevAmp) * TILT_LERP_FACTOR * 2);
    }

    layoutX.value = newXs;
    layoutY.value = newYs;
    tiltAngles.value = smoothedHds;
    tiltAmps.value = smoothedAmps;
    targetX.value = newTxs;
    targetY.value = newTys;
    statesSv.value = newSts;
    stateTimersSv.value = newTims;
  });

  return { layoutX, layoutY, layoutScale, tiltAngles, tiltAmps };
}
