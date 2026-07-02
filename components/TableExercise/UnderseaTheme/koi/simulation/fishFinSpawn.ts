import {
  KOI_SETTINGS,
  type FinSideSpawn,
} from '../config/koiFishSettings';
import type { FishConfig, FishRuntime } from './types';

export function nextFinRerollDelay(interval: number, jitter: number): number {
  if (interval <= 0) {
    return Number.MAX_VALUE;
  }
  return interval + Math.random() * jitter;
}

export function rollFinSideSpawn(settings: typeof KOI_SETTINGS, freqSeed: number): FinSideSpawn {
  const variant = Math.random() < settings.finThinProbability ? 1 : 0;
  const base = variant === 1 ? settings.finThinFreqBase : settings.finRetractFreqBase;
  const jitter = variant === 1 ? settings.finThinFreqJitter : settings.finRetractFreqJitter;
  const freq = base + Math.sin(freqSeed) * jitter;

  return {
    variant,
    freq,
    initialPhase: Math.random() * Math.PI * 2,
  };
}

export function finSquashAtPhase(phase: number, base: number, amp: number): number {
  return base + amp * (0.5 - 0.5 * Math.cos(phase));
}

export function applyFinSideSpawn(
  fish: FishRuntime,
  side: 'left' | 'right',
  spawn: FinSideSpawn,
  config: FishConfig,
): void {
  const rerollDelay = nextFinRerollDelay(
    config.finBehaviorRerollInterval,
    config.finBehaviorRerollJitter,
  );

  if (side === 'left') {
    fish.finVariantLeft.value = spawn.variant;
    fish.finFreqLeft.value = spawn.freq;
    fish.finPhaseLeft.value = spawn.initialPhase;
    fish.finSquashLeft.value = finSquashAtPhase(
      spawn.initialPhase,
      config.finSquashBase,
      config.finSquashAmp,
    );
    fish.finRerollTimerLeft.value = rerollDelay;
    return;
  }

  fish.finVariantRight.value = spawn.variant;
  fish.finFreqRight.value = spawn.freq;
  fish.finPhaseRight.value = spawn.initialPhase;
  fish.finSquashRight.value = finSquashAtPhase(
    spawn.initialPhase,
    config.finSquashBase,
    config.finSquashAmp,
  );
  fish.finRerollTimerRight.value = rerollDelay;
}
