import { resetSalesStatAction } from "@/actions/reset-sales-stat";
import { useSalesOverviewQuery } from "@/hooks/use-sales-overview-query";
import { useTransition } from "@/utils/use-safe-transistion";
import { Icons } from "@gnd/ui/icons";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@gnd/ui/button";
import Sheet from "@gnd/ui/custom/sheet-v2";
import { SheetFooter } from "@gnd/ui/sheet";

import { AuthGuard } from "@/components/auth-guard";
import { SalesMenu } from "@/components/sales-menu";
import { _perm } from "@/components/sidebar-links";
import { useSalesPreview } from "@/hooks/use-sales-preview";
import { openLink } from "@/lib/open-link";
import { useSaleOverview } from "./context";

export function GeneralFooter() {
	const { data } = useSaleOverview();
	const [loading, startTransition] = useTransition();
	const qs = useSalesOverviewQuery();
	const sPreview = useSalesPreview();

	function preview() {
		void sPreview.preview(data?.id, data?.type, {
			customerEmail: data?.email,
			customerName: data?.displayName,
		});
	}
	async function reset() {
		startTransition(async () => {
			try {
				const resp = await resetSalesStatAction(data?.id, data?.orderId);
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
	const [menuOpen, setMenuOpen] = useState(false);

	return (
		<Sheet.Portal>
			<SheetFooter className="flex-row justify-end gap-2 border-t bg-background p-4 md:p-6">
				<Button
					size="sm"
					onClick={(e) => {
						preview();
						return;
					}}
				>
					Preview
				</Button>
				<SalesMenu
					open={menuOpen}
					onOpenChange={setMenuOpen}
					id={data?.id}
					slug={data?.uuid}
					type={data?.type}
					customerId={data?.customerId}
					customerEmail={data?.email ?? null}
					customerPhone={data?.customerPhone}
					customerName={data?.displayName}
				>
					<SalesMenu.Share />
					<SalesMenu.SalesPrintMenuItems />
					<SalesMenu.Copy />
					<SalesMenu.Move />
					<SalesMenu.Separator />
					{data?.type === "quote" ? (
						<SalesMenu.QuoteEmailMenuItems />
					) : (
						<SalesMenu.SalesEmailMenuItems />
					)}
					<SalesMenu.Separator />
					<SalesMenu.Delete onDeleted={() => qs.close()} />
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
				</SalesMenu>
			</SheetFooter>
		</Sheet.Portal>
	);
}
