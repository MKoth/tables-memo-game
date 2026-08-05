import { useEffect, useRef } from 'react';
import { useFrameCallback, useSharedValue } from 'react-native-reanimated';

declare const performance: { now(): number };

type ComponentPerfRecord = {
  renders: number;
  totalTimeMs: number;
  maxTimeMs: number;
};

const renderStatsMap = new Map<string, ComponentPerfRecord>();

export function recordComponentRender(name: string, durationMs: number) {
  let record = renderStatsMap.get(name);
  if (!record) {
    record = { renders: 0, totalTimeMs: 0, maxTimeMs: 0 };
    renderStatsMap.set(name, record);
  }
  record.renders += 1;
  record.totalTimeMs += durationMs;
  if (durationMs > record.maxTimeMs) {
    record.maxTimeMs = durationMs;
  }
}

export function useRenderTracker(componentName: string) {
  const start = performance.now();

  useEffect(() => {
    const duration = performance.now() - start;
    recordComponentRender(componentName, duration);
  });
}

const EVENT_LOG_BUDGET_PER_INTERVAL = 40;
let eventLogBudget = EVENT_LOG_BUDGET_PER_INTERVAL;

function logEvent(message: string) {
  if (eventLogBudget <= 0) {
    return;
  }
  eventLogBudget -= 1;
  console.log(`[FG] ${message}`);
}

/**
 * Logs which props changed identity/value since the previous render. Debug
 * only — consumption is throttled per report interval to cap console spam.
 */
export function usePropDiffLogger(
  componentName: string,
  props: Record<string, unknown>,
) {
  const prevRef = useRef<Record<string, unknown> | null>(null);
  const prev = prevRef.current;
  if (prev != null) {
    const changed: string[] = [];
    for (const key of new Set([...Object.keys(prev), ...Object.keys(props)])) {
      if (prev[key] !== props[key]) {
        changed.push(key);
      }
    }
    if (changed.length > 0) {
      logEvent(`${componentName} diff: ${changed.join(', ')}`);
    }
  }
  prevRef.current = props;
}

/** Fire-and-forget event log for parent render causes (e.g. WordOrbs). */
export function logPerfEvent(message: string) {
  logEvent(message);
}

const REPORT_INTERVAL_MS = 2000;

export function useFlowerGardenPerfMonitor(enabled = true) {
  const frameCount = useSharedValue(0);
  const lastFrameTime = useSharedValue(-1);
  const frameDeltas = useSharedValue<number[]>([]);
  const lastReportTime = useSharedValue(performance.now());

  useFrameCallback(
    info => {
      'worklet';
      if (!enabled) return;
      const now = info.timestamp;
      if (lastFrameTime.value !== -1) {
        const delta = now - lastFrameTime.value;
        if (delta > 0 && delta < 1000) {
          frameDeltas.value.push(delta);
        }
      }
      lastFrameTime.value = now;
      frameCount.value += 1;
    },
    enabled,
  );

  useEffect(() => {
    if (!enabled) return;

    const timer = setInterval(() => {
      eventLogBudget = EVENT_LOG_BUDGET_PER_INTERVAL;
      const now = performance.now();
      const intervalMs = now - lastReportTime.value;
      lastReportTime.value = now;

      const deltas = frameDeltas.value;
      frameDeltas.value = [];
      const frames = deltas.length;

      let avgMs = 0;
      let minMs = 0;
      let maxMs = 0;
      if (frames > 0) {
        const sum = deltas.reduce((a, b) => a + b, 0);
        avgMs = sum / frames;
        minMs = Math.min(...deltas);
        maxMs = Math.max(...deltas);
      }

      const componentLines: string[] = [];
      renderStatsMap.forEach((stats, name) => {
        if (stats.renders === 0) return;
        componentLines.push(
          `   ${name}: ${stats.renders} renders | total ${stats.totalTimeMs.toFixed(1)}ms | avg ${(stats.totalTimeMs / stats.renders).toFixed(2)}ms | max ${stats.maxTimeMs.toFixed(1)}ms`,
        );
        stats.renders = 0;
        stats.totalTimeMs = 0;
        stats.maxTimeMs = 0;
      });

      const fps = intervalMs > 0 ? (frames / intervalMs) * 1000 : 0;
      const report = [
        '[FLOWER GARDEN PERF]',
        `  fps ${fps.toFixed(1)} | interval ${(intervalMs / 1000).toFixed(1)}s | frames ${frames}`,
        `  frameTime avg ${avgMs.toFixed(1)}ms min ${minMs.toFixed(1)}ms max ${maxMs.toFixed(1)}ms`,
        componentLines.length > 0
          ? `  component renders:\n${componentLines.join('\n')}`
          : '  component renders: none',
      ].join('\n');

      console.log(report);
    }, REPORT_INTERVAL_MS);

    return () => {
      clearInterval(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);
}
