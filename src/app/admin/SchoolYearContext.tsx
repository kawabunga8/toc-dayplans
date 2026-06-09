'use client';

import { createContext, useContext, useState } from 'react';

const CURRENT_YEAR = '2026-27';

type SchoolYearContextValue = {
  schoolYear: string;
  setSchoolYear: (y: string) => void;
};

const SchoolYearContext = createContext<SchoolYearContextValue>({
  schoolYear: CURRENT_YEAR,
  setSchoolYear: () => {},
});

export function SchoolYearProvider({ children }: { children: React.ReactNode }) {
  const [schoolYear, setSchoolYear] = useState(CURRENT_YEAR);
  return (
    <SchoolYearContext.Provider value={{ schoolYear, setSchoolYear }}>
      {children}
    </SchoolYearContext.Provider>
  );
}

export function useSchoolYear() {
  return useContext(SchoolYearContext);
}
