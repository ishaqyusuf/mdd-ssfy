import { resetSalesStatAction } from "@/actions/reset-sales-stat";
import { AuthGuard } from "@/components/auth-guard";
import { SalesMenu } from "@/components/sales-menu";
import { SendForPackingMenuItem } from "@/components/sales/send-for-packing-button";
import { _perm } from "@/components/sidebar-links";
import { useAuth } from "@/hooks/use-auth";
import { useSalesOverviewQuery } from "@/hooks/use-sales-overview-query";
import { useSalesPreview } from "@/hooks/use-sales-preview";
import { openLink } from "@/lib/open-link";
import { salesFormUrl } from "@/utils/sales-utils";
import { Button } from "@gnd/ui/button";
import { Icons } from "@gnd/ui/icons";
import { useTransition } from "react";
import { toast } from "sonner";
import { useSaleOverview } from "./context";
type SalesType = "order" | "quote";
const actionButtonClass =
	"h-9 w-full min-w-0 items-center justify-center gap-2";

export function GeneralActionBar({ type, salesNo, salesId }) {
	const { data } = useSaleOverview() as {
		data?: {
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
		};
	};
	const isQuote = data?.type === "quote";
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
				{isQuote ? (
					<SalesMenu.QuoteEmailMenuItems />
				) : (
					<>
						{canSendForPacking ? (
							<>
								<SendForPackingMenuItem
									salesId={salesId}
									orderNo={data?.orderId}
								/>
								<SalesMenu.Separator />
							</>
						) : null}
						<SalesMenu.SalesEmailMenuItems />
						<SalesMenu.MarkAs />
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
