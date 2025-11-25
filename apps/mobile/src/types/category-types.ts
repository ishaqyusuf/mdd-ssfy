import { Product } from '@/types/product-types'

export interface Category {
  name: string
  imageUrl: string
  slug: string
  products: Product[]
}
