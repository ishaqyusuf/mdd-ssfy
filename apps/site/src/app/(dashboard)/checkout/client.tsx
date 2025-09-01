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
import { Lock, ArrowLeft, User } from "lucide-react";
import { useCartStore } from "@/lib/cart-store";
import { useAuthStore } from "@/lib/auth-store";
import { useOrdersStore } from "@/lib/orders-store";
import { CartProvider, useCart } from "@/hooks/use-cart";
import { OrderItemsSummary } from "@/components/order-items-summary";
import { useZodForm } from "@/hooks/use-zod-form";
import { createBillingSchema } from "@sales/storefront-account";
import { useAuth } from "@/hooks/use-auth";
import { Form } from "@gnd/ui/form";
import { FormInput } from "@gnd/ui/controls/form-input";
import { SubmitButton } from "@gnd/ui/controls/submit-button";
import AddressAutoComplete from "@/components/address-autocomplete";
import { useTRPC } from "@/trpc/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { FormDebugBtn } from "@gnd/ui/controls/form-debug-btn";
import { useDebugConsole } from "@/hooks/use-debug-console";
import { AddressForm } from "@/components/address-form";
import { CreateCheckout, createCheckoutSchema } from "@sales/storefront-order";
import { FormCheckbox } from "@gnd/ui/controls/form-checkbox";
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
  const auth = useAuth();
  // useDebugConsole(cart.data, auth);
  const isAuthenticated = !!auth.id;
  const { items, getTotalPrice, clearCart } = useCartStore();
  const { user } = useAuthStore();
  const form = useZodForm(createCheckoutSchema, {
    defaultValues: {},
  });

  const handleSubmit = async (data: CreateCheckout) => {};
  const trpc = useTRPC();
  const m = useMutation(
    trpc.storefront.order.createCheckout.mutationOptions({
      onSuccess(data, variables, context) {},
    })
  );
  if (cart?.loadingCart) {
    return (
      <div className="min-h-screen bg-background">
        <main className="container mx-auto px-4 py-8">
          <div className="text-center py-16">
            <div className="animate-pulse">Loading checkout...</div>
          </div>
        </main>
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

        {!cart?.data?.billing?.address1 ? (
          <SetupBilling />
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)}>
              <div className="grid lg:grid-cols-3 gap-8">
                {/* Checkout Form */}
                <div className="lg:col-span-2 space-y-6">
                  {/* Shipping Information */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Shipping Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <AddressForm formKey="shipping" />
                    </CardContent>
                  </Card>

                  {/* Options */}
                  <Card>
                    <CardContent className="pt-6">
                      <div className="space-y-4">
                        <div className="flex items-center space-x-2">
                          <FormCheckbox
                            control={form.control}
                            name="primaryShipping"
                            label={`Set information as primary shipping address`}
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Button
                    type="submit"
                    className="w-full bg-amber-700 hover:bg-amber-800 text-lg py-3"
                  >
                    {m.isPending ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Processing Payment...
                      </>
                    ) : (
                      <>
                        <Lock className="h-4 w-4 mr-2" />
                        Complete Order - $
                        {cart?.data?.estimate?.total.toFixed(2)}
                      </>
                    )}
                  </Button>
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
            </form>
          </Form>
        )}
      </main>
      <Footer />
    </div>
  );
}
function SetupBilling({}) {
  const auth = useAuth();
  const cart = useCart();
  const { data } = cart;
  const billing = data?.billing;
  const form = useZodForm(createBillingSchema, {
    defaultValues: {
      id: billing?.id,
      userId: auth.id,
      name: billing?.name || "",
      address1: billing?.address1 || "",
      address2: billing?.address2 || "",
      city: billing?.city || "",
      state: billing?.state || "",
      customerId: billing?.customerId || data?.customer?.id,
      meta: {
        zip_code: "",
        placeId: "",
        placeSearchText: "",
        ...billing.meta,
      },
      email: billing?.email || "",
      phone: billing?.phoneNo || "",
    },
  });
  const handleSubmit = (data: typeof createBillingSchema._type) => {
    m.mutate({
      ...data,
    });
  };
  const trpc = useTRPC();
  const qc = useQueryClient();
  const m = useMutation(
    trpc.storefront.profile.createBilling.mutationOptions({
      onSuccess(data, variables, context) {
        console.log({ data, variables });
        qc.invalidateQueries({
          queryKey: trpc.storefront.getCartList.queryKey(),
        });
      },
      onError(error, variables, context) {
        console.log({ error, variables });
      },
    })
  );

  return (
    <div className="grid lg:grid-cols-3 gap-8">
      {/* Checkout Form */}
      <div className="lg:col-span-2 space-y-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)}>
            {/* Shipping Information */}
            <Card>
              <CardHeader>
                <CardTitle>Billing Address</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormInput label="Name" control={form.control} name="name" />
                <AddressForm />
              </CardContent>
            </Card>
            <FormDebugBtn />
            <SubmitButton className="w-full" isSubmitting={false}>
              Save
            </SubmitButton>
          </form>
        </Form>
      </div>
    </div>
  );
}
