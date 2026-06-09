'use client';

import { createContext, useContext, useState, ReactNode } from 'react';

interface Branch {
  Brnch_ID: string | number;
  Brnch_Name: string;
  Brnch_Address: string;
  Brnch_City: string;
  Brnch_PhoneNumber: string;
  Brnch_Status: string;
}

interface BranchContextType {
  selectedBranch: Branch | null;
  setSelectedBranch: (branch: Branch | null) => void;
}

const BranchContext = createContext<BranchContextType | undefined>(undefined);

export function BranchProvider({ children }: { children: ReactNode }) {
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);

  return (
    <BranchContext.Provider value={{ selectedBranch, setSelectedBranch }}>
      {children}
    </BranchContext.Provider>
  );
}

export function useBranch() {
  const context = useContext(BranchContext);
  if (!context) {
    throw new Error('useBranch must be used within a BranchProvider');
  }
  return context;
}
