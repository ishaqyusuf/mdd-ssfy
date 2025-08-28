"use client";

import type React from "react";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Footer } from "@/components/footer";
import { OrderSummary } from "@/components/order-summary";
import { Button } from "@gnd/ui/button";
import { Input } from "@gnd/ui/input";
import { Label } from "@gnd/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@gnd/ui/card";
import { Checkbox } from "@gnd/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@gnd/ui/select";
import { Alert, AlertDescription } from "@gnd/ui/alert";
import { CreditCard, Lock, ArrowLeft, User } from "lucide-react";
import { useCartStore } from "@/lib/cart-store";
import { useAuthStore } from "@/lib/auth-store";
import { useOrdersStore } from "@/lib/orders-store";
import { CartProvider, useCart } from "@/hooks/use-cart";
import { OrderItemsSummary } from "@/components/order-items-summary";

export function CheckoutPage() {
  return (
    <CartProvider>
      <Content />
    </CartProvider>
  );
}
export function Content() {
  const router = useRouter();
  const cart = useCart();

  const { items, getTotalPrice, clearCart } = useCartStore();
  const { user, isAuthenticated } = useAuthStore();
  const { createOrder } = useOrdersStore();
  const [mounted, setMounted] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [formData, setFormData] = useState({
    // Shipping Information
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    zipCode: "",
    // Billing Information
    billingFirstName: "",
    billingLastName: "",
    billingAddress: "",
    billingCity: "",
    billingState: "",
    billingZipCode: "",
    // Payment Information
    cardNumber: "",
    expiryDate: "",
    cvv: "",
    nameOnCard: "",
    // Options
    sameAsShipping: true,
    saveInfo: false,
  });

  useEffect(() => {
    setMounted(true);
    // Pre-fill form with user data if authenticated
    if (user) {
      setFormData((prev) => ({
        ...prev,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone || "",
        address: user.address?.street || "",
        city: user.address?.city || "",
        state: user.address?.state || "",
        zipCode: user.address?.zipCode || "",
      }));
    }
  }, [user]);

  // Redirect to cart if no items
  useEffect(() => {
    if (mounted && items.length === 0) {
      router.push("/cart");
    }
  }, [mounted, items.length, router]);

  const total = cart?.data?.estimate?.total;

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);

    // Simulate payment processing
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // Create order if user is authenticated
    let orderId: string;
    if (isAuthenticated && user) {
      orderId = createOrder({
        userId: user.id,
        items: items.map((item) => ({
          id: item.id,
          name: item.name,
          quantity: item.quantity,
          price: item.price,
          image: item.image,
          variant: item.variant,
          size: item.size,
        })),
        total,
        subtotal,
        shipping,
        tax,
        shippingAddress: {
          name: `${formData.firstName} ${formData.lastName}`,
          address: formData.address,
          city: formData.city,
          state: formData.state,
          zipCode: formData.zipCode,
          phone: formData.phone,
        },
        billingAddress: formData.sameAsShipping
          ? {
              name: `${formData.firstName} ${formData.lastName}`,
              address: formData.address,
              city: formData.city,
              state: formData.state,
              zipCode: formData.zipCode,
            }
          : {
              name: `${formData.billingFirstName} ${formData.billingLastName}`,
              address: formData.billingAddress,
              city: formData.billingCity,
              state: formData.billingState,
              zipCode: formData.billingZipCode,
            },
      });
    } else {
      // For guest checkout, generate a simple order ID
      orderId = `GUEST-${Math.random()
        .toString(36)
        .substr(2, 9)
        .toUpperCase()}`;
    }

    // Clear cart and redirect to success page
    clearCart();
    router.push(`/orders/${orderId}?success=true`);
  };

  if (cart?.loadingCart) {
    return (
      <div className="min-h-screen bg-background">
        <main className="container mx-auto px-4 py-8">
          <div className="text-center py-16">
            <div className="animate-pulse">Loading checkout...</div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (items.length === 0) {
    return null; // Will redirect to cart
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
          <Link href="/cart" className="hover:text-gray-900">
            Cart
          </Link>
          <span>/</span>
          <span className="text-gray-900">Checkout</span>
        </div>

        <div className="flex items-center mb-6">
          <Link href="/cart">
            <Button variant="ghost">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Cart
            </Button>
          </Link>
        </div>

        {/* Guest checkout notice */}
        {!isAuthenticated && (
          <Alert className="mb-6">
            <User className="h-4 w-4" />
            <AlertDescription>
              <div className="flex items-center justify-between">
                <span>
                  Have an account? Sign in for faster checkout and order
                  tracking.
                </span>
                <Link href="/login">
                  <Button
                    variant="outline"
                    size="sm"
                    className="ml-4 bg-transparent"
                  >
                    Sign In
                  </Button>
                </Link>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Authenticated user welcome */}
        {isAuthenticated && user && (
          <Alert className="mb-6">
            <User className="h-4 w-4" />
            <AlertDescription>
              <div className="flex items-center justify-between">
                <span>
                  Welcome back, {user.firstName}! Your information has been
                  pre-filled for faster checkout.
                </span>
                <Link href="/account">
                  <Button
                    variant="outline"
                    size="sm"
                    className="ml-4 bg-transparent"
                  >
                    Update Profile
                  </Button>
                </Link>
              </div>
            </AlertDescription>
          </Alert>
        )}

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Checkout Form */}
          <div className="lg:col-span-2 space-y-6">
            <form onSubmit={handleSubmit}>
              {/* Shipping Information */}
              <Card>
                <CardHeader>
                  <CardTitle>Shipping Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="firstName">First Name</Label>
                      <Input
                        id="firstName"
                        value={formData.firstName}
                        onChange={(e) =>
                          handleInputChange("firstName", e.target.value)
                        }
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="lastName">Last Name</Label>
                      <Input
                        id="lastName"
                        value={formData.lastName}
                        onChange={(e) =>
                          handleInputChange("lastName", e.target.value)
                        }
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) =>
                        handleInputChange("email", e.target.value)
                      }
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={(e) =>
                        handleInputChange("phone", e.target.value)
                      }
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="address">Address</Label>
                    <Input
                      id="address"
                      value={formData.address}
                      onChange={(e) =>
                        handleInputChange("address", e.target.value)
                      }
                      required
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="city">City</Label>
                      <Input
                        id="city"
                        value={formData.city}
                        onChange={(e) =>
                          handleInputChange("city", e.target.value)
                        }
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="state">State</Label>
                      <Select
                        value={formData.state}
                        onValueChange={(value) =>
                          handleInputChange("state", value)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select state" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="FL">Florida</SelectItem>
                          <SelectItem value="CA">California</SelectItem>
                          <SelectItem value="NY">New York</SelectItem>
                          <SelectItem value="TX">Texas</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="zipCode">ZIP Code</Label>
                      <Input
                        id="zipCode"
                        value={formData.zipCode}
                        onChange={(e) =>
                          handleInputChange("zipCode", e.target.value)
                        }
                        required
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Options */}
              <Card>
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    {isAuthenticated && (
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="saveInfo"
                          checked={formData.saveInfo}
                          onCheckedChange={(checked) =>
                            handleInputChange("saveInfo", checked as boolean)
                          }
                        />
                        <Label htmlFor="saveInfo">
                          Save this information for next time
                        </Label>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Button
                type="submit"
                className="w-full bg-amber-700 hover:bg-amber-800 text-lg py-3"
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Processing Payment...
                  </>
                ) : (
                  <>
                    <Lock className="h-4 w-4 mr-2" />
                    Complete Order - ${total.toFixed(2)}
                  </>
                )}
              </Button>
            </form>
          </div>

          {/* Order Summary */}
          <div className="space-y-6">
            <OrderItemsSummary />

            <OrderSummary />

            <div className="text-center text-sm text-gray-600">
              <div className="flex items-center justify-center mb-2">
                <Lock className="h-4 w-4 mr-1" />
                <span>Secure SSL Encryption</span>
              </div>
              <p>Your payment information is safe and secure</p>
              {isAuthenticated && (
                <p className="mt-2 text-amber-600">
                  Your order will be saved to your account for tracking
                </p>
              )}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
