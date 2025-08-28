"use client";

import type React from "react";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Footer } from "@/components/footer";
import { Button } from "@gnd/ui/button";
import { Input } from "@gnd/ui/input";
import { Label } from "@gnd/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@gnd/ui/card";
import { Alert, AlertDescription } from "@gnd/ui/alert";
import { Checkbox } from "@gnd/ui/checkbox";
import { Eye, EyeOff, Lock, Mail, User, Phone } from "lucide-react";
import { useAuthStore } from "@/lib/auth-store";
import { useCartStore } from "@/lib/cart-store";
import { useZodForm } from "@/hooks/use-zod-form";
import { Signup, signupSchema } from "@sales/storefront-account";
import { FormInput } from "@gnd/ui/controls/form-input";
import { Form } from "@gnd/ui/form";
import { FormSelect } from "@gnd/ui/controls/form-select";
import { cn } from "@gnd/ui/cn";

export default function SignupPage() {
  const form = useZodForm(signupSchema, {
    defaultValues: {
      name: "",
      businessName: "",
      email: "",
      phoneNo: "",
      accountType: "individual",
      password: "",
      confirmPassword: "",
    },
  });
  const router = useRouter();
  const { signup } = useAuthStore();
  const { getTotalItems } = useCartStore();
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    agreeToTerms: false,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setError("");
  };

  function onSubmit(data: Signup) {}
  const isBusiness = form.watch("accountType") === "business";
  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <div className="flex items-center space-x-2 text-sm text-gray-600 mb-6">
          <Link href="/" className="hover:text-gray-900">
            Home
          </Link>
          <span>/</span>
          <span className="text-gray-900">Create Account</span>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <div className="max-w-md mx-auto">
              <Card>
                <CardHeader className="text-center">
                  <CardTitle className="text-2xl">
                    Create Your Account
                  </CardTitle>
                  <p className="text-gray-600">
                    Join GND Millwork to start shopping and track your orders.
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  {error && (
                    <Alert className="mb-4" variant="destructive">
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <FormSelect
                      options={["individual", "business"]}
                      control={form.control}
                      name="accountType"
                      label="Account Type"
                      className="col-span-2"
                    />
                    <FormInput
                      className={cn("col-span-2", isBusiness || "hidden")}
                      PrefixIcon={User}
                      label="Business Name"
                      control={form.control}
                      name="businessName"
                      placeholder="Enter your business name..."
                    />
                    <FormInput
                      className={cn("col-span-2", !isBusiness || "hidden")}
                      PrefixIcon={User}
                      label="Name"
                      control={form.control}
                      name="name"
                      placeholder="Enter your name..."
                    />
                  </div>
                  <FormInput
                    className="col-span-2"
                    PrefixIcon={Mail}
                    label="Email Address"
                    control={form.control}
                    name="email"
                    placeholder="email@example.com"
                  />
                  <FormInput
                    className="col-span-2"
                    PrefixIcon={Phone}
                    label="Phone Number"
                    control={form.control}
                    name="phoneNo"
                    placeholder="305-123-4567"
                  />
                  {/* <FormInput
                      className="col-span-2"
                      PrefixIcon={Lock}
                      label="Password"
                      control={form.control}
                      name="password"
                      type="password"
                      placeholder="Create your password"
                    />
                    <FormInput
                      className="col-span-2"
                      PrefixIcon={Lock}
                      label="Confirm Password"
                      control={form.control}
                      name="confirmPassword"
                      type="password"
                      placeholder="Confirm your password"
                    /> */}

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="agreeToTerms"
                      checked={formData.agreeToTerms}
                      onCheckedChange={(checked) =>
                        handleInputChange("agreeToTerms", checked as boolean)
                      }
                    />
                    <Label htmlFor="agreeToTerms" className="text-sm">
                      I agree to the{" "}
                      <Link
                        href="/terms-of-use"
                        className="text-amber-600 hover:text-amber-700"
                      >
                        Terms of Use
                      </Link>{" "}
                      and{" "}
                      <Link
                        href="/privacy-policy"
                        className="text-amber-600 hover:text-amber-700"
                      >
                        Privacy Policy
                      </Link>
                    </Label>
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-amber-700 hover:bg-amber-800"
                    disabled={isLoading}
                  >
                    {isLoading ? "Creating Account..." : "Create Account"}
                  </Button>

                  <div className="mt-6 text-center">
                    <p className="text-sm text-gray-600">
                      Already have an account?{" "}
                      <Link
                        href="/login"
                        className="text-amber-600 hover:text-amber-700 font-medium"
                      >
                        Sign in here
                      </Link>
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </form>
        </Form>
      </main>
      <Footer />
    </div>
  );
}
