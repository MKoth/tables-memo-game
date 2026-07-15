export type LayoutBounds = {
  /** Width of the jelly layout zone (not necessarily full screen). */
  width: number;
  height: number;
  nGridCols: number;
  nGridRows: number;
  /** Left edge of the layout zone in px. */
  zoneLeft: number;
  /** Top edge of the layout zone in px. */
  zoneTop: number;
  /** Height of the layout zone in px. */
  zoneHeight: number;
  /** Jellyfish/tentacle scale when packed tight (overlap). */
  scaleMin: number;
  /** Jellyfish/tentacle scale when spread apart. */
  scaleMax: number;
  /** How strongly edges compress toward overlap (0 = uniform, 1 = max squeeze at edges). */
  edgeSqueeze: number;
  /** Extra spread multiplier at the spacing peak (center + bias). */
  spreadBoost: number;
};
