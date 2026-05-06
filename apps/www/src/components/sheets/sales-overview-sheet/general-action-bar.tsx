import { resetSalesStatAction } from "@/actions/reset-sales-stat";
import { AuthGuard } from "@/components/auth-guard";
import { SalesFormVersionMenuItems } from "@/components/sales-form-version-menu-items";
import { SalesMenu } from "@/components/sales-menu";
import { SendForPackingButton } from "@/components/sales/send-for-packing-button";
import { _perm } from "@/components/sidebar-links";
import { useAuth } from "@/hooks/use-auth";
import { useBatchSales } from "@/hooks/use-batch-sales";
import { useSalesOverviewQuery } from "@/hooks/use-sales-overview-query";
import { useSalesPreview } from "@/hooks/use-sales-preview";
import { Button } from "@gnd/ui/button";
import { Icons } from "@gnd/ui/icons";
import { useTransition } from "react";
import { toast } from "sonner";
import { useSaleOverview } from "./context";
export function GeneralActionBar({ type, salesNo, salesId }) {
	const { data } = useSaleOverview() as {
		data?: {
			type?: string | null;
			id?: number | null;
			orderId?: string | null;
			uuid?: string | null;
			email?: string | null;
			displayName?: string | null;
		};
	};
	const isQuote = data?.type === "quote";
	const batchSales = useBatchSales();
	const sPreview = useSalesPreview();
	const auth = useAuth();
	const canSendForPacking =
		Boolean(auth.can?.editOrders) &&
		auth.roleTitle?.toLowerCase() === "super admin" &&
		!isQuote;
	function preview() {
		void sPreview.preview(data?.id, data?.type, {
			customerEmail: data?.email,
			customerName: data?.displayName,
		});
	}
	const [loading, startTransition] = useTransition();
	const qs = useSalesOverviewQuery();

	async function reset() {
		startTransition(async () => {
			try {
				await resetSalesStatAction(data?.id, data?.orderId);
				toast.success("Reset complete");
				qs.salesQuery.salesStatReset();
				// qs.setParams({
				//     refreshTok: generateRandomString(),
				// });
			} catch (error) {
				toast.error("Unable to complete");
			}
		});
	}
	return (
		<div className="flex gap-2">
			{canSendForPacking ? (
				<SendForPackingButton
					salesId={salesId}
					orderNo={data?.orderId}
					className="flex-1 items-center gap-2"
					variant="outline"
				/>
			) : null}
			<Button
				onClick={(e) => {
					preview();
				}}
				size="sm"
				variant="default"
				className="flex items-center space-x-2 hover:bg-secondary flex-1"
			>
				<Icons.FileSearch className="size-3.5" />
				<span>Preview</span>
			</Button>
			<SalesMenu
				trigger={
					<Button
						size="sm"
						variant="secondary"
						className="flex-1 items-center space-x-2 hover:bg-secondary"
					>
						<Icons.Edit className="size-3.5" />
						<span>Edit</span>
					</Button>
				}
				id={data?.id}
				slug={data?.uuid}
				type={data?.type}
				align="start"
			>
				<SalesFormVersionMenuItems slug={salesNo} type={type} />
			</SalesMenu>
			<SalesMenu
				triggerVariant="secondary"
				id={data?.id}
				slug={data?.uuid}
				type={data?.type}
			>
				<SalesFormVersionMenuItems slug={salesNo} type={data?.type} />
				{isQuote ? (
					<SalesMenu.QuoteEmailMenuItems />
				) : (
					<>
						<SalesMenu.SalesEmailMenuItems />
						<SalesMenu.Sub>
							<SalesMenu.SubTrigger>
								<Icons.CheckCheck className="mr-2 size-4 text-muted-foreground/70" />
								Mark as
							</SalesMenu.SubTrigger>
							<SalesMenu.SubContent>
								<SalesMenu.Item
									onSelect={(e) => {
										e.preventDefault();
										batchSales.markAsProductionCompleted(salesId);
									}}
								>
									Production Complete
								</SalesMenu.Item>
								<SalesMenu.Item
									onSelect={(e) => {
										e.preventDefault();
										batchSales.markAsFulfilled(salesId);
									}}
								>
									Fulfillment Complete
								</SalesMenu.Item>
							</SalesMenu.SubContent>
						</SalesMenu.Sub>
						<SalesMenu.Separator />
						<SalesMenu.Share />
						<SalesMenu.SalesPrintMenuItems />
						<SalesMenu.Copy />
						<SalesMenu.Move />
						<SalesMenu.Separator />
						<SalesMenu.Item onSelect={reset} disabled={loading}>
							<Icons.RefreshCcw className="mr-2 size-4 text-muted-foreground/70" />
							Reset Stats
						</SalesMenu.Item>
						<AuthGuard rules={[_perm.is("viewSalesResolution")]}>
							<SalesMenu.Item
								onSelect={(e) => {
									e.preventDefault();
									openLink(
										"/sales-book/accounting/resolution-center",
										{
											salesNo: data.orderId,
										},
										true,
									);
								}}
								disabled={loading}
							>
								<Icons.RefreshCcw className="mr-2 size-4 text-muted-foreground/70" />
								Resolution Center
							</SalesMenu.Item>
						</AuthGuard>
					</>
				)}
			</SalesMenu>
		</div>
	);
}
