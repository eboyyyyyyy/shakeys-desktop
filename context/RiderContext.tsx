'use client';

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase/firebaseConfig';
import { fetchStaffSession } from '@/lib/firebase/staffProfile';
import type { StaffSession } from '@/lib/staff';

interface RiderContextType {
  rider: StaffSession | null;
  loading: boolean;
  setRider: (rider: StaffSession | null) => void;
  logout: () => Promise<void>;
}

const RiderContext = createContext<RiderContextType | undefined>(undefined);
const STORAGE_KEY = 'rider';

export function RiderProvider({ children }: { children: ReactNode }) {
  const [rider, setRiderState] = useState<StaffSession | null>(null);
  const [loading, setLoading] = useState(true);

  const setRider = useCallback((value: StaffSession | null) => {
    setRiderState(value);
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
        setRiderState(null);
        if (typeof window !== 'undefined') {
          window.localStorage.removeItem(STORAGE_KEY);
        }
        setLoading(false);
        return;
      }

      try {
        const session = await fetchStaffSession(user.uid);
        if (!session || session.role !== 'rider') {
          setRiderState(null);
          setLoading(false);
          return;
        }

        setRiderState(session);
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
        }
      } catch (error) {
        console.error('Failed to restore rider session:', error);
        setRiderState(null);
      } finally {
        setLoading(false);
      }
    });

    return () => unsub();
  }, []);

  const logout = useCallback(async () => {
    await signOut(auth);
    setRider(null);
  }, [setRider]);

  return (
    <RiderContext.Provider value={{ rider, loading, setRider, logout }}>
      {children}
    </RiderContext.Provider>
  );
}

export function useRider() {
  const context = useContext(RiderContext);
  if (!context) {
    throw new Error('useRider must be used within a RiderProvider');
  }
  return context;
}
