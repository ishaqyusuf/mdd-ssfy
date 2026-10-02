"use client";

import type { RouterOutputs } from "@api/trpc/routers/_app";
import { Avatar, AvatarFallback, AvatarImage } from "@gnd/ui/avatar";
import { Icons } from "@gnd/ui/icons";
import { imageUrl } from "@gnd/utils";

type Balance = RouterOutputs["inventories"]["stockVariantBalances"][number];
export function InventoryItemImage({
	balance,
	title,
}: { balance?: Balance; title: string }) {
	const src = balance?.image ? imageUrl(balance.image) : balance?.imageUrl;
	return (
		<Avatar className="h-16 w-14 shrink-0 rounded-none border bg-muted/20">
			<AvatarImage
				src={src || undefined}
				alt={title}
				className="object-contain p-1"
			/>
			<AvatarFallback className="rounded-none bg-transparent">
				<Icons.Package className="size-5 text-muted-foreground" />
			</AvatarFallback>
		</Avatar>
	);
}
