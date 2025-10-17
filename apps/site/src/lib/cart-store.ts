"use client"

import { create } from "zustand"
import { persist, createJSONStorage } from "zustand/middleware"

interface CartItem {
  id: number
  name: string
  price: number
  quantity: number
  image: string
  variant?: string
  size?: string
}

interface CartStore {
  items: CartItem[]
  isHydrated: boolean
  setHydrated: () => void
  addItem: (item: Omit<CartItem, "quantity"> & { quantity?: number }) => void
  removeItem: (id: number) => void
  updateQuantity: (id: number, quantity: number) => void
  clearCart: () => void
  getTotalItems: () => number
  getTotalPrice: () => number
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      isHydrated: false,
      setHydrated: () => set({ isHydrated: true }),

      addItem: (item) => {
        console.log("Adding item to cart:", item) // Debug log
        set((state) => {
          const existingItem = state.items.find((i) => i.id === item.id)
          if (existingItem) {
            const updatedItems = state.items.map((i) =>
              i.id === item.id ? { ...i, quantity: i.quantity + (item.quantity || 1) } : i,
            )
            console.log("Updated existing item, new items:", updatedItems) // Debug log
            return { items: updatedItems }
          }
          const newItems = [...state.items, { ...item, quantity: item.quantity || 1 }]
          console.log("Added new item, new items:", newItems) // Debug log
          return { items: newItems }
        })
      },

      removeItem: (id) =>
        set((state) => ({
          items: state.items.filter((item) => item.id !== id),
        })),

      updateQuantity: (id, quantity) =>
        set((state) => ({
          items: state.items.map((item) => (item.id === id ? { ...item, quantity } : item)),
        })),

      clearCart: () => set({ items: [] }),

      getTotalItems: () => {
        const { items } = get()
        return items.reduce((total, item) => total + item.quantity, 0)
      },

      getTotalPrice: () => {
        const { items } = get()
        return items.reduce((total, item) => total + item.price * item.quantity, 0)
      },
    }),
    {
      name: "millwork-cart-storage",
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state) => {
        console.log("Cart rehydrated:", state?.items) // Debug log
        state?.setHydrated()
      },
    },
  ),
)
