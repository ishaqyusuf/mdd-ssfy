"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface OrderItem {
  id: number;
  name: string;
  quantity: number;
  price: number;
  image: string;
  variant?: string;
  size?: string;
}

export interface Order {
  id: string;
  userId: string;
  date: string;
  status: "Processing" | "Shipped" | "In Transit" | "Delivered" | "Cancelled";
  total: number;
  subtotal: number;
  shipping: number;
  tax: number;
  items: OrderItem[];
  shippingAddress: {
    name: string;
    address: string;
    city: string;
    state: string;
    zipCode: string;
    phone: string;
  };
  billingAddress: {
    name: string;
    address: string;
    city: string;
    state: string;
    zipCode: string;
  };
  trackingNumber?: string;
  estimatedDelivery?: string;
  actualDelivery?: string;
  orderHistory: Array<{
    date: string;
    status: string;
    description: string;
  }>;
}

interface OrdersStore {
  orders: Order[];
  createOrder: (orderData: {
    userId: string;
    items: OrderItem[];
    total: number;
    subtotal: number;
    shipping: number;
    tax: number;
    shippingAddress: any;
    billingAddress?: any;
  }) => string;
  getUserOrders: (userId: string) => Order[];
  getOrder: (orderId: string) => Order | undefined;
  updateOrderStatus: (orderId: string, status: Order["status"]) => void;
}

// Mock orders data with different users
const mockOrders: Order[] = [
  {
    id: "ORD-2024-001",
    userId: "1", // John Doe's user ID
    date: "2024-01-15",
    status: "Delivered",
    total: 889.97,
    subtotal: 789.97,
    shipping: 50.0,
    tax: 50.0,
    items: [
      {
        id: 1,
        name: "Craftsman Style Interior Door",
        quantity: 1,
        price: 349.99,
        image: "/placeholder.svg?height=100&width=100&text=Door",
        variant: "Natural Oak",
        size: '30" x 80"',
      },
      {
        id: 2,
        name: "Premium Hardware Set",
        quantity: 2,
        price: 89.99,
        image: "/placeholder.svg?height=100&width=100&text=Hardware",
        variant: "Brass Finish",
      },
      {
        id: 3,
        name: "Modern Barn Door Kit",
        quantity: 1,
        price: 449.99,
        image: "/placeholder.svg?height=100&width=100&text=Barn+Door",
        variant: "Dark Walnut",
        size: '36" x 84"',
      },
    ],
    shippingAddress: {
      name: "John Doe",
      address: "123 Main St",
      city: "Miami",
      state: "FL",
      zipCode: "33186",
      phone: "(555) 123-4567",
    },
    billingAddress: {
      name: "John Doe",
      address: "123 Main St",
      city: "Miami",
      state: "FL",
      zipCode: "33186",
    },
    trackingNumber: "1Z999AA1234567890",
    estimatedDelivery: "2024-01-18",
    actualDelivery: "2024-01-17",
    orderHistory: [
      {
        date: "2024-01-15",
        status: "Order Placed",
        description: "Your order has been received and is being processed.",
      },
      {
        date: "2024-01-16",
        status: "Processing",
        description: "Your order is being prepared for shipment.",
      },
      {
        date: "2024-01-16",
        status: "Shipped",
        description: "Your order has been shipped and is on its way.",
      },
      {
        date: "2024-01-17",
        status: "Delivered",
        description: "Your order has been delivered successfully.",
      },
    ],
  },
  {
    id: "ORD-2024-002",
    userId: "1", // John Doe's user ID
    date: "2024-01-20",
    status: "In Transit",
    total: 349.99,
    subtotal: 299.99,
    shipping: 0.0,
    tax: 50.0,
    items: [
      {
        id: 4,
        name: "Glass Panel Interior Door",
        quantity: 1,
        price: 299.99,
        image: "/placeholder.svg?height=100&width=100&text=Glass+Panel",
        variant: "Clear Glass",
        size: '32" x 80"',
      },
    ],
    shippingAddress: {
      name: "John Doe",
      address: "123 Main St",
      city: "Miami",
      state: "FL",
      zipCode: "33186",
      phone: "(555) 123-4567",
    },
    billingAddress: {
      name: "John Doe",
      address: "123 Main St",
      city: "Miami",
      state: "FL",
      zipCode: "33186",
    },
    trackingNumber: "1Z999AA1234567891",
    estimatedDelivery: "2024-01-25",
    orderHistory: [
      {
        date: "2024-01-20",
        status: "Order Placed",
        description: "Your order has been received and is being processed.",
      },
      {
        date: "2024-01-21",
        status: "Processing",
        description: "Your order is being prepared for shipment.",
      },
      {
        date: "2024-01-22",
        status: "Shipped",
        description: "Your order has been shipped and is on its way.",
      },
    ],
  },
  {
    id: "ORD-2024-003",
    userId: "1", // John Doe's user ID
    date: "2024-01-25",
    status: "Processing",
    total: 179.99,
    subtotal: 159.99,
    shipping: 20.0,
    tax: 0.0,
    items: [
      {
        id: 7,
        name: "Brass Door Handle Set",
        quantity: 2,
        price: 79.99,
        image: "/placeholder.svg?height=100&width=100&text=Brass+Handle",
        variant: "Antique Brass",
      },
    ],
    shippingAddress: {
      name: "John Doe",
      address: "123 Main St",
      city: "Miami",
      state: "FL",
      zipCode: "33186",
      phone: "(555) 123-4567",
    },
    billingAddress: {
      name: "John Doe",
      address: "123 Main St",
      city: "Miami",
      state: "FL",
      zipCode: "33186",
    },
    orderHistory: [
      {
        date: "2024-01-25",
        status: "Order Placed",
        description: "Your order has been received and is being processed.",
      },
    ],
  },
];

