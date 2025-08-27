"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Footer } from "@/components/footer";
import { CartItem } from "@/components/cart-item";
import { OrderSummary } from "@/components/order-summary";
import { Button } from "@gnd/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@gnd/ui/card";
import { ShoppingBag, ArrowLeft } from "lucide-react";
import { useCartStore } from "@/lib/cart-store";
import { useTRPC } from "@/trpc/client";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useGuestId } from "@/hooks/use-guest-id";

export default function CartPage() {
  const { items, updateQuantity, removeItem, getTotalItems, getTotalPrice } =
    useCartStore();
  const [mounted, setMounted] = useState(false);
  const trpc = useTRPC();
  const auth = useAuth();
  const { guestId } = useGuestId();
  const { data, isPending } = useQuery(
    trpc.storefront.getCartList.queryOptions({
      guestId,
    })
  );

  if (isPending) {
    return (
      <div className="min-h-screen bg-background">
        <main className="container mx-auto px-4 py-8">
          <div className="text-center py-16">
            <div className="animate-pulse">Loading cart...</div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const subtotal = getTotalPrice();
  const shipping = subtotal > 500 ? 0 : 50; // Free shipping over $500
  const tax = subtotal * 0.08; // 8% tax
  const total = subtotal + shipping + tax;

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <main className="container mx-auto px-4 py-8">
          <div className="text-center py-16">
            <ShoppingBag className="h-24 w-24 mx-auto text-gray-400 mb-4" />
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              Your Cart is Empty
            </h1>
            <p className="text-gray-600 mb-8">
              Looks like you haven't added any items to your cart yet.
            </p>
            <Link href="/search">
              <Button className="bg-amber-700 hover:bg-amber-800">
                Continue Shopping
              </Button>
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <div className="flex items-center space-x-2 text-sm text-gray-600 mb-6">
          <Link href="/" className="hover:text-gray-900">
            Home
          </Link>
          <span>/</span>
          <span className="text-gray-900">Shopping Cart</span>
        </div>

        <div className="flex items-center mb-6">
          <Link href="/search">
            <Button variant="ghost">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Continue Shopping
            </Button>
          </Link>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <ShoppingBag className="h-5 w-5 mr-2" />
                  Shopping Cart ({items.length} items)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {items.map((item) => (
                    <CartItem
                      key={item.id}
                      {...item}
                      onQuantityChange={updateQuantity}
                      onRemove={removeItem}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Order Summary */}
          <div className="space-y-6">
            <OrderSummary
              subtotal={subtotal}
              shipping={shipping}
              tax={tax}
              total={total}
            />

            <Link href="/checkout">
              <Button className="w-full bg-amber-700 hover:bg-amber-800 text-lg py-3">
                Proceed to Checkout
              </Button>
            </Link>

            <div className="text-center text-sm text-gray-600">
              <p>Free shipping on orders over $500</p>
              <p>Secure checkout with SSL encryption</p>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
