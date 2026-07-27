import React, { createContext, useContext, type ReactNode } from 'react';
import type { SharedValue } from 'react-native-reanimated';
import type { TableData } from '../../../../../data/tableData';
import type { FieldFlowerConfig } from './FieldFlowerShaderLayer/types';

export type FlowerGardenTableContextValue = {
  table: TableData | null;
  fieldFlowerConfigs?: readonly FieldFlowerConfig[];
  flowerSwingBoosts?: SharedValue<number[]>;
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