export const useOrdersStore = create<OrdersStore>()(
  persist(
    (set, get) => ({
      orders: mockOrders,

      createOrder: (orderData) => {
        const orderId = `ORD-${new Date().getFullYear()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

        const newOrder: Order = {
          id: orderId,
          userId: orderData.userId,
          date: new Date().toISOString(),
          status: "Processing",
          total: orderData.total,
          subtotal: orderData.subtotal,
          shipping: orderData.shipping,
          tax: orderData.tax,
          items: orderData.items,
          shippingAddress: orderData.shippingAddress,
          billingAddress: orderData.billingAddress || orderData.shippingAddress,
          orderHistory: [
            {
              date: new Date().toISOString(),
              status: "Order Placed",
              description:
                "Your order has been received and is being processed.",
            },
          ],
        };

        set((state) => ({
          orders: [newOrder, ...state.orders],
        }));

        // Simulate order processing updates
        setTimeout(() => {
          get().updateOrderStatus(orderId, "Shipped");
        }, 300000); // 5 minutes

        return orderId;
      },

      getUserOrders: (userId: string) => {
        const { orders } = get();
        return orders
          .filter((order) => order.userId === userId)
          .sort(
            (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
          );
      },

      getOrder: (orderId: string) => {
        const { orders } = get();
        return orders.find((order) => order.id === orderId);
      },

      updateOrderStatus: (orderId: string, status: Order["status"]) => {
        set((state) => ({
          orders: state.orders.map((order) =>
            order.id === orderId
              ? {
                  ...order,
                  status,
                  orderHistory: [
                    ...order.orderHistory,
                    {
                      date: new Date().toISOString(),
                      status,
                      description: getStatusDescription(status),
                    },
                  ],
                  ...(status === "Shipped" && !order.trackingNumber
                    ? {
                        trackingNumber: `1Z999AA${Math.random().toString().substr(2, 10)}`,
                        estimatedDelivery: new Date(
                          Date.now() + 5 * 24 * 60 * 60 * 1000
                        ).toISOString(),
                      }
                    : {}),
                  ...(status === "Delivered"
                    ? {
                        actualDelivery: new Date().toISOString(),
                      }
                    : {}),
                }
              : order
          ),
        }));
      },
    }),
    {
      name: "orders-storage",
    }
  )
);

function getStatusDescription(status: Order["status"]): string {
  switch (status) {
    case "Processing":
      return "Your order is being prepared for shipment.";
    case "Shipped":
      return "Your order has been shipped and is on its way.";
    case "In Transit":
      return "Your order is in transit and will arrive soon.";
    case "Delivered":
      return "Your order has been delivered successfully.";
    case "Cancelled":
      return "Your order has been cancelled.";
    default:
      return "Order status updated.";
  }
}
