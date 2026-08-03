export const CloudPatchStage = {
  Hidden: 0,
  Entering: 1,
  Holding: 2,
  Exiting: 3,
} as const;

export type CloudPatchStageValue = (typeof CloudPatchStage)[keyof typeof CloudPatchStage];

export type CloudPatchSlot = {
  active: boolean;
  stage: CloudPatchStageValue;
  /** Seconds elapsed since this slot's last spawn. */
  age: number;
  /**
   * Seconds left before an unspawned slot's first spawn (initial stagger).
   * Set to -1 once a patch has finished its cycle, marking the slot free for
   * an exit-triggered replacement (so fade-out and fade-in overlap).
   */
  respawnDelay: number;
  x: number;
  y: number;
  size: number;
  rotation: number;
  imageIndex: number;
  opacity: number;
  peakOpacity: number;
  fadeInSeconds: number;
  holdSeconds: number;
  fadeOutSeconds: number;
};

export type OrbCloudLayerConfig = {
  centerX: number;
  centerY: number;
  diameter: number;
  patchCount: number;
  peakOpacity: number;
  opacityJitter: number;
  edgeBias: number;
  lifetimeMinMs: number;
  lifetimeMaxMs: number;
  fadeInMs: number;
  fadeOutMs: number;
  minSizeFraction: number;
  maxSizeFraction: number;
  /** Spawn radius is capped so a patch stays inside the orb disk. */
  spawnMarginFraction: number;
  initialDelayMaxMs: number;
  dismissFadeMs: number;
  /** 1 once the orb starts bursting; blocks respawns so the layer fades out. */
  dismissing: 0 | 1;
  imageCount: number;
};
