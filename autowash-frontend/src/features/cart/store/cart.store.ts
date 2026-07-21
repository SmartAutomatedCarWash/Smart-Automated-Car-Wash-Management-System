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
  durationMinutes?: number;
  description?: string;
  categoryName?: string;
};

type CartState = {
  items: CartItem[];
};

type CartActions = {
  addItem: (item: Omit<CartItem, "id">) => void;
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
        
        // If type is PACKAGE or COMBO, client can only choose 1 primary wash package/combo at a time.
        // Replace existing package/combo if adding new one
        if (itemData.type === "PACKAGE" || itemData.type === "COMBO") {
          const filtered = currentItems.filter(
            (i) => i.type !== "PACKAGE" && i.type !== "COMBO"
          );
          const newItem: CartItem = {
            ...itemData,
            id: `${itemData.type}-${itemData.itemId}`,
          };
          set({ items: [...filtered, newItem] });
          return;
        }

        // For ADDON, prevent duplicates
        const exists = currentItems.some(
          (i) => i.itemId === itemData.itemId && i.type === itemData.type
        );
        if (!exists) {
          const newItem: CartItem = {
            ...itemData,
            id: `${itemData.type}-${itemData.itemId}`,
          };
          set({ items: [...currentItems, newItem] });
        }
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

export function addCartItem(item: Omit<CartItem, "id">) {
  cartStore.getState().addItem(item);
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
