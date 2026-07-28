import { Product } from '@types/product-types'

export type OrderStatus = 'Pending' | 'Completed' | 'Shipped' | 'InTransit'

export interface Order {
  id: string
  slug: string
  item: string
  details: string
  status: OrderStatus
  date: string
  items: Product[]
}
