import { Category } from '@/types/category-types'
import { PRODUCTS } from '@data/products-data'

export const CATEGORIES: Category[] = [
  {
    name: 'Face',
    slug: 'face',
    imageUrl:
      'https://www.skincenterofsouthmiami.com/wp-content/uploads/2018/06/Skin-Center-of-South-Miami-Facials-and-Skin-Care.jpg',
    products: PRODUCTS.filter((product) => product.category.slug === 'face'),
  },
  {
    name: 'Body',
    slug: 'body',
    imageUrl:
      'https://imageio.forbes.com/specials-images/imageserve/610311fdec0ac07c9a1e6208/Kosasport-Good-Body-Skin/0x0.jpg?width=960&dpr=1',
    products: PRODUCTS.filter((product) => product.category.slug === 'body'),
  },
  {
    name: 'Health',
    slug: 'health',
    imageUrl: 'https://www.researchdive.com/blogImages/nNir91lJiX.jpeg',
    products: PRODUCTS.filter((product) => product.category.slug === 'health'),
  },
  {
    name: 'Makeup',
    slug: 'makeup',
    imageUrl:
      'https://hips.hearstapps.com/hmg-prod/images/1-launchmetrics-lanvin-ham-s22-012-65e0f50285e40.jpg?crop=1.00xw:0.752xh;0,0.00962xh&resize=1800:*',
    products: PRODUCTS.filter((product) => product.category.slug === 'makeup'),
  },
  {
    name: 'Hair',
    slug: 'hair',
    imageUrl:
      'https://www.med7online.com/cdn/shop/articles/577149-6178196.jpg?v=1754042871&width=1200',
    products: PRODUCTS.filter((product) => product.category.slug === 'hair'),
  },
  {
    name: 'Lifestyle',
    slug: 'lifestyle',
    imageUrl: 'https://www.psfc.in/wp-content/uploads/2023/04/1111_n.png',
    products: PRODUCTS.filter(
      (product) => product.category.slug === 'lifestyle'
    ),
  },
  {
    name: 'Fragrance',
    slug: 'fragrance',
    imageUrl:
      'https://cdn.shopify.com/s/files/1/0785/0406/7368/files/Types_of_Fragrances_480x480.jpg?v=1718008686',
    products: PRODUCTS.filter(
      (product) => product.category.slug === 'fragrance'
    ),
  },
]
