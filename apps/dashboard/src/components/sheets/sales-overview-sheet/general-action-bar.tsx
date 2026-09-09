import type { SalesPipelineSnapshot } from "@gnd/sales/sales-pipeline";
import { resetSalesStatAction } from "@/actions/reset-sales-stat";
import { AuthGuard } from "@/components/auth-guard";
import { SalesMenu } from "@/components/sales-menu";
import { getSalesOverviewDocumentStatus } from "@/components/sales-overview-system/lib/document-status";
import { SendForPackingMenuItem } from "@/components/sales/send-for-packing-button";
import { _perm } from "@/components/sidebar-links";
import { useAuth } from "@/hooks/use-auth";
import { useSalesOverviewQuery } from "@/hooks/use-sales-overview-query";
import { useSalesPreview } from "@/hooks/use-sales-preview";
import { openLink } from "@/lib/open-link";
import { salesFormUrl } from "@/utils/sales-utils";
import { Button } from "@gnd/ui/button";
import { Icons } from "@gnd/ui/icons";
import type { SalesOrderLifecycleStatus } from "@gnd/sales/order-status";
import { useState, useTransition } from "react";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@gnd/ui/dialog";
import { SpecialOrderOverviewControls } from "./special-order-overview-card";
import { toast } from "sonner";
import { useSaleOverview } from "./context";
type SalesType = "order" | "quote";
const actionButtonClass =
	"h-9 w-full min-w-0 items-center justify-center gap-2";

