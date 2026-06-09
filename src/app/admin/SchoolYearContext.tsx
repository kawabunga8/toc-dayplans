'use client';

import { createContext, useContext, useState } from 'react';

function currentSchoolYear(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1; // 1-based
  const startYear = month >= 9 ? year : year - 1;
  return `${startYear}-${String(startYear + 1).slice(2)}`;
}

type SchoolYearContextValue = {
  schoolYear: string;
  setSchoolYear: (y: string) => void;
};

const SchoolYearContext = createContext<SchoolYearContextValue>({
  schoolYear: currentSchoolYear(),
  setSchoolYear: () => {},
});

export function SchoolYearProvider({ children }: { children: React.ReactNode }) {
  const [schoolYear, setSchoolYear] = useState(currentSchoolYear);
  return (
    <SchoolYearContext.Provider value={{ schoolYear, setSchoolYear }}>
      {children}
    </SchoolYearContext.Provider>
  );
}

export function useSchoolYear() {
  return useContext(SchoolYearContext);
}
