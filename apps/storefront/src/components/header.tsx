"use client";

import { useAuth } from "@/hooks/use-auth";
import { useTRPC } from "@/trpc/client";
import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@gnd/ui/dropdown-menu";
import { Icons } from "@gnd/ui/icons";
import { Input } from "@gnd/ui/input";
import { Sheet, SheetContent, SheetTrigger } from "@gnd/ui/sheet";
import { useQuery } from "@tanstack/react-query";
import { signOut } from "next-auth/react";
import Link from "next/link";

function CategoryLinks({ mobile = false }: { mobile?: boolean }) {
  const trpc = useTRPC();
  const { data } = useQuery(
    trpc.storefrontCommerce.catalog.categories.queryOptions(),
  );

  return (
    <>
      {data?.map((category) => (
        <Link
          key={category.id}
          href={category.href}
          className={
            mobile
              ? "rounded-md px-3 py-2 text-base font-medium hover:bg-muted"
              : "text-sm font-medium hover:text-amber-800"
          }
        >
          {category.title}
        </Link>
      ))}
    </>
  );
}

function CartButton() {
  const trpc = useTRPC();
  const { data } = useQuery(
    trpc.storefrontCommerce.cart.get.queryOptions(undefined, {
      staleTime: 15_000,
    }),
  );
  const quantity =
    data?.items.reduce((total, item) => total + item.quantity, 0) ?? 0;

  return (
    <Button asChild variant="outline" size="icon" className="relative">
      <Link href="/cart" aria-label={`Cart with ${quantity} items`}>
        <Icons.ShoppingCart className="size-4" />
        {quantity > 0 && (
          <Badge className="absolute -right-2 -top-2 flex size-5 items-center justify-center rounded-full p-0 text-[10px]">
            {quantity > 99 ? "99+" : quantity}
          </Badge>
        )}
      </Link>
    </Button>
  );
}

export function Header() {
  const auth = useAuth();
  const isAuthenticated = Boolean(auth?.id);

  return (
    <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur">
      <div className="border-b">
        <div className="container mx-auto flex items-center justify-between px-4 py-2 text-xs text-muted-foreground">
          <a href="tel:+13052786555" className="flex items-center gap-1">
            <Icons.Phone className="size-3.5" />
            (305) 278-6555
          </a>
          <a
            href="mailto:support@gndmillwork.com"
            className="hidden items-center gap-1 sm:flex"
          >
            <Icons.Mail className="size-3.5" />
            support@gndmillwork.com
          </a>
        </div>
      </div>

      <div className="container mx-auto flex h-16 items-center gap-5 px-4">
        <Link href="/" className="shrink-0 text-xl font-bold text-amber-900">
          GND Millwork
        </Link>

        <nav className="hidden flex-1 items-center gap-5 lg:flex" aria-label="Main">
          <CategoryLinks />
          <Link href="/search" className="text-sm font-medium hover:text-amber-800">
            All products
          </Link>
        </nav>

        <div className="ml-auto hidden w-56 md:block">
          <Link href="/search" aria-label="Search products">
            <div className="relative">
              <Icons.Search className="absolute left-3 top-3 size-4 text-muted-foreground" />
              <Input
                readOnly
                tabIndex={-1}
                placeholder="Search products"
                className="cursor-pointer pl-9"
              />
            </div>
          </Link>
        </div>

        <CartButton />

        <Button asChild variant="outline" size="icon">
          <Link href="/wishlist" aria-label="Wishlist">
            <Icons.Heart className="size-4" />
          </Link>
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon" aria-label="Account menu">
              <Icons.User className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {isAuthenticated ? (
              <>
                <DropdownMenuItem asChild>
                  <Link href="/account">My account</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/orders">My orders</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/wishlist">Wishlist</Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => void signOut({ callbackUrl: "/" })}>
                  Sign out
                </DropdownMenuItem>
              </>
            ) : (
              <>
                <DropdownMenuItem asChild>
                  <Link href="/login">Sign in</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/signup">Create account</Link>
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon" className="lg:hidden">
              <Icons.Menu className="size-4" />
              <span className="sr-only">Open navigation</span>
            </Button>
          </SheetTrigger>
          <SheetContent>
            <nav className="mt-8 flex flex-col gap-1" aria-label="Mobile">
              <CategoryLinks mobile />
              <Link
                href="/search"
                className="rounded-md px-3 py-2 text-base font-medium hover:bg-muted"
              >
                All products
              </Link>
            </nav>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