export function GeneralActionBar({ type, salesNo, salesId }) {
	const { data } = useSaleOverview() as {
		data?: {
			pipeline?: SalesPipelineSnapshot | null;
			type?: SalesType | null;
			id?: number | null;
			customerId?: number | null;
			orderId?: string | null;
			uuid?: string | null;
			isDyke?: boolean | null;
			email?: string | null;
			customerPhone?: string | null;
			displayName?: string | null;
			inboundStatus?: string | null;
			archivedAt?: Date | string | null;
			orderStatus?: string | null;
			prodStatus?: string | null;
			deliveryStatus?: string | null;
			status?: {
				assignment?: { status?: string | null } | null;
				production?: { status?: string | null } | null;
				delivery?: { status?: string | null } | null;
			} | null;
			control?: {
				productionStatus?: string | null;
				dispatchStatus?: string | null;
			} | null;
			dispatchList?: Array<{ id?: number | null }> | null;
		};
	};
	const isQuote = data?.type === "quote";
	const currentOrderStatus = isQuote
		? undefined
		: (getSalesOverviewDocumentStatus(data)
				.status as SalesOrderLifecycleStatus);
	const productionStatus =
		data?.control?.productionStatus ?? data?.status?.production?.status;
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
	const [specialOrderOpen, setSpecialOrderOpen] = useState(false);
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
		<>
			<div aria-label="Sales actions" className="grid grid-cols-3 gap-2">
				<Button
					onClick={() => {
						preview();
					}}
					size="sm"
					variant="default"
					className={actionButtonClass}
				>
					<Icons.Eye className="size-3.5" />
					<span>Preview</span>
				</Button>
				<Button
					size="sm"
					variant="outline"
					className={actionButtonClass}
					disabled={!salesNo && !data?.orderId}
					onClick={() => {
						openLink(
							salesFormUrl(
								data?.type ?? type,
								salesNo ?? data?.orderId,
								data?.isDyke ?? true,
							),
							{},
							true,
						);
					}}
				>
					<Icons.Edit className="size-3.5" />
					<span>Edit</span>
				</Button>
				<SalesMenu
					triggerVariant="outline"
					trigger={
						<Button
							type="button"
							size="sm"
							variant="outline"
							className={actionButtonClass}
						>
							<Icons.Menu className="size-3.5" />
							<span>More</span>
						</Button>
					}
					id={data?.id}
					slug={data?.uuid}
					type={data?.type}
					orderNo={data?.orderId}
					customerId={data?.customerId}
					customerEmail={data?.email ?? null}
					customerPhone={data?.customerPhone}
					customerName={data?.displayName}
				>
					<SalesMenu.Sub>
						<SalesMenu.SubTrigger>Send</SalesMenu.SubTrigger>
						<SalesMenu.SubContent>
							{isQuote ? (
								<SalesMenu.QuoteEmailMenuItems />
							) : (
								<SalesMenu.SalesEmailMenuItems />
							)}
							<SalesMenu.Share />
						</SalesMenu.SubContent>
					</SalesMenu.Sub>
					<SalesMenu.Sub>
						<SalesMenu.SubTrigger>Print</SalesMenu.SubTrigger>
						<SalesMenu.SubContent>
							<SalesMenu.SalesPrintMenuItems />
						</SalesMenu.SubContent>
					</SalesMenu.Sub>
					{isQuote ? (
						<SalesMenu.Sub>
							<SalesMenu.SubTrigger>Quote actions</SalesMenu.SubTrigger>
							<SalesMenu.SubContent>
								<SalesMenu.Copy />
								<SalesMenu.Move />
								<SalesMenu.Delete onDeleted={() => qs.close()} />
							</SalesMenu.SubContent>
						</SalesMenu.Sub>
					) : (
						<>
							<SalesMenu.Sub>
								<SalesMenu.SubTrigger>Order actions</SalesMenu.SubTrigger>
								<SalesMenu.SubContent>
									{canSendForPacking ? (
										<SendForPackingMenuItem
											salesId={salesId}
											orderNo={data?.orderId}
										/>
									) : null}
									<SalesMenu.MarkAs
										currentStatus={currentOrderStatus}
										productionStatus={productionStatus}
 pipeline={data?.pipeline}
 pipelineCapabilities={data?.pipeline?.capabilities}
 statusCandidates={[{salesId, status:currentOrderStatus,pipelineRevision:data?.pipeline?.revision,pipeline:data?.pipeline}]}
 archiveOrders={data?.archivedAt !== undefined ? [{salesId,orderNo:data.orderId ?? salesNo,archived:data.archivedAt !== null}] : undefined}
										hasFulfillmentDispatch={Boolean(data?.dispatchList?.length)}
									/>
									<SalesMenu.Item onSelect={() => setSpecialOrderOpen(true)}>
										Special Order
									</SalesMenu.Item>
									<SalesMenu.Copy />
									<SalesMenu.Move />
									<SalesMenu.Separator />
									<SalesMenu.Delete onDeleted={() => qs.close()} />
								</SalesMenu.SubContent>
							</SalesMenu.Sub>
							<AuthGuard rules={[_perm.is("viewSalesResolution")]}>
								<SalesMenu.Separator />
								<SalesMenu.Sub>
									<SalesMenu.SubTrigger>Troubleshooting</SalesMenu.SubTrigger>
									<SalesMenu.SubContent>
										<SalesMenu.Item onSelect={reset} disabled={loading}>
											Reset Stats
										</SalesMenu.Item>
										<SalesMenu.Item
											onSelect={(e) => {
												e.preventDefault();
												openLink(
													"/sales-book/accounting/resolution-center",
													{ salesNo: data?.orderId },
													true,
												);
											}}
											disabled={loading}
										>
											Resolution Center
										</SalesMenu.Item>
									</SalesMenu.SubContent>
								</SalesMenu.Sub>
							</AuthGuard>
						</>
					)}
				</SalesMenu>
			</div>
			<Dialog open={specialOrderOpen} onOpenChange={setSpecialOrderOpen}>
				<DialogContent aria-describedby={undefined}>
					<DialogHeader>
						<DialogTitle>Special Order</DialogTitle>
					</DialogHeader>
					{specialOrderOpen ? (
						<SpecialOrderOverviewControls presentation="inline" />
					) : null}
				</DialogContent>
			</Dialog>
		</>
	);
}
