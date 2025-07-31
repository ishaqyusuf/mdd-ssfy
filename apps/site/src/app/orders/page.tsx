"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Button } from "@gnd/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@gnd/ui/card";
import { Badge } from "@gnd/ui/badge";
import { Input } from "@gnd/ui/input";
import { Label } from "@gnd/ui/label";
import { Package, Search, Eye, Download, ShoppingBag } from "lucide-react";
import { useAuthStore } from "@/lib/auth-store";
import { useOrdersStore } from "@/lib/orders-store";
import { useCartStore } from "@/lib/cart-store";

export default function OrdersPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const { getUserOrders } = useOrdersStore();
  const { getTotalItems, addItem } = useCartStore();
  const [mounted, setMounted] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && !isAuthenticated) {
      router.push("/login");
    }
  }, [mounted, isAuthenticated, router]);

  if (!mounted || !isAuthenticated || !user) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="text-center py-16">
            <div className="animate-pulse">Loading orders...</div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const userOrders = getUserOrders(user.id);
  const filteredOrders = userOrders.filter(
    (order) =>
      order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.items.some((item) =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase())
      )
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Delivered":
        return "bg-green-100 text-green-800";
      case "In Transit":
        return "bg-blue-100 text-blue-800";
      case "Shipped":
        return "bg-blue-100 text-blue-800";
      case "Processing":
        return "bg-yellow-100 text-yellow-800";
      case "Cancelled":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const handleReorder = (order: any) => {
    // Add all items from the order back to cart
    order.items.forEach((item: any) => {
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

  return (
    <div className="min-h-screen bg-background">
      <Header cartItems={getTotalItems()} />
      <main className="container mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <div className="flex items-center space-x-2 text-sm text-gray-600 mb-6">
          <Link href="/" className="hover:text-gray-900">
            Home
          </Link>
          <span>/</span>
          <span className="text-gray-900">My Orders</span>
        </div>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">My Orders</h1>
          <p className="text-gray-600">
            Welcome back, {user.firstName}! Here are your recent orders.
          </p>
        </div>

        {/* Search */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-4">
              <div className="flex-1">
                <Label htmlFor="search">Search Orders</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    id="search"
                    placeholder="Search by order ID or product name..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Order Statistics */}
        {userOrders.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900">
                    {userOrders.length}
                  </div>
                  <div className="text-sm text-gray-600">Total Orders</div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {userOrders.filter((o) => o.status === "Delivered").length}
                  </div>
                  <div className="text-sm text-gray-600">Delivered</div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {
                      userOrders.filter(
                        (o) =>
                          o.status === "In Transit" || o.status === "Shipped"
                      ).length
                    }
                  </div>
                  <div className="text-sm text-gray-600">In Transit</div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-amber-600">
                    $
                    {userOrders
                      .reduce((sum, order) => sum + order.total, 0)
                      .toFixed(2)}
                  </div>
                  <div className="text-sm text-gray-600">Total Spent</div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Orders List */}
        {filteredOrders.length === 0 ? (
          <div className="text-center py-16">
            {searchTerm ? (
              <>
                <Package className="h-24 w-24 mx-auto text-gray-400 mb-4" />
                <h2 className="text-2xl font-bold text-gray-900 mb-4">
                  No orders found
                </h2>
                <p className="text-gray-600 mb-8">
                  Try adjusting your search terms
                </p>
                <Button
                  variant="outline"
                  onClick={() => setSearchTerm("")}
                  className="bg-transparent"
                >
                  Clear Search
                </Button>
              </>
            ) : userOrders.length === 0 ? (
              <>
                <ShoppingBag className="h-24 w-24 mx-auto text-gray-400 mb-4" />
                <h2 className="text-2xl font-bold text-gray-900 mb-4">
                  No orders yet
                </h2>
                <p className="text-gray-600 mb-8">
                  When you place orders, they will appear here
                </p>
                <Link href="/search">
                  <Button className="bg-amber-700 hover:bg-amber-800">
                    Start Shopping
                  </Button>
                </Link>
              </>
            ) : null}
          </div>
        ) : (
          <div className="space-y-6">
            {filteredOrders.map((order) => (
              <Card key={order.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">
                        Order {order.id}
                      </CardTitle>
                      <p className="text-sm text-gray-600">
                        Placed on {new Date(order.date).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <Badge className={getStatusColor(order.status)}>
                        {order.status}
                      </Badge>
                      <p className="text-lg font-bold mt-1">
                        ${order.total.toFixed(2)}
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-semibold mb-2">Items Ordered</h4>
                      <div className="space-y-2">
                        {order.items.map((item, index) => (
                          <div
                            key={index}
                            className="flex items-center space-x-3"
                          >
                            <img
                              src={item.image || "/placeholder.svg"}
                              alt={item.name}
                              className="w-12 h-12 object-cover rounded-md"
                            />
                            <div className="flex-1">
                              <p className="text-sm font-medium">{item.name}</p>
                              {item.variant && (
                                <p className="text-xs text-gray-600">
                                  Finish: {item.variant}
                                </p>
                              )}
                              {item.size && (
                                <p className="text-xs text-gray-600">
                                  Size: {item.size}
                                </p>
                              )}
                              <p className="text-xs text-gray-600">
                                Qty: {item.quantity} × ${item.price.toFixed(2)}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-2">Shipping Address</h4>
                      <p className="text-sm text-gray-600 mb-4">
                        {order.shippingAddress.name}
                        <br />
                        {order.shippingAddress.address}
                        <br />
                        {order.shippingAddress.city},{" "}
                        {order.shippingAddress.state}{" "}
                        {order.shippingAddress.zipCode}
                      </p>
                      {order.trackingNumber && (
                        <div>
                          <h4 className="font-semibold mb-1">
                            Tracking Number
                          </h4>
                          <p className="text-sm font-mono text-blue-600">
                            {order.trackingNumber}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-6 pt-4 border-t">
                    <div className="flex space-x-2">
                      <Link href={`/orders/${order.id}`}>
                        <Button
                          variant="outline"
                          size="sm"
                          className="bg-transparent"
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View Details
                        </Button>
                      </Link>
                      {order.trackingNumber && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="bg-transparent"
                        >
                          Track Package
                        </Button>
                      )}
                    </div>
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="bg-transparent"
                      >
                        <Download className="h-4 w-4 mr-1" />
                        Invoice
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleReorder(order)}
                        className="bg-transparent"
                      >
                        Reorder
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Quick Actions */}
        {userOrders.length > 0 && (
          <Card className="mt-8">
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Button variant="outline" className="bg-transparent" asChild>
                  <Link href="/search">
                    <ShoppingBag className="h-4 w-4 mr-2" />
                    Continue Shopping
                  </Link>
                </Button>
                <Button variant="outline" className="bg-transparent" asChild>
                  <Link href="/account">Update Profile</Link>
                </Button>
                <Button variant="outline" className="bg-transparent">
                  Download All Invoices
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
      <Footer />
    </div>
  );
}
