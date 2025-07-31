import { create } from "zustand"
import { persist, createJSONStorage } from "zustand/middleware"
import type { Order } from "./types" // Assuming you have a types.ts file for Order

interface OrdersState {
  orders: Order[]
  addOrder: (order: Order) => void
  isHydrated: boolean
  _hasHydrated: () => void
}

export const useOrdersStore = create<OrdersState>()(
  persist(
    (set, get) => ({
      orders: [],
      isHydrated: false,
      addOrder: (order: Order) => set((state) => ({ orders: [order, ...state.orders] })),
      _hasHydrated: () => {
        set({ isHydrated: true })
      },
    }),
    {
      name: "orders-storage",
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state) => {
        state?._hasHydrated()
      },
    },
  ),
)
