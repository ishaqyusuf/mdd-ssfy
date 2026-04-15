import { Button } from "@gnd/ui/button";
import { Icons } from "@gnd/ui/icons";
import { useSaleOverview } from "./context";
import { openLink } from "@/lib/open-link";
import { salesFormUrl } from "@/utils/sales-utils";
import { useBatchSales } from "@/hooks/use-batch-sales";
import { useSalesPreview } from "@/hooks/use-sales-preview";
import { AuthGuard } from "@/components/auth-guard";
import { _perm, _role } from "@/components/sidebar/links";
import { useSalesOverviewQuery } from "@/hooks/use-sales-overview-query";
import { useTransition } from "react";
import { resetSalesStatAction } from "@/actions/reset-sales-stat";

import { toast } from "sonner";
import { SendSalesReminder } from "@/components/send-sales-reminder";
import { SalesMenu } from "@/components/sales-menu";
import { SendForPickupButton } from "@/components/sales/send-for-pickup-button";
export function GeneralActionBar({ type, salesNo, salesId }) {
	const { data } = useSaleOverview() as { data?: any };
	const isQuote = data?.type == "quote";
	const batchSales = useBatchSales();
	const sPreview = useSalesPreview();
	function preview() {
		void sPreview.preview(data?.id, data?.type);
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
			<SendSalesReminder salesIds={[salesId]} />
			{!isQuote ? (
				<AuthGuard rules={[_perm.is("editOrders"), _role.is("Super Admin")]}>
					<SendForPickupButton
						salesId={salesId}
						orderNo={data?.orderId}
						className="flex-1 items-center gap-2"
						variant="outline"
					/>
				</AuthGuard>
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
			<Button
				size="sm"
				variant="secondary"
				className="flex-1 items-center space-x-2 hover:bg-secondary"
				onClick={() => {
					openLink(salesFormUrl(type, salesNo, true), {}, true);
					// setParams({ invoiceId: id, type: "edit" });
				}}
			>
				<Icons.Edit className="size-3.5" />
				<span>Edit</span>
			</Button>
			<SalesMenu
				triggerVariant="secondary"
				id={data?.id}
				slug={data?.uuid}
				type={data?.type}
			>
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
										`/sales-book/accounting/resolution-center`,
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
