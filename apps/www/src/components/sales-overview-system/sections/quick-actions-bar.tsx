"use client";

import { useTransition } from "react";

import { resetSalesStatAction } from "@/actions/reset-sales-stat";
import { SalesMenu } from "@/components/sales-menu";
import { useAuth } from "@/hooks/use-auth";
import { useSalesPreview } from "@/hooks/use-sales-preview";
import { openLink } from "@/lib/open-link";
import { salesFormUrl } from "@/utils/sales-utils";

import { Button } from "@gnd/ui/button";
import { cn } from "@gnd/ui/cn";
import { Icons } from "@gnd/ui/icons";
import { toast } from "sonner";

import { AuthGuard } from "@/components/auth-guard";
import { SendForPackingButton } from "@/components/sales/send-for-packing-button";
import { _perm } from "@/components/sidebar-links";
import { useSalesOverviewSystem } from "../provider";

const actionButtonClass =
	"h-9 min-w-[7.5rem] flex-1 items-center justify-center gap-2";

export function QuickActionsBar() {
	const {
		state: { data, isQuote },
	} = useSalesOverviewSystem();
	const sPreview = useSalesPreview();
	const auth = useAuth();
	const [loading, startTransition] = useTransition();
	const canSendForPacking =
		auth.can?.editOrders &&
		auth.roleTitle?.toLowerCase() === "super admin" &&
		!isQuote;

	if (!data?.id) return null;

	function preview() {
		void sPreview.preview(data?.id, data?.type, {
			customerEmail: data?.email,
			customerName: data?.displayName,
		});
	}

	function reset() {
		startTransition(async () => {
			try {
				await resetSalesStatAction(data?.id, data?.orderId);
				toast.success("Reset complete");
			} catch {
				toast.error("Unable to complete");
			}
		});
	}

	return (
		<div className="flex flex-wrap gap-2">
			{canSendForPacking ? (
				<SendForPackingButton
					salesId={data.id}
					orderNo={data.orderId}
					className={actionButtonClass}
					variant="outline"
				/>
			) : null}
			<Button
				onClick={preview}
				size="sm"
				variant="default"
				className={cn(actionButtonClass, "hover:bg-secondary")}
			>
				<Icons.Eye className="size-3.5" />
				<span>Preview</span>
			</Button>
			<Button
				size="sm"
				variant="secondary"
				className={cn(actionButtonClass, "hover:bg-secondary")}
				onClick={() => {
					openLink(
						salesFormUrl(data.type, data.orderId, data.isDyke),
						{},
						true,
					);
				}}
			>
				<Icons.Edit className="size-3.5" />
				<span>Edit</span>
			</Button>
			<SalesMenu
				triggerVariant="secondary"
				trigger={
					<Button
						type="button"
						size="sm"
						variant="secondary"
						className={actionButtonClass}
					>
						<Icons.Menu className="size-3.5" />
						<span>More</span>
					</Button>
				}
				id={data.id}
				slug={data.uuid}
				type={data.type}
				customerEmail={data.email ?? null}
				customerName={data.displayName}
			>
				{isQuote ? (
					<SalesMenu.QuoteEmailMenuItems />
				) : (
					<>
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
										{ salesNo: data.orderId },
										true,
									);
								}}
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
