import { SuperAdminGuard } from "@/components/auth-guard";
import { SalesMenu } from "@/components/sales-menu";
import { SalesPaymentNotificationsMenu } from "@/components/sales-payment-notifications-menu";
import { SalesPaymentProcessor } from "@/components/widgets/sales-payment-processor/sales-payment-processor";
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
					queryKey: trpc.sales.getOrders.infiniteQueryKey(),
				});
			},
		}),
	);

	const item = selections?.[0];
	return (
		<>
			{!ctx.selectedRows?.length || (
				<BatchAction>
					<SalesMenu
						type="order"
						salesIds={salesIds}
						trigger={
							<Button variant="ghost">
								<Icons.print className="mr-2 size-4" />
								Print
							</Button>
						}
					>
						<SalesMenu.SalesPrintMenuItems />
						<SuperAdminGuard>
							<SalesMenu.PrintModes />
						</SuperAdminGuard>
					</SalesMenu>
					<SalesPaymentNotificationsMenu
						type="order"
						salesIds={salesIds}
						menuTrigger={
							<Button variant="ghost">
								<Icons.Email className="mr-2 size-4" />
								Email
							</Button>
						}
						sale={{
							id: item?.id,
							due: item?.due,
							email: item?.email,
						}}
					/>
					<SalesPaymentProcessor
						phoneNo={item?.customerPhone}
						selectedIds={salesIds}
						customerId={item?.customerId}
						buttonProps={{
							variant: "ghost",
						}}
					/>
					<BatchDelete
						onClick={async () => {
							await deleteMutation.mutateAsync({
								orderIds: slugs,
							});
						}}
					/>
				</BatchAction>
			)}
		</>
	);
}
