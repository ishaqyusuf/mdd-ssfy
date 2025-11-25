export interface CartItemType {
  id: number
  title: string
  price: number
  quantity: number
  image: any
}

export interface CartState {
  items: CartItemType[]
  addItem: (item: CartItemType) => void
  removeItem: (id: number) => void
  incrementItem: (id: number) => void
  decrementItem: (id: number) => void
  getTotalPrice: () => string
  getItemCount: () => number
}
