'use client';

import { createContext, useContext, useState } from 'react';
import { schoolYearForDate } from '@/lib/appRules/dates';

type SchoolYearContextValue = {
  schoolYear: string;
  setSchoolYear: (y: string) => void;
};

const SchoolYearContext = createContext<SchoolYearContextValue>({
  schoolYear: schoolYearForDate(),
  setSchoolYear: () => {},
});

export function SchoolYearProvider({ children }: { children: React.ReactNode }) {
  const [schoolYear, setSchoolYear] = useState(() => schoolYearForDate());
  return (
    <SchoolYearContext.Provider value={{ schoolYear, setSchoolYear }}>
      {children}
    </SchoolYearContext.Provider>
  );
}

export function useSchoolYear() {
  return useContext(SchoolYearContext);
}
