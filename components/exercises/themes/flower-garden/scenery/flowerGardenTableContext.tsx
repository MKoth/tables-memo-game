import React, { createContext, useContext, type ReactNode } from 'react';
import type { TableData } from '../../../../../data/tableData';

export type FlowerGardenTableContextValue = {
  table: TableData | null;
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
