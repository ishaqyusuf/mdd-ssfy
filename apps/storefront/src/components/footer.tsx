"use client";

import { useTRPC } from "@/trpc/client";
import { Icons } from "@gnd/ui/icons";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";

export function Footer() {
  const trpc = useTRPC();
  const { data: categories } = useQuery(
    trpc.storefrontCommerce.catalog.categories.queryOptions(),
  );

  return (
    <footer className="bg-gray-950 py-12 text-white">
      <div className="container mx-auto px-4">
        <div className="grid gap-8 md:grid-cols-4">
          <div>
            <h2 className="text-xl font-bold text-amber-400">GND Millwork</h2>
            <p className="mt-4 text-sm text-gray-300">
              Browse and configure GND doors, mouldings, and shelf items using
              the same product system our sales team uses.
            </p>
          </div>

          <div>
            <h3 className="font-semibold">Products</h3>
            <ul className="mt-4 space-y-2 text-sm text-gray-300">
              {categories?.map((category) => (
                <li key={category.id}>
                  <Link href={category.href} className="hover:text-white">
                    {category.title}
                  </Link>
                </li>
              ))}
              <li>
                <Link href="/search" className="hover:text-white">
                  All products
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold">Account</h3>
            <ul className="mt-4 space-y-2 text-sm text-gray-300">
              <li>
                <Link href="/account" className="hover:text-white">
                  My account
                </Link>
              </li>
              <li>
                <Link href="/orders" className="hover:text-white">
                  My orders
                </Link>
              </li>
              <li>
                <Link href="/cart" className="hover:text-white">
                  Cart
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold">Contact</h3>
            <div className="mt-4 space-y-3 text-sm text-gray-300">
              <a href="tel:+13052786555" className="flex items-center gap-2">
                <Icons.Phone className="size-4" />
                (305) 278-6555
              </a>
              <a
                href="mailto:support@gndmillwork.com"
                className="flex items-center gap-2"
              >
                <Icons.Mail className="size-4" />
                support@gndmillwork.com
              </a>
              <p className="flex items-start gap-2">
                <Icons.MapPin className="mt-0.5 size-4 shrink-0" />
                13285 SW 131st St, Miami, FL 33186
              </p>
            </div>
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-3 border-t border-gray-800 pt-6 text-xs text-gray-400 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} GND Millwork Corp.</p>
          <div className="flex gap-4">
            <Link href="/terms-of-use" className="hover:text-white">
              Terms
            </Link>
            <Link href="/privacy-policy" className="hover:text-white">
              Privacy
            </Link>
            <Link href="/return-policy" className="hover:text-white">
              Returns
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
