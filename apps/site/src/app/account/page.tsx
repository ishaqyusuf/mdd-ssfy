"use client";

import type React from "react";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Button } from "@gnd/ui/button";
import { Input } from "@gnd/ui/input";
import { Label } from "@gnd/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@gnd/ui/card";
import { Alert, AlertDescription } from "@gnd/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@gnd/ui/tabs";
import { Badge } from "@gnd/ui/badge";
import {
  User,
  Mail,
  Phone,
  MapPin,
  Package,
  Settings,
  LogOut,
  CheckCircle,
  Eye,
} from "lucide-react";
import { useAuthStore } from "@/lib/auth-store";
import { useCartStore } from "@/lib/cart-store";
import { useOrdersStore } from "@/lib/orders-store";

export default function AccountPage() {
  const router = useRouter();
  const { user, isAuthenticated, updateProfile, logout } = useAuthStore();
  const { getTotalItems } = useCartStore();
  const { getUserOrders } = useOrdersStore();
  const [mounted, setMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    address: {
      street: "",
      city: "",
      state: "",
      zipCode: "",
    },
  });

  useEffect(() => {
    setMounted(true);
    if (user) {
      setFormData({
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone || "",
        address: user.address || {
          street: "",
          city: "",
          state: "",
          zipCode: "",
        },
      });
    }
  }, [user]);

  useEffect(() => {
    if (mounted && !isAuthenticated) {
      router.push("/login");
    }
  }, [mounted, isAuthenticated, router]);

  const handleInputChange = (field: string, value: string) => {
    if (field.startsWith("address.")) {
      const addressField = field.split(".")[1];
      setFormData((prev) => ({
        ...prev,
        address: { ...prev.address, [addressField]: value },
      }));
    } else {
      setFormData((prev) => ({ ...prev, [field]: value }));
    }
    setError("");
    setSuccess("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    setSuccess("");

    const result = await updateProfile(formData);

    if (result.success) {
      setSuccess("Profile updated successfully!");
    } else {
      setError(result.error || "Failed to update profile");
    }

    setIsLoading(false);
  };

  const handleLogout = () => {
    logout();
    router.push("/");
  };

  if (!mounted || !isAuthenticated || !user) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="text-center py-16">
            <div className="animate-pulse">Loading...</div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const userOrders = getUserOrders(user.id);
  const recentOrders = userOrders.slice(0, 3);

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
          <span className="text-gray-900">My Account</span>
        </div>

        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">My Account</h1>
            <p className="text-gray-600">
              Welcome back, {user.firstName} {user.lastName}
            </p>
          </div>
          <Button
            variant="outline"
            onClick={handleLogout}
            className="bg-transparent"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </div>

        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="orders">
              Orders
              {userOrders.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {userOrders.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="profile">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <User className="h-5 w-5 mr-2" />
                  Profile Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                {success && (
                  <Alert className="mb-4">
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription>{success}</AlertDescription>
                  </Alert>
                )}

                {error && (
                  <Alert className="mb-4" variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                    <Label htmlFor="email">Email Address</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) =>
                          handleInputChange("email", e.target.value)
                        }
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="phone">Phone Number</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                      <Input
                        id="phone"
                        type="tel"
                        value={formData.phone}
                        onChange={(e) =>
                          handleInputChange("phone", e.target.value)
                        }
                        className="pl-10"
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold flex items-center">
                      <MapPin className="h-5 w-5 mr-2" />
                      Address Information
                    </h3>
                    <div>
                      <Label htmlFor="street">Street Address</Label>
                      <Input
                        id="street"
                        value={formData.address.street}
                        onChange={(e) =>
                          handleInputChange("address.street", e.target.value)
                        }
                        placeholder="123 Main Street"
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <Label htmlFor="city">City</Label>
                        <Input
                          id="city"
                          value={formData.address.city}
                          onChange={(e) =>
                            handleInputChange("address.city", e.target.value)
                          }
                          placeholder="Miami"
                        />
                      </div>
                      <div>
                        <Label htmlFor="state">State</Label>
                        <Input
                          id="state"
                          value={formData.address.state}
                          onChange={(e) =>
                            handleInputChange("address.state", e.target.value)
                          }
                          placeholder="FL"
                        />
                      </div>
                      <div>
                        <Label htmlFor="zipCode">ZIP Code</Label>
                        <Input
                          id="zipCode"
                          value={formData.address.zipCode}
                          onChange={(e) =>
                            handleInputChange("address.zipCode", e.target.value)
                          }
                          placeholder="33186"
                        />
                      </div>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    className="bg-amber-700 hover:bg-amber-800"
                    disabled={isLoading}
                  >
                    {isLoading ? "Updating..." : "Update Profile"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="orders">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Package className="h-5 w-5 mr-2" />
                    Recent Orders
                  </div>
                  {userOrders.length > 0 && (
                    <Link href="/orders">
                      <Button
                        variant="outline"
                        size="sm"
                        className="bg-transparent"
                      >
                        View All Orders
                      </Button>
                    </Link>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {recentOrders.length === 0 ? (
                  <div className="text-center py-8">
                    <Package className="h-16 w-16 mx-auto text-gray-400 mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      No orders yet
                    </h3>
                    <p className="text-gray-600 mb-4">
                      When you place orders, they will appear here.
                    </p>
                    <Link href="/search">
                      <Button className="bg-amber-700 hover:bg-amber-800">
                        Start Shopping
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {recentOrders.map((order) => (
                      <div key={order.id} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <h4 className="font-semibold">Order {order.id}</h4>
                            <p className="text-sm text-gray-600">
                              {new Date(order.date).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="text-right">
                            <Badge className={getStatusColor(order.status)}>
                              {order.status}
                            </Badge>
                            <p className="font-semibold mt-1">
                              ${order.total.toFixed(2)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <p className="text-sm text-gray-600">
                            {order.items.length} item
                            {order.items.length !== 1 ? "s" : ""}
                          </p>
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
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Settings className="h-5 w-5 mr-2" />
                  Account Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h4 className="font-medium">Change Password</h4>
                    <p className="text-sm text-gray-600">
                      Update your account password
                    </p>
                  </div>
                  <Button variant="outline" className="bg-transparent">
                    Change Password
                  </Button>
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h4 className="font-medium">Email Notifications</h4>
                    <p className="text-sm text-gray-600">
                      Manage your email preferences
                    </p>
                  </div>
                  <Button variant="outline" className="bg-transparent">
                    Manage
                  </Button>
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h4 className="font-medium">Order History Export</h4>
                    <p className="text-sm text-gray-600">
                      Download your complete order history
                    </p>
                  </div>
                  <Button variant="outline" className="bg-transparent">
                    Export Data
                  </Button>
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h4 className="font-medium">Delete Account</h4>
                    <p className="text-sm text-gray-600">
                      Permanently delete your account
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    className="bg-transparent text-red-600 border-red-600 hover:bg-red-50"
                  >
                    Delete Account
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
      <Footer />
    </div>
  );
}
