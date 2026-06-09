'use client';

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase/firebaseConfig';
import { fetchStaffSession } from '@/lib/firebase/staffProfile';
import type { StaffSession } from '@/lib/staff';

interface EmployeeContextType {
  employee: StaffSession | null;
  loading: boolean;
  setEmployee: (employee: StaffSession | null) => void;
  logout: () => Promise<void>;
}

const EmployeeContext = createContext<EmployeeContextType | undefined>(undefined);
const STORAGE_KEY = 'employee';

export function EmployeeProvider({ children }: { children: ReactNode }) {
  const [employee, setEmployeeState] = useState<StaffSession | null>(null);
  const [loading, setLoading] = useState(true);

  const setEmployee = useCallback((value: StaffSession | null) => {
    setEmployeeState(value);
    if (typeof window === 'undefined') return;
    if (value) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
    } else {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setEmployeeState(null);
        if (typeof window !== 'undefined') {
          window.localStorage.removeItem(STORAGE_KEY);
        }
        setLoading(false);
        return;
      }

      try {
        const session = await fetchStaffSession(user.uid);
        if (!session || session.role !== 'employee') {
          setEmployeeState(null);
          setLoading(false);
          return;
        }

        setEmployeeState(session);
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
        }
      } catch (error) {
        console.error('Failed to restore employee session:', error);
        setEmployeeState(null);
      } finally {
        setLoading(false);
      }
    });

    return () => unsub();
  }, []);

  const logout = useCallback(async () => {
    await signOut(auth);
    setEmployee(null);
  }, [setEmployee]);

  return (
    <EmployeeContext.Provider value={{ employee, loading, setEmployee, logout }}>
      {children}
    </EmployeeContext.Provider>
  );
}

export function useEmployee() {
  const context = useContext(EmployeeContext);
  if (!context) {
    throw new Error('useEmployee must be used within an EmployeeProvider');
  }
  return context;
}
