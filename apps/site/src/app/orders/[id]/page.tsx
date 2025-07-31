"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Button } from "@gnd/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@gnd/ui/card";
import { Badge } from "@gnd/ui/badge";
import {
  CheckCircle,
  Package,
  Truck,
  MapPin,
  Download,
  ArrowLeft,
  ShoppingCart,
} from "lucide-react";
import { useAuthStore } from "@/lib/auth-store";
import { useOrdersStore, type Order } from "@/lib/orders-store";
import { useCartStore } from "@/lib/cart-store";

interface OrderDetailsPageProps {
  params: { id: string };
}

export default function OrderDetailsPage({ params }: OrderDetailsPageProps) {
  const { id } = params;
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isAuthenticated } = useAuthStore();
  const { getOrder } = useOrdersStore();
  const { getTotalItems, addItem } = useCartStore();
  const [mounted, setMounted] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [order, setOrder] = useState<Order | undefined>(undefined);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && !isAuthenticated) {
      router.push("/login");
    }
  }, [mounted, isAuthenticated, router]);

  useEffect(() => {
    if (mounted && user) {
      const foundOrder = getOrder(id);
      if (foundOrder && foundOrder.userId === user.id) {
        setOrder(foundOrder);
      } else if (foundOrder && foundOrder.userId !== user.id) {
        // Order exists but doesn't belong to current user
        router.push("/orders");
      } else {
        // Order not found
        router.push("/orders");
      }
    }
  }, [mounted, user, id, getOrder, router]);

  useEffect(() => {
    if (searchParams.get("success") === "true") {
      setShowSuccess(true);
      // Remove success param from URL after showing message
      const timer = setTimeout(() => setShowSuccess(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [searchParams]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Delivered":
        return "bg-green-100 text-green-800";
      case "Shipped":
      case "In Transit":
        return "bg-blue-100 text-blue-800";
      case "Processing":
        return "bg-yellow-100 text-yellow-800";
      case "Order Placed":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const handleReorder = () => {
    if (!order) return;

    // Add all items from the order back to cart
    order.items.forEach((item) => {
      addItem({
        id: item.id,
        name: item.name,
        price: item.price,
        image: item.image,
        variant: item.variant,
        size: item.size,
        quantity: item.quantity,
      });
    });
    router.push("/cart");
  };

  if (!mounted || !isAuthenticated || !user) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="text-center py-16">
            <div className="animate-pulse">Loading order details...</div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-background">
        <Header cartItems={getTotalItems()} />
        <main className="container mx-auto px-4 py-8">
          <div className="text-center py-16">
            <Package className="h-24 w-24 mx-auto text-gray-400 mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-4">
              Order Not Found
            </h1>
            <p className="text-gray-600 mb-8">
              The order you're looking for doesn't exist or you don't have
              access to it.
            </p>
            <Link href="/orders">
              <Button className="bg-amber-700 hover:bg-amber-800">
                Back to Orders
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
      <Header cartItems={getTotalItems()} />
      <main className="container mx-auto px-4 py-8">
        {/* Success Message */}
        {showSuccess && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center">
              <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
              <div>
                <h3 className="text-green-800 font-semibold">
                  Order Placed Successfully!
                </h3>
                <p className="text-green-700 text-sm">
                  Thank you for your purchase. Your order confirmation has been
                  sent to your email.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Breadcrumb */}
        <div className="flex items-center space-x-2 text-sm text-gray-600 mb-6">
          <Link href="/" className="hover:text-gray-900">
            Home
          </Link>
          <span>/</span>
          <Link href="/orders" className="hover:text-gray-900">
            Orders
          </Link>
          <span>/</span>
          <span className="text-gray-900">{order.id}</span>
        </div>

        <div className="flex items-center mb-6">
          <Link href="/orders">
            <Button variant="ghost">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Orders
            </Button>
          </Link>
        </div>

        {/* Order Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Order {order.id}
            </h1>
            <p className="text-gray-600">
              Placed on {new Date(order.date).toLocaleDateString()} by{" "}
              {user.firstName} {user.lastName}
            </p>
          </div>
          <div className="text-right">
            <Badge className={getStatusColor(order.status)} size="lg">
              {order.status}
            </Badge>
            <p className="text-2xl font-bold mt-2">${order.total.toFixed(2)}</p>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Order Items and Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Order Items */}
            <Card>
              <CardHeader>
                <CardTitle>Order Items</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {order.items.map((item, index) => (
                    <div
                      key={index}
                      className="flex items-center space-x-4 py-4 border-b last:border-b-0"
                    >
                      <img
                        src={item.image || "/placeholder.svg"}
                        alt={item.name}
                        className="w-16 h-16 object-cover rounded-md"
                      />
                      <div className="flex-1">
                        <h3 className="font-semibold">{item.name}</h3>
                        {item.variant && (
                          <p className="text-sm text-gray-600">
                            Finish: {item.variant}
                          </p>
                        )}
                        {item.size && (
                          <p className="text-sm text-gray-600">
                            Size: {item.size}
                          </p>
                        )}
                        <p className="text-sm text-gray-600">
                          Quantity: {item.quantity}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">
                          ${(item.price * item.quantity).toFixed(2)}
                        </p>
                        <p className="text-sm text-gray-600">
                          ${item.price.toFixed(2)} each
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Order Timeline */}
            <Card>
              <CardHeader>
                <CardTitle>Order Timeline</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {order.orderHistory.map((event, index) => (
                    <div key={index} className="flex items-start space-x-4">
                      <div className="flex-shrink-0 w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center">
                        {event.status === "Delivered" ? (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        ) : event.status === "Shipped" ? (
                          <Truck className="h-4 w-4 text-blue-600" />
                        ) : (
                          <Package className="h-4 w-4 text-amber-600" />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <h4 className="font-semibold">{event.status}</h4>
                          <span className="text-sm text-gray-600">
                            {new Date(event.date).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">
                          {event.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Order Summary and Details */}
          <div className="space-y-6">
            {/* Order Summary */}
            <Card>
              <CardHeader>
                <CardTitle>Order Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span>${order.subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Shipping</span>
                    <span>
                      {order.shipping === 0
                        ? "Free"
                        : `$${order.shipping.toFixed(2)}`}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Tax</span>
                    <span>${order.tax.toFixed(2)}</span>
                  </div>
                  <div className="border-t pt-2 mt-2">
                    <div className="flex justify-between font-bold text-lg">
                      <span>Total</span>
                      <span>${order.total.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Shipping Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <MapPin className="h-5 w-5 mr-2" />
                  Shipping Address
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm">
                  <p className="font-semibold">{order.shippingAddress.name}</p>
                  <p>{order.shippingAddress.address}</p>
                  <p>
                    {order.shippingAddress.city}, {order.shippingAddress.state}{" "}
                    {order.shippingAddress.zipCode}
                  </p>
                  <p className="mt-2">{order.shippingAddress.phone}</p>
                </div>
              </CardContent>
            </Card>

            {/* Tracking Information */}
            {order.trackingNumber && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Truck className="h-5 w-5 mr-2" />
                    Tracking Information
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-sm space-y-2">
                    <div>
                      <span className="font-semibold">Tracking Number:</span>
                      <p className="font-mono text-blue-600">
                        {order.trackingNumber}
                      </p>
                    </div>
                    {order.actualDelivery ? (
                      <div>
                        <span className="font-semibold">Delivered:</span>
                        <p>
                          {new Date(order.actualDelivery).toLocaleDateString()}
                        </p>
                      </div>
                    ) : order.estimatedDelivery ? (
                      <div>
                        <span className="font-semibold">
                          Estimated Delivery:
                        </span>
                        <p>
                          {new Date(
                            order.estimatedDelivery
                          ).toLocaleDateString()}
                        </p>
                      </div>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Actions */}
            <div className="space-y-3">
              <Button variant="outline" className="w-full bg-transparent">
                <Download className="h-4 w-4 mr-2" />
                Download Invoice
              </Button>
              {order.trackingNumber && (
                <Button variant="outline" className="w-full bg-transparent">
                  Track Package
                </Button>
              )}
              <Button
                onClick={handleReorder}
                className="w-full bg-amber-700 hover:bg-amber-800"
              >
                <ShoppingCart className="h-4 w-4 mr-2" />
                Reorder Items
              </Button>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
