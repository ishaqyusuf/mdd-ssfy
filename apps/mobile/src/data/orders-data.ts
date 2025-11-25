import { Order } from '@/types/order-types'

export const ORDERS: Order[] = [
  {
    id: '1',
    item: 'Order 1',
    details: 'Details about order 1',
    status: 'Pending',
    slug: 'order-1',
    date: '2024-07-01',
    items: [
      {
        id: 1,
        title: 'Mon Guerlain Body Milk 200ml',
        slug: 'mon-guerlain-body-milk-200ml',
        imagesUrl: ['url1'],
        price: 53.99,
        heroImage: require('@img/e-shop/body/guerlein-body-milk-1.jpg'),
      },
      {
        id: 2,
        title: 'VT Cosmetics Reedle Shot 300 Booster for Skin Improvement 50ml',
        slug: 'vt-cosmetics-reedle-shot-300-booster-for-skin-improvement-50ml',
        imagesUrl: ['url2'],
        price: 20.99,
        heroImage: require('@img/e-shop/body/vt-cosmetics-1.jpeg'),
      },
    ],
  },
  {
    id: '2',
    item: 'Order 2',
    details: 'Details about order 2',
    status: 'Completed',
    slug: 'order-2',
    date: '2024-07-02',
    items: [
      {
        id: 3,
        title: 'Guerlain Kisskiss Bee Glow Tinted Lip Balm 258 Rose Glow 3.2g',
        slug: 'guerlain-kisskiss-bee-glow-tinted-lip-balm-258-rose-glow-3.2g',
        imagesUrl: ['url3'],
        price: 32.99,
        heroImage: require('@img/e-shop/makeup/guerlain-makeup-1.jpeg'),
      },
      {
        id: 4,
        title: 'Guerlain Gold Skin Diamond Micro-Powder Loose Powder 35 Grams',
        slug: 'guerlain-gold-skin-diamond-micro-powder-loose-powder-35-grams',
        imagesUrl: ['url4'],
        price: 78.99,
        heroImage: require('@img/e-shop/makeup/guerlain-cream-makeup-1.jpeg'),
      },
    ],
  },
  {
    id: '3',
    item: 'Order 3',
    details: 'Details about order 3',
    status: 'Shipped',
    slug: 'order-3',
    date: '2024-07-03',
    items: [
      {
        id: 5,
        title:
          'La Roche-Posay Lipikar Syndet Ultra-Delicate Cleansing Cream For Body 400ml',
        slug: 'la-roche-posay-lipikar-syndet-ultra-delicate-cleansing-cream-for-body-400ml',
        imagesUrl: ['url5'],
        price: 21.8,
        heroImage: require('@img/e-shop/body/roche-posay-1.jpeg'),
      },
      {
        id: 6,
        title:
          'Guerlain Gommage De Beaute Skin Resurfacing Peel Illuminating Face Peel 75ml',
        slug: 'guerlain-gommage-de-beaute-skin-resurfacing-peel-illuminating-face-peel-75ml',
        imagesUrl: ['url6'],
        price: 60.0,
        heroImage: require('@img/e-shop/face/guerlain-1.jpeg'),
      },
    ],
  },
]
