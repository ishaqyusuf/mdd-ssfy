"use client";

import { SalesMenu } from "@/components/sales-menu";
import { SalesPaymentNotificationsMenu } from "@/components/sales-payment-notifications-menu";
import { SalesPaymentProcessor } from "@/components/widgets/sales-payment-processor/sales-payment-processor";
import { useAuth } from "@/hooks/use-auth";
import { useSalesOrdersV2FilterParams } from "@/hooks/use-sales-orders-v2-filter-params";
import { useSalesOrdersStore } from "@/store/sales-orders";
import { useTRPC } from "@/trpc/client";
import { Button } from "@gnd/ui/button";
import { ConfirmBtn } from "@gnd/ui/custom/confirm-button";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@gnd/ui/dialog";
import { Icons } from "@gnd/ui/icons";
import { useMutation, useQueryClient } from "@gnd/ui/tanstack";
import { toast } from "@gnd/ui/use-toast";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { SalesOrder } from "./columns";

type Props = {
	data: SalesOrder[];
};

export function BottomBar({ data }: Props) {
	const [mounted, setMounted] = useState(false);
	const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);
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
		pipelineRevision: order.pipeline?.revision,
	}));
	const orderIds = selectedOrders.map((order) => order.orderId);
	const firstOrder = selectedOrders[0];
	const selectedCount = selectedOrders.length;
	const isPaymentReviewMode = filters.paymentReview === "needs_review";
	const isArchivedMode = filters.archiveScope === "archived";
	const selectedOrdersWithActiveOperationalWork = selectedOrders.filter(
		(order) => order.status !== "fulfilled" && order.status !== "cancelled",
	);
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
				setRowSelection({});
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
				queryEventScope: {
					sales: salesRefs,
				},
			},
		}),
	);
	const setArchived = useMutation(
		trpc.sales.setSalesOrdersArchived.mutationOptions({
			onSuccess(result) {
				setArchiveDialogOpen(false);
				const changedIds = new Set(result.changed);
				const changedOrderUuids = new Set(
					selectedOrders
						.filter((order) => changedIds.has(order.id))
						.map((order) => order.uuid),
				);
				setRowSelection(
					Object.fromEntries(
						Object.entries(rowSelection).filter(
							([uuid]) => !changedOrderUuids.has(uuid),
						),
					),
				);
				toast({
					duration: 2000,
					variant: "success",
					title: isArchivedMode ? "Orders restored" : "Orders archived",
					description: result.changed.length
						? `${result.changed.length} changed${result.skipped.length ? `; ${result.skipped.length} skipped.` : "."}`
						: `No orders changed${result.skipped.length ? `; ${result.skipped.length} skipped.` : "."}`,
				});
			},
			onError(error) {
				toast({
					duration: 3000,
					variant: "error",
					title: "Orders not updated",
					description: error.message || "Unable to update the selected orders.",
				});
			},
			meta: {
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
			<Dialog open={archiveDialogOpen} onOpenChange={setArchiveDialogOpen}>
				<DialogContent className="sm:max-w-md">
					<DialogHeader>
						<DialogTitle>
							{isArchivedMode
								? "Restore selected orders"
								: "Archive selected orders"}
						</DialogTitle>
					</DialogHeader>
					<p className="text-sm text-muted-foreground">
						{isArchivedMode
							? `This returns ${selectedCount} selected order${selectedCount === 1 ? "" : "s"} to the default Sales Orders workspace.`
							: selectedOrdersWithActiveOperationalWork.length
								? `${selectedOrdersWithActiveOperationalWork.length} selected order${selectedOrdersWithActiveOperationalWork.length === 1 ? " still has" : "s still have"} active operational work. Archiving only hides the selected orders from the default Sales Orders workspace; it does not stop operational work or change the Sales Bin.`
								: `This hides ${selectedCount} selected order${selectedCount === 1 ? "" : "s"} from the default Sales Orders workspace without changing the Sales Bin or operational status.`}
					</p>
					<DialogFooter>
						<Button
							type="button"
							variant="outline"
							onClick={() => setArchiveDialogOpen(false)}
						>
							Cancel
						</Button>
						<Button
							type="button"
							disabled={setArchived.isPending}
							onClick={() =>
								setArchived.mutate({
									salesIds,
									archived: !isArchivedMode,
								})
							}
						>
							{isArchivedMode ? "Restore orders" : "Archive orders"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
			<motion.div
				className="pointer-events-none fixed bottom-6 left-0 right-0 z-50 flex h-12 justify-center"
				initial={{ y: 100 }}
				animate={{ y: 0 }}
				exit={{ y: 100 }}
				transition={{ duration: 0.2, ease: "easeOut" }}
			>
				<div className="pointer-events-auto relative h-12 max-w-[calc(100vw-1rem)] overflow-x-auto scrollbar-hide sm:min-w-[400px]">
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
									onPaymentReviewed={() => setRowSelection({})}
									onStatusActionSettled={() => setRowSelection({})}
									statusCandidates={statusCandidates}
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

							{auth.can.editOrders ? (
								<Button
									variant="ghost"
									disabled={!salesIds.length || setArchived.isPending}
									onClick={() => setArchiveDialogOpen(true)}
								>
									<Icons.Archive className="mr-2 size-4" />
									{isArchivedMode ? "Restore active" : "Archive"}
								</Button>
							) : null}

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
