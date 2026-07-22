"use client";

import { createStore } from "zustand/vanilla";
import { useStore } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export type CartItemType = "PACKAGE" | "ADDON" | "COMBO";

export type CartItem = {
  id: string; // unique ID for keying in cart
  type: CartItemType;
  itemId: string; // packageId, addonId, or comboId
  name: string;
  price: number;
  quantity: number;
  durationMinutes?: number;
  description?: string;
  categoryName?: string;
};

type CartState = {
  items: CartItem[];
};

type CartActions = {
  addItem: (item: Omit<CartItem, "id" | "quantity"> & { quantity?: number }) => void;
  updateQuantity: (id: string, delta: number) => void;
  removeItem: (id: string) => void;
  removeByItemId: (itemId: string, type: CartItemType) => void;
  clearCart: () => void;
  hasItem: (itemId: string, type: CartItemType) => boolean;
};

type CartStore = CartState & CartActions;

const cartStore = createStore<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      addItem: (itemData) => {
        const currentItems = get().items;
        const targetId = `${itemData.type}-${itemData.itemId}`;
        const existingIndex = currentItems.findIndex((i) => i.id === targetId);

        const addQty = itemData.quantity && itemData.quantity > 0 ? itemData.quantity : 1;

        if (existingIndex > -1) {
          const updatedItems = [...currentItems];
          updatedItems[existingIndex] = {
            ...updatedItems[existingIndex],
            quantity: updatedItems[existingIndex].quantity + addQty,
          };
          set({ items: updatedItems });
        } else {
          const newItem: CartItem = {
            ...itemData,
            id: targetId,
            quantity: addQty,
          };
          set({ items: [...currentItems, newItem] });
        }
      },
      updateQuantity: (id, delta) => {
        const currentItems = get().items;
        const updatedItems = currentItems
          .map((item) => {
            if (item.id === id) {
              const newQty = item.quantity + delta;
              return newQty > 0 ? { ...item, quantity: newQty } : null;
            }
            return item;
          })
          .filter((item): item is CartItem => item !== null);

        set({ items: updatedItems });
      },
      removeItem: (id) =>
        set((state) => ({
          items: state.items.filter((item) => item.id !== id),
        })),
      removeByItemId: (itemId, type) =>
        set((state) => ({
          items: state.items.filter(
            (item) => !(item.itemId === itemId && item.type === type)
          ),
        })),
      clearCart: () => set({ items: [] }),
      hasItem: (itemId, type) =>
        get().items.some((item) => item.itemId === itemId && item.type === type),
    }),
    {
      name: "autowash-customer-cart",
      storage: createJSONStorage(() => localStorage),
    }
  )
);

export function useCartStore<T>(selector: (state: CartStore) => T) {
  return useStore(cartStore, selector);
}

export function addCartItem(item: Omit<CartItem, "id" | "quantity"> & { quantity?: number }) {
  cartStore.getState().addItem(item);
}

export function updateCartItemQuantity(id: string, delta: number) {
  cartStore.getState().updateQuantity(id, delta);
}

export function removeCartItem(id: string) {
  cartStore.getState().removeItem(id);
}

export function removeCartItemByItemId(itemId: string, type: CartItemType) {
  cartStore.getState().removeByItemId(itemId, type);
}

export function clearCustomerCart() {
  cartStore.getState().clearCart();
}

export function isItemInCart(itemId: string, type: CartItemType) {
  return cartStore.getState().hasItem(itemId, type);
}
