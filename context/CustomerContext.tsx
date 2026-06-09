'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase/firebaseConfig';
import { fetchCustomerSession } from '@/lib/firebase/customerProfile';
import type { CustomerSession } from '@/lib/customer';

const CUSTOMER_STORAGE_KEY = 'shakeys.customer';

interface CustomerContextType {
  customer: CustomerSession | null;
  setCustomer: (customer: CustomerSession | null) => void;
  isLoggedIn: boolean;
  logout: () => Promise<void>;
}

const CustomerContext = createContext<CustomerContextType | undefined>(undefined);

export function CustomerProvider({ children }: { children: ReactNode }) {
  const [customer, setCustomerState] = useState<CustomerSession | null>(null);

  const setCustomer = useCallback((data: CustomerSession | null) => {
    setCustomerState(data);

    if (typeof window === 'undefined') {
      return;
    }

    if (data) {
      window.localStorage.setItem(CUSTOMER_STORAGE_KEY, JSON.stringify(data));
    } else {
      window.localStorage.removeItem(CUSTOMER_STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    const restoreStoredGuest = () => {
      if (typeof window === 'undefined') {
        return null;
      }

      const stored = window.localStorage.getItem(CUSTOMER_STORAGE_KEY);
      if (!stored) {
        return null;
      }

      try {
        const parsed = JSON.parse(stored) as CustomerSession;
        return parsed.isGuest ? parsed : null;
      } catch {
        window.localStorage.removeItem(CUSTOMER_STORAGE_KEY);
        return null;
      }
    };

    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setCustomerState(restoreStoredGuest());
        return;
      }

      try {
        const profile = await fetchCustomerSession(user.uid);
        if (!profile) {
          setCustomerState(null);
          if (typeof window !== 'undefined') {
            window.localStorage.removeItem(CUSTOMER_STORAGE_KEY);
          }
          return;
        }

        setCustomerState(profile);
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(CUSTOMER_STORAGE_KEY, JSON.stringify(profile));
        }
      } catch (error) {
        console.error('Failed to restore customer session:', error);
        setCustomerState(null);
      }
    });

    return () => unsub();
  }, []);

  const logout = useCallback(async () => {
    if (!customer?.isGuest) {
      await signOut(auth);
    }

    setCustomerState(null);
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(CUSTOMER_STORAGE_KEY);
    }
  }, [customer?.isGuest]);

  return (
    <CustomerContext.Provider value={{
      customer,
      setCustomer,
      isLoggedIn: customer !== null,
      logout,
    }}>
      {children}
    </CustomerContext.Provider>
  );
}

export function useCustomer() {
  const context = useContext(CustomerContext);
  if (!context) {
    throw new Error('useCustomer must be used within a CustomerProvider');
  }
  return context;
}
