'use client';

import { create } from 'zustand';
import { CartItem, CartState } from '@/types';

interface CartStore extends CartState {
  addItem: (item: CartItem) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  setItems: (items: CartItem[]) => void;
}

export const useCartStore = create<CartStore>((set: any) => ({
  items: [],
  total: 0,
  itemCount: 0,

  addItem: (item: CartItem) =>
    set((state: CartState) => {
      const existingItem = state.items.find((i: CartItem) => i.productId === item.productId);

      let newItems: CartItem[];
      if (existingItem) {
        newItems = state.items.map((i: CartItem) =>
          i.productId === item.productId ? { ...i, quantity: i.quantity + item.quantity } : i
        );
      } else {
        newItems = [...state.items, item];
      }

      const newTotal = newItems.reduce((sum: number, i: CartItem) => sum + i.price * i.quantity, 0);
      const newItemCount = newItems.reduce((sum: number, i: CartItem) => sum + i.quantity, 0);

      return {
        items: newItems,
        total: newTotal,
        itemCount: newItemCount,
      };
    }),

  removeItem: (productId: string) =>
    set((state: CartState) => {
      const newItems = state.items.filter((i: CartItem) => i.productId !== productId);
      const newTotal = newItems.reduce((sum: number, i: CartItem) => sum + i.price * i.quantity, 0);
      const newItemCount = newItems.reduce((sum: number, i: CartItem) => sum + i.quantity, 0);

      return {
        items: newItems,
        total: newTotal,
        itemCount: newItemCount,
      };
    }),

  updateQuantity: (productId: string, quantity: number) =>
    set((state: CartState) => {
      const newItems = state.items
        .map((i: CartItem) => (i.productId === productId ? { ...i, quantity } : i))
        .filter((i: CartItem) => i.quantity > 0);

      const newTotal = newItems.reduce((sum: number, i: CartItem) => sum + i.price * i.quantity, 0);
      const newItemCount = newItems.reduce((sum: number, i: CartItem) => sum + i.quantity, 0);

      return {
        items: newItems,
        total: newTotal,
        itemCount: newItemCount,
      };
    }),

  clearCart: () =>
    set({
      items: [],
      total: 0,
      itemCount: 0,
    }),

  setItems: (items: CartItem[]) =>
    set({
      items,
      total: items.reduce((sum: number, i: CartItem) => sum + i.price * i.quantity, 0),
      itemCount: items.reduce((sum: number, i: CartItem) => sum + i.quantity, 0),
    }),
}));
