"use client";

import { getSalesArchiveCandidates } from "@/components/sales-archive-menu";
import { salesBatchDeleteActivity } from "@/lib/table-row-activity/sales-outcomes";
import { isRowActivityBusy } from "@/store/table-row-activity";

import { SalesMenu } from "@/components/sales-menu";
import { SalesPaymentNotificationsMenu } from "@/components/sales-payment-notifications-menu";
import { SalesPaymentProcessor } from "@/components/widgets/sales-payment-processor/sales-payment-processor";
import { useAuth } from "@/hooks/use-auth";
import { useSalesOrdersV2FilterParams } from "@/hooks/use-sales-orders-v2-filter-params";
import { useSalesOrdersStore } from "@/store/sales-orders";
import { useTRPC } from "@/trpc/client";
import { Button } from "@gnd/ui/button";
import { ConfirmBtn } from "@gnd/ui/custom/confirm-button";
import { Icons } from "@gnd/ui/icons";
import { useMutation, useQueryClient } from "@gnd/ui/tanstack";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { SalesOrder } from "./columns";

type Props = {
	data: SalesOrder[];
	busy?: boolean;
};

export function BottomBar({ data, busy }: Props) {
	const [mounted, setMounted] = useState(false);
	const trpc = useTRPC();
	const queryClient = useQueryClient();
	const auth = useAuth();
	const { filters } = useSalesOrdersV2FilterParams();
	const { rowSelection, setRowSelection } = useSalesOrdersStore();
	const selectedOrders = data.filter((order) => rowSelection[order.uuid]);
	const salesIds = selectedOrders.map((order) => order.id);
	const salesRefs = selectedOrders.map((order) => ({
		orderNo: order.orderId,
		salesId: order.id,
		salesType: "order" as const,
	}));
	const statusCandidates = selectedOrders.map((order) => ({
		salesId: order.id,
		status: order.status,
		pipeline: order.pipeline,
		pipelineRevision: order.pipeline?.revision,
	}));
	const orderIds = selectedOrders.map((order) => order.orderId);
	const firstOrder = selectedOrders[0];
	const selectedCount = selectedOrders.length;
	const isPaymentReviewMode = filters.paymentReview === "needs_review";
	const customerPhone =
		firstOrder?.customerPhone && firstOrder.customerPhone !== "-"
			? firstOrder.customerPhone
			: null;
	const accountNo =
		firstOrder?.accountNo ||
		customerPhone ||
		(firstOrder?.customerId ? `cust-${firstOrder.customerId}` : null);

	const deleteMutation = useMutation(
		trpc.sales.deleteSalesByOrderIds.mutationOptions({
			async onSuccess() {
				await Promise.all([
					queryClient.invalidateQueries({
						queryKey: trpc.sales.getOrders.infiniteQueryKey(),
					}),
					queryClient.invalidateQueries({
						queryKey: trpc.sales.getOrdersSummary.queryKey(),
					}),
				]);
			},
			meta: {
				rowActivity: salesBatchDeleteActivity(String(auth.id ?? ""), salesRefs),
				queryEventScope: {
					sales: salesRefs,
				},
			},
		}),
	);

	useEffect(() => {
		setMounted(true);
	}, []);

	if (!mounted) {
		return null;
	}

	if (!selectedCount) {
		return null;
	}

	return createPortal(
		<>
			<motion.div
				className="pointer-events-none fixed bottom-6 left-0 right-0 z-50 flex h-12 justify-center"
				initial={{ y: 100 }}
				animate={{ y: 0 }}
				exit={{ y: 100 }}
				transition={{ duration: 0.2, ease: "easeOut" }}
			>
				<div
					inert={busy || undefined}
					aria-busy={busy || undefined}
					onClickCapture={(event) => {
						if (
							isRowActivityBusy(String(auth.id ?? ""), "sales-orders", salesIds)
						) {
							event.preventDefault();
							event.stopPropagation();
						}
					}}
					onKeyDownCapture={(event) => {
						if (
							(event.key === "Enter" || event.key === " ") &&
							isRowActivityBusy(String(auth.id ?? ""), "sales-orders", salesIds)
						) {
							event.preventDefault();
							event.stopPropagation();
						}
					}}
					className="pointer-events-auto relative h-12 max-w-[calc(100vw-1rem)] overflow-x-auto scrollbar-hide sm:min-w-[400px]"
				>
					<motion.div
						className="absolute inset-0 bg-[rgba(247,247,247,0.85)] backdrop-blur-lg backdrop-filter dark:bg-[rgba(19,19,19,0.7)]"
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						transition={{ duration: 0.15 }}
					/>
					<div className="relative flex h-12 min-w-max items-center justify-between gap-6 pl-4 pr-2">
						<span className="text-sm">{selectedCount} selected</span>

						<div className="flex items-center space-x-2">
							<Button
								variant="ghost"
								className="text-muted-foreground"
								onClick={() => setRowSelection({})}
							>
								<span>Deselect all</span>
							</Button>

							<SalesMenu
								type="order"
								salesIds={salesIds}
								salesRefs={salesRefs}
								trigger={
									<Button variant="ghost" disabled={!salesIds.length}>
										<Icons.print className="mr-2 size-4" />
										Print
									</Button>
								}
							>
								<SalesMenu.SalesPrintMenuItems />
							</SalesMenu>

							<SalesMenu
								type="order"
								salesIds={salesIds}
								salesRefs={salesRefs}
								trigger={
									<Button variant="ghost" disabled={!salesIds.length}>
										<Icons.CheckCheck className="mr-2 size-4" />
										Mark as
										<Icons.ChevronDown className="ml-1 size-3.5" />
									</Button>
								}
							>
								<SalesMenu.MarkAs
									asSubmenu={false}
									includePaymentReviewed={isPaymentReviewMode}
									statusCandidates={statusCandidates}
 archiveOrders={getSalesArchiveCandidates(selectedOrders.map(order => ({salesId:order.id,orderNo:order.orderId,archivedAt:order.archivedAt,pipeline:order.pipeline})))}
 onArchived={ids => {
  const changed = new Set(ids);
  const changedUuids = new Set(selectedOrders.filter(order => changed.has(order.id)).map(order => order.uuid));
  setRowSelection(Object.fromEntries(Object.entries(rowSelection).filter(([uuid]) => !changedUuids.has(uuid))));
 }}
								/>
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
								sale={
									firstOrder
										? {
												id: firstOrder.id,
												due: firstOrder.due,
												email: firstOrder.email,
											}
										: undefined
								}
							/>

							<SalesPaymentProcessor
								phoneNo={accountNo ?? ""}
								selectedIds={salesIds}
								customerId={firstOrder?.customerId ?? undefined}
								disabled={!accountNo || !salesIds.length}
							>
								<Button
									variant="ghost"
									disabled={!accountNo || !salesIds.length}
								>
									<Icons.payment className="mr-2 size-4" />
									Pay
								</Button>
							</SalesPaymentProcessor>

							<ConfirmBtn
								variant="ghost"
								trash
								className="text-red-600"
								disabled={!orderIds.length || deleteMutation.isPending}
								isDeleting={deleteMutation.isPending}
								onClick={async () => {
									await deleteMutation.mutateAsync({
										orderIds,
									});
								}}
							>
								Delete
							</ConfirmBtn>
						</div>
					</div>
				</div>
			</motion.div>
		</>,
		document.body,
	);
}
