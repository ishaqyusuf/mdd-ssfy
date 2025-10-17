import { useAuth } from "@/hooks/use-auth";
import { useGuestId } from "@/hooks/use-guest-id";
import { useTRPC } from "@/trpc/client";
import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import { useQuery } from "@tanstack/react-query";
import { ShoppingCart } from "lucide-react";
import Link from "next/link";

export function CartHeaderIcon({}) {
  const trpc = useTRPC();
  const auth = useAuth();
  const { guestId } = useGuestId();
  const { data } = useQuery(
    trpc.storefront.getCartCount.queryOptions(
      {
        guestId,
      },
      {
        enabled: !!guestId || !!auth?.id,
      }
    )
  );
  const totalCartItems = data?.count;
  return (
    <>
      {/* Cart */}
      <Link href="/cart">
        <Button variant="outline" className="relative bg-transparent">
          <ShoppingCart className="h-4 w-4" />
          {totalCartItems > 0 && (
            <Badge className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs">
              {totalCartItems}
            </Badge>
          )}
        </Button>
      </Link>
    </>
  );
}
