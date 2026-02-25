'use client';

import { createContext, useContext } from 'react';

export type DemoContextValue = {
  isDemo: boolean;
  role: string | null;
};

const DemoContext = createContext<DemoContextValue>({ isDemo: false, role: null });

export function DemoProvider(props: { value: DemoContextValue; children: React.ReactNode }) {
  return <DemoContext.Provider value={props.value}>{props.children}</DemoContext.Provider>;
}

export function useDemo() {
  return useContext(DemoContext);
}
