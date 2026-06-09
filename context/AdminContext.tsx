'use client';

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase/firebaseConfig';
import { fetchStaffSession } from '@/lib/firebase/staffProfile';
import type { StaffSession } from '@/lib/staff';

interface AdminContextType {
  admin: StaffSession | null;
  loading: boolean;
  setAdmin: (admin: StaffSession | null) => void;
  logout: () => Promise<void>;
}

const AdminContext = createContext<AdminContextType | undefined>(undefined);
const STORAGE_KEY = 'admin';

export function AdminProvider({ children }: { children: ReactNode }) {
  const [admin, setAdminState] = useState<StaffSession | null>(null);
  const [loading, setLoading] = useState(true);

  const setAdmin = useCallback((value: StaffSession | null) => {
    setAdminState(value);
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
        setAdminState(null);
        if (typeof window !== 'undefined') {
          window.localStorage.removeItem(STORAGE_KEY);
        }
        setLoading(false);
        return;
      }

      try {
        const session = await fetchStaffSession(user.uid);
        if (!session || !['general_admin', 'branch_admin'].includes(session.role)) {
          setAdminState(null);
          setLoading(false);
          return;
        }

        setAdminState(session);
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
        }
      } catch (error) {
        console.error('Failed to restore admin session:', error);
        setAdminState(null);
      } finally {
        setLoading(false);
      }
    });

    return () => unsub();
  }, []);

  const logout = useCallback(async () => {
    await signOut(auth);
    setAdmin(null);
  }, [setAdmin]);

  return (
    <AdminContext.Provider value={{ admin, loading, setAdmin, logout }}>
      {children}
    </AdminContext.Provider>
  );
}

export function useAdmin() {
  const context = useContext(AdminContext);
  if (!context) throw new Error('useAdmin must be used within an AdminProvider');
  return context;
}
