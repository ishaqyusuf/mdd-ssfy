"use client";

import { useTRPC } from "@/trpc/client";
import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import { Icons } from "@gnd/ui/icons";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";

export function CartHeaderIcon() {
	const trpc = useTRPC();
	const { data } = useQuery(trpc.storefrontCommerce.cart.get.queryOptions());
	const totalCartItems =
		data?.items.reduce((total, item) => total + item.quantity, 0) ?? 0;
	return (
		<>
			{/* Cart */}
			<Link href="/cart">
				<Button variant="outline" className="relative bg-transparent">
					<Icons.ShoppingCart className="h-4 w-4" />
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
