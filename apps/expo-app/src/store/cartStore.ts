import { PRODUCTS } from '@/data/products-data'
import { CartItemType, CartState } from '@/types/cart-types'
import { create } from 'zustand'

const initialCartItems: CartItemType[] = []

export const useCartStore = create<CartState>((set, get) => ({
  items: initialCartItems,
  addItem: (item: CartItemType) => {
    const existingItem = get().items.find((i) => i.id === item.id)
    if (existingItem) {
      set((state) => ({
        items: state.items.map((i) =>
          i.id === item.id
            ? {
                ...i,
                quantity: Math.min(
                  i.quantity + item.quantity,
                  PRODUCTS.find((p) => p.id === item.id)?.maxQuantity ||
                    i.quantity
                ),
              }
            : i
        ),
      }))
    } else {
      set((state) => ({ items: [...state.items, item] }))
    }
  },
  removeItem: (id: number) =>
    set((state) => ({ items: state.items.filter((item) => item.id !== id) })),
  incrementItem: (id: number) =>
    set((state) => {
      const product = PRODUCTS.find((p) => p.id === id)

      if (!product) return state

      return {
        items: state.items.map((item) =>
          item.id === id && item.quantity < product.maxQuantity
            ? { ...item, quantity: item.quantity + 1 }
            : item
        ),
      }
    }),
  decrementItem: (id: number) =>
    set((state) => ({
      items: state.items.map((item) =>
        item.id === id && item.quantity > 1
          ? { ...item, quantity: item.quantity - 1 }
          : item
      ),
    })),
  getTotalPrice: () => {
    const { items } = get()

    return items
      .reduce((total, item) => total + item.price * item.quantity, 0)
      .toFixed(2)
  },
  getItemCount: () => {
    const { items } = get()

    return items.reduce((total, item) => total + item.quantity, 0)
  },
}))
