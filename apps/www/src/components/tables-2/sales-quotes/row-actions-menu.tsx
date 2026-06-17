"use client";

import { SalesMenu } from "@/components/sales-menu";
import { SalesOverviewVersionMenuItems } from "@/components/sales-overview-version-menu-items";
import { Button } from "@gnd/ui/button";
import { Icons } from "@gnd/ui/icons";

type QuoteActionItem = {
	id?: number | null;
	slug?: string | null;
	uuid?: string | null;
	email?: string | null;
	displayName?: string | null;
};

export function QuoteRowActionsMenu({
	item,
	open,
	onOpenChange,
	onDeleted,
}: {
	item: QuoteActionItem;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onDeleted?: () => Promise<void> | void;
}) {
	return (
		<SalesMenu
			id={item.id ?? undefined}
			slug={item.slug ?? undefined}
			type="quote"
			customerEmail={item.email ?? null}
			customerName={item.displayName}
			open={open}
			onOpenChange={onOpenChange}
			trigger={
				<Button
					size="icon"
					variant="ghost"
					className="size-8 rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
					onClick={(event) => event.stopPropagation()}
				>
					<Icons.MoreHoriz className="size-4" />
					<span className="sr-only">More quote actions</span>
				</Button>
			}
			contentClassName="min-w-52"
		>
			<SalesOverviewVersionMenuItems
				type="quote"
				uuid={item.uuid ?? undefined}
			/>
			<SalesMenu.QuoteEmailMenuItems />
			<SalesMenu.SalesPrintMenuItems />
			<SalesMenu.Copy />
			<SalesMenu.Move />
			<SalesMenu.Separator />
			<SalesMenu.Delete onDeleted={onDeleted} />
		</SalesMenu>
	);
}
