'use client';

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import type { MenuItem, CartItem } from '@/lib/types';

interface CartContextType {
  items: CartItem[];
  addItem: (menuItem: MenuItem, quantity?: number) => void;
  removeItem: (menuId: number) => void;
  updateQuantity: (menuId: number, quantity: number) => void;
  clearCart: () => void;
  getTotal: () => number;
  getItemCount: () => number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

  const addItem = useCallback((menuItem: MenuItem, quantity: number = 1) => {
    setItems(prev => {
      const existingIndex = prev.findIndex(item => item.menuItem.Menu_ID === menuItem.Menu_ID);
      
      if (existingIndex >= 0) {
        const updated = [...prev];
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: updated[existingIndex].quantity + quantity,
        };
        return updated;
      }
      
      return [...prev, { menuItem, quantity }];
    });
  }, []);

  const removeItem = useCallback((menuId: number) => {
    setItems(prev => prev.filter(item => item.menuItem.Menu_ID !== menuId));
  }, []);

  const updateQuantity = useCallback((menuId: number, quantity: number) => {
    if (quantity <= 0) {
      removeItem(menuId);
      return;
    }

    setItems(prev => prev.map(item => 
      item.menuItem.Menu_ID === menuId 
        ? { ...item, quantity } 
        : item
    ));
  }, [removeItem]);

  const clearCart = useCallback(() => {
    setItems([]);
  }, []);

  const getTotal = useCallback(() => {
    return items.reduce((sum, item) => sum + (item.menuItem.Menu_Price * item.quantity), 0);
  }, [items]);

  const getItemCount = useCallback(() => {
    return items.length;
  }, [items]);

  return (
    <CartContext.Provider value={{
      items,
      addItem,
      removeItem,
      updateQuantity,
      clearCart,
      getTotal,
      getItemCount,
    }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
