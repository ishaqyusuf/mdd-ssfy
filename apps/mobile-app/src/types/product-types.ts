import { Category } from '@/types/category-types'
import { ImageSourcePropType } from 'react-native'

export interface Product {
  id: number
  title: string
  slug: string
  imagesUrl: ImageSourcePropType[]
  price: number
  heroImage: ImageSourcePropType
  category: Omit<Category, 'products'>
  maxQuantity: number
}
