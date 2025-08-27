"use client";

import { useEffect, useState } from "react";
import {
  Search,
  ShoppingCart,
  Menu,
  Phone,
  Mail,
  MapPin,
  User,
} from "lucide-react";
import { Button } from "@gnd/ui/button";
import { Input } from "@gnd/ui/input";
import { Badge } from "@gnd/ui/badge";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@gnd/ui/navigation-menu";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@gnd/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@gnd/ui/sheet";
import Link from "next/link";
import { useAuthStore } from "@/lib/auth-store";
import { useCartStore } from "@/lib/cart-store";
import { useAuth } from "@/hooks/use-auth";
import { signOut } from "next-auth/react";
import { CartHeaderIcon } from "./cart-header-icon";

interface HeaderProps {
  cartItems?: number;
}

export function Header({ cartItems }: HeaderProps) {
  // const { logout } = useAuthStore();
  const auth = useAuth();
  const isAuthenticated = !!auth?.id;
  const { getTotalItems, isHydrated, setHydrated } = useCartStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setHydrated();
  }, [setHydrated]);

  // Use cart store items if hydrated, otherwise fall back to prop
  const totalCartItems =
    mounted && isHydrated ? getTotalItems() : cartItems || 0;

  return (
    <header className="border-b bg-white sticky top-0 z-50">
      <div className="container mx-auto px-4">
        {/* Top bar */}
        <div className="flex items-center justify-between py-2 text-sm text-muted-foreground border-b">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-1">
              <Phone className="h-4 w-4" />
              <span>(305) 278-6555</span>
            </div>
            <div className="flex items-center space-x-1">
              <Mail className="h-4 w-4" />
              <span>support@gndmillwork.com</span>
            </div>
          </div>
          <div className="flex items-center space-x-1">
            <MapPin className="h-4 w-4" />
            <span>Free delivery within 50 miles</span>
          </div>
        </div>

        {/* Main header */}
        <div className="flex items-center justify-between py-4">
          <div className="flex items-center space-x-8">
            <Link href="/">
              <h1 className="text-2xl font-bold text-amber-800 cursor-pointer">
                MillworkPro
              </h1>
            </Link>

            {/* Desktop Navigation */}
            <NavigationMenu className="hidden md:flex">
              <NavigationMenuList>
                <NavigationMenuItem>
                  <NavigationMenuTrigger>Doors</NavigationMenuTrigger>
                  <NavigationMenuContent>
                    <div className="grid gap-3 p-6 w-[400px]">
                      <NavigationMenuLink asChild>
                        <Link
                          href="/search?category=interior-doors"
                          className="block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
                        >
                          <div className="text-sm font-medium leading-none">
                            Interior Doors
                          </div>
                          <p className="line-clamp-2 text-sm leading-snug text-muted-foreground">
                            Panel, flush, and specialty interior doors
                          </p>
                        </Link>
                      </NavigationMenuLink>
                      <NavigationMenuLink asChild>
                        <Link
                          href="/search?category=exterior-doors"
                          className="block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
                        >
                          <div className="text-sm font-medium leading-none">
                            Exterior Doors
                          </div>
                          <p className="line-clamp-2 text-sm leading-snug text-muted-foreground">
                            Entry doors, storm doors, and patio doors
                          </p>
                        </Link>
                      </NavigationMenuLink>
                    </div>
                  </NavigationMenuContent>
                </NavigationMenuItem>
                <NavigationMenuItem>
                  <NavigationMenuTrigger>Hardware</NavigationMenuTrigger>
                  <NavigationMenuContent>
                    <div className="grid gap-3 p-6 w-[400px]">
                      <NavigationMenuLink asChild>
                        <Link
                          href="/search?category=handles-knobs"
                          className="block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
                        >
                          <div className="text-sm font-medium leading-none">
                            Handles & Knobs
                          </div>
                          <p className="line-clamp-2 text-sm leading-snug text-muted-foreground">
                            Door handles, knobs, and lever sets
                          </p>
                        </Link>
                      </NavigationMenuLink>
                      <NavigationMenuLink asChild>
                        <Link
                          href="/search?category=locks-security"
                          className="block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
                        >
                          <div className="text-sm font-medium leading-none">
                            Locks & Security
                          </div>
                          <p className="line-clamp-2 text-sm leading-snug text-muted-foreground">
                            Deadbolts, smart locks, and security hardware
                          </p>
                        </Link>
                      </NavigationMenuLink>
                    </div>
                  </NavigationMenuContent>
                </NavigationMenuItem>
                <NavigationMenuItem>
                  <NavigationMenuLink asChild>
                    <Link
                      href="/custom"
                      className="group inline-flex h-10 w-max items-center justify-center rounded-md bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground focus:outline-none disabled:pointer-events-none disabled:opacity-50 data-[active]:bg-accent/50 data-[state=open]:bg-accent/50"
                    >
                      Custom Work
                    </Link>
                  </NavigationMenuLink>
                </NavigationMenuItem>
                <NavigationMenuItem>
                  <NavigationMenuLink asChild>
                    <Link
                      href="/about"
                      className="group inline-flex h-10 w-max items-center justify-center rounded-md bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground focus:outline-none disabled:pointer-events-none disabled:opacity-50 data-[active]:bg-accent/50 data-[state=open]:bg-accent/50"
                    >
                      About
                    </Link>
                  </NavigationMenuLink>
                </NavigationMenuItem>
              </NavigationMenuList>
            </NavigationMenu>
          </div>

          <div className="flex items-center space-x-4">
            {/* Search */}
            <div className="relative hidden md:block">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Link href="/search">
                <Input
                  placeholder="Search doors & hardware..."
                  className="pl-10 w-64 cursor-pointer"
                  readOnly
                />
              </Link>
            </div>

            <CartHeaderIcon />

            {/* User Account Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="bg-transparent"
                >
                  <User className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                {isAuthenticated ? (
                  <>
                    <DropdownMenuItem asChild>
                      <Link href="/account" className="cursor-pointer">
                        My Account
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/orders" className="cursor-pointer">
                        My Orders
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={(e) => {
                        signOut({});
                      }}
                      className="cursor-pointer text-red-600"
                    >
                      Sign Out
                    </DropdownMenuItem>
                  </>
                ) : (
                  <>
                    <DropdownMenuItem asChild>
                      <Link href="/login" className="cursor-pointer">
                        Sign In
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/signup" className="cursor-pointer">
                        Create Account
                      </Link>
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Mobile menu */}
            <Sheet>
              <SheetTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="md:hidden bg-transparent"
                >
                  <Menu className="h-4 w-4" />
                </Button>
              </SheetTrigger>
              <SheetContent>
                <div className="flex flex-col space-y-4 mt-4">
                  <Link href="/search?category=doors">
                    <Button variant="ghost" className="justify-start w-full">
                      Doors
                    </Button>
                  </Link>
                  <Link href="/search?category=hardware">
                    <Button variant="ghost" className="justify-start w-full">
                      Hardware
                    </Button>
                  </Link>
                  <Link href="/custom">
                    <Button variant="ghost" className="justify-start w-full">
                      Custom Work
                    </Button>
                  </Link>
                  <Link href="/about">
                    <Button variant="ghost" className="justify-start w-full">
                      About
                    </Button>
                  </Link>
                  <div className="border-t pt-4">
                    <Link href="/cart">
                      <Button variant="ghost" className="justify-start w-full">
                        <ShoppingCart className="h-4 w-4 mr-2" />
                        Cart ({totalCartItems})
                      </Button>
                    </Link>
                    <Link href="/orders">
                      <Button variant="ghost" className="justify-start w-full">
                        My Orders
                      </Button>
                    </Link>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  );
}
