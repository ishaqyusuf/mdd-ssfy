import { Product } from '@/types/product-types'

export const PRODUCTS: Product[] = [
  {
    id: 1,
    title: 'Mon Guerlain Body Milk 200ml',
    slug: 'mon-guerlain-body-milk-200ml',
    heroImage: require('@img/e-shop/body/gurlein-body-milk-1.jpg'),
    imagesUrl: [
      require('@img/e-shop/body/gurlein-body-milk-1.jpg'),
      require('@img/e-shop/body/gurlein-body-milk-2.jpeg'),
    ],
    price: 53.99,
    category: {
      imageUrl: require('@img/e-shop/body/gurlein-body-milk-1.jpg'),
      name: 'Body',
      slug: 'body',
    },
    maxQuantity: 5,
  },
  {
    id: 5,
    title:
      'La Roche-Posay Lipikar Syndet Ultra-Delicate Cleansing Cream For Body 400ml',
    slug: 'la-roche-posay-lipikar-syndet-ultra-delicate-cleansing-cream-for-body-400ml',
    heroImage: require('@img/e-shop/body/roche-posay-1.jpeg'),
    imagesUrl: [
      require('@img/e-shop/body/roche-posay-1.jpeg'),
      require('@img/e-shop/body/roche-posay-2.jpeg'),
    ],
    price: 21.8,
    category: {
      imageUrl: require('@img/e-shop/body/roche-posay-1.jpeg'),
      name: 'Body',
      slug: 'body',
    },
    maxQuantity: 7,
  },
  {
    id: 2,
    title: 'VT Cosmetics Reedle Shot 300 Booster for Skin Improvement 50ml',
    slug: 'vt-cosmetics-reedle-shot-300-booster-for-skin-improvement-50ml',
    heroImage: require('@img/e-shop/face/vt-cosmetics-1.jpeg'),
    imagesUrl: [
      require('@img/e-shop/face/vt-cosmetics-1.jpeg'),
      require('@img/e-shop/face/vt-cosmetics-2.jpeg'),
      require('@img/e-shop/face/vt-cosmetics-3.jpeg'),
      require('@img/e-shop/face/vt-cosmetics-4.jpeg'),
    ],
    price: 20.99,
    category: {
      imageUrl: require('@img/e-shop/face/vt-cosmetics-1.jpeg'),
      name: 'Face',
      slug: 'face',
    },
    maxQuantity: 5,
  },
  {
    id: 6,
    title:
      'Guerlain Gommage De Beaute Skin Resurfacing Peel Illuminating Face Peel 75ml',
    slug: 'guerlain-gommage-de-beaute-skin-resurfacing-peel-illuminating-face-peel-75ml',
    heroImage: require('@img/e-shop/face/guerlain-1.jpeg'),
    imagesUrl: [
      require('@img/e-shop/face/guerlain-1.jpeg'),
      require('@img/e-shop/face/guerlain-2.jpeg'),
      require('@img/e-shop/face/guerlain-3.jpeg'),
    ],
    price: 60.0,
    category: {
      imageUrl: require('@img/e-shop/face/guerlain-1.jpeg'),
      name: 'Face',
      slug: 'face',
    },
    maxQuantity: 12,
  },
  {
    id: 3,
    title: 'Guerlain Kisskiss Bee Glow Tinted Lip Balm 258 Rose Glow 3.2g',
    slug: 'guerlain-kisskiss-bee-glow-tinted-lip-balm-258-rose-glow-3.2g',
    heroImage: require('@img/e-shop/makeup/guerlain-makeup-1.jpeg'),
    imagesUrl: [
      require('@img/e-shop/makeup/guerlain-makeup-1.jpeg'),
      require('@img/e-shop/makeup/guerlain-makeup-2.jpeg'),
    ],
    price: 32.99,
    category: {
      imageUrl: require('@img/e-shop/makeup/guerlain-makeup-1.jpeg'),
      name: 'Makeup',
      slug: 'makeup',
    },
    maxQuantity: 9,
  },
  {
    id: 4,
    title: 'Guerlain Gold Skin Diamond Micro-Powder Loose Powder 35 Grams',
    slug: 'guerlain-gold-skin-diamond-micro-powder-loose-powder-35-grams',
    heroImage: require('@img/e-shop/makeup/guerlain-cream-makeup-1.jpeg'),
    imagesUrl: [
      require('@img/e-shop/makeup/guerlain-cream-makeup-1.jpeg'),
      require('@img/e-shop/makeup/guerlain-cream-makeup-2.jpeg'),
    ],
    price: 78.99,
    category: {
      imageUrl: require('@img/e-shop/makeup/guerlain-cream-makeup-1.jpeg'),
      name: 'Makeup',
      slug: 'makeup',
    },
    maxQuantity: 3,
  },
  {
    id: 7,
    title: 'Olaplex No.7 Bonding Oil 30ml',
    slug: 'olaplex-no-7-bonding-oil-30ml',
    heroImage: require('@img/e-shop/hair/olaplex-1.jpeg'),
    imagesUrl: [
      require('@img/e-shop/hair/olaplex-1.jpeg'),
      require('@img/e-shop/hair/olaplex-2.jpeg'),
    ],
    price: 22.99,
    category: {
      imageUrl: require('@img/e-shop/hair/olaplex-1.jpeg'),
      name: 'Hair',
      slug: 'hair',
    },
    maxQuantity: 3,
  },
  {
    id: 8,
    title:
      'MADARA Grow Volume Shampoo Organic Skincare Natural Hair Growth Shampoo 250ml',
    slug: 'madara-grow-volume-shampoo-organic-skincare-natural-hair-growth-shampoo-250ml',
    heroImage: require('@img/e-shop/hair/madara-1.jpeg'),
    imagesUrl: [
      require('@img/e-shop/hair/madara-1.jpeg'),
      require('@img/e-shop/hair/madara-2.jpeg'),
    ],
    price: 22.99,
    category: {
      imageUrl: require('@img/e-shop/hair/madara-1.jpeg'),
      name: 'Hair',
      slug: 'hair',
    },
    maxQuantity: 7,
  },
]
