import { SalesMenu } from "@/components/sales-menu";
import { useTRPC } from "@/trpc/client";
import { Button } from "@gnd/ui/button";
import {
	BatchAction,
	BatchDelete,
} from "@gnd/ui/custom/data-table/batch-action";
import { useTable } from "@gnd/ui/data-table";
import { Icons } from "@gnd/ui/icons";
import { useMutation, useQueryClient } from "@gnd/ui/tanstack";
import type { Item } from "./columns";

export function BatchActions() {
	const trpc = useTRPC();
	const queryClient = useQueryClient();
	const ctx = useTable();
	const selections = ctx.selectedRows.map((r) => r.original as Item);
	const slugs = selections?.map((r) => r?.orderId);
	const salesIds = selections?.map((r) => r?.id);
	const deleteMutation = useMutation(
		trpc.sales.deleteSalesByOrderIds.mutationOptions({
			onSuccess() {
				queryClient.invalidateQueries({
					queryKey: trpc.sales.quotes.infiniteQueryKey(),
				});
			},
		}),
	);
	if (!ctx.selectedRows?.length) return null;

	return (
		<BatchAction>
			<SalesMenu
				type="quote"
				salesIds={salesIds}
				trigger={
					<Button variant="ghost">
						<Icons.print className="size-4 mr-2" />
						Print
					</Button>
				}
			>
				<SalesMenu.QuotePrintMenuItems />
			</SalesMenu>
			<SalesMenu
				type="quote"
				salesIds={salesIds}
				trigger={
					<Button variant="ghost">
						<Icons.Email className="mr-2 size-4" />
						Email
					</Button>
				}
			>
				<SalesMenu.QuoteEmailMenuItems />
			</SalesMenu>
			<BatchDelete
				onClick={async () => {
					await deleteMutation.mutateAsync({
						orderIds: slugs,
					});
				}}
			/>
		</BatchAction>
	);
}
