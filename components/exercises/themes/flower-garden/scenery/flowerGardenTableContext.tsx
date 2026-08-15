import React, { createContext, useContext, type ReactNode } from 'react';
import type { SharedValue } from 'react-native-reanimated';
import type { TableData } from '../../../../../data/tableData';
import type { ZoneRect } from '../../../core';
import type { FieldFlowerConfig } from './FieldFlowerShaderLayer/types';
import type { EarthGrassBackgroundConfig } from '../shaders/earthGrassBackground.sksl';

export type FlowerGardenTableContextValue = {
  table: TableData | null;
  fieldFlowerConfigs?: readonly FieldFlowerConfig[];
  flowerSwingBoosts?: SharedValue<number[]>;
  /** Replaces the petal scatter band zone (defaults to above the ground band). */
  groundScatterBandZone?: ZoneRect;
  /** Replaces the earth-reveal mask config; `null` hides the earth entirely. */
  earthMaskConfig?: EarthGrassBackgroundConfig | null;
  /** Overrides the petal scatter count (defaults to the band default). */
  petalCount?: number;
};

const FlowerGardenTableContext = createContext<FlowerGardenTableContextValue | null>(null);

type FlowerGardenTableProviderProps = {
  value: FlowerGardenTableContextValue;
  children: ReactNode;
};

export function FlowerGardenTableProvider({
  value,
  children,
}: FlowerGardenTableProviderProps) {
  return (
    <FlowerGardenTableContext.Provider value={value}>
      {children}
    </FlowerGardenTableContext.Provider>
  );
}

export function useFlowerGardenTableContext(): FlowerGardenTableContextValue {
  const context = useContext(FlowerGardenTableContext);
  if (context == null) {
    throw new Error(
      'useFlowerGardenTableContext must be used within FlowerGardenTableProvider',
    );
  }
  return context;
}
