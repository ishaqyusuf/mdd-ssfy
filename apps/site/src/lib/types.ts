// Define common types used across the application

export interface Product {
  id: string;
  name: string;
  price: number;
  imageUrl: string;
  images?: string[]; // Optional: for product detail gallery
  rating: number;
  reviews: number;
  description: string;
  slug: string;
  category: string;
  material: string;
  color: string;
  sizes?: string[];
  variants?: ProductVariant[];
  addons?: ProductAddon[];
}

export interface ProductVariant {
  id: string;
  name: string;
  imageUrl?: string;
  priceAdjustment: number; // Price difference from base product price
}

export interface ProductAddon {
  id: string;
  name: string;
  price: number;
}

export interface CartItem {
  id: string; // Unique ID for cart item (e.g., productId-size-variantId)
  productId: string;
  name: string;
  price: number;
  imageUrl: string;
  quantity: number;
  selectedSize?: string;
  selectedVariant?: ProductVariant;
  selectedAddons?: ProductAddon[];
}

export interface Order {
  id: string;
  date: string; // YYYY-MM-DD
  status: "Pending" | "Processing" | "Shipped" | "Delivered" | "Cancelled";
  total: number;
  items: CartItem[];
  shippingAddress: string;
  paymentMethod: string;
}

export interface Review {
  id: string;
  author: string;
  rating: number;
  date: string;
  comment: string;
  avatarUrl?: string;
}

export interface Specification {
  label: string;
  value: string;
}
