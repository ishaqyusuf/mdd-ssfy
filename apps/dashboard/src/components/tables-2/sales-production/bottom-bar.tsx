"use client";

import { SalesMenu } from "@/components/sales-menu";
import { Button } from "@gnd/ui/button";
import { Icons } from "@gnd/ui/icons";
import { motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

import type { SalesProductionRow } from "./columns";
import { getSalesProductionRowId } from "./columns";
import { useSalesProductionTableStore } from "./store";

type Props = {
	data: SalesProductionRow[];
};

export function BottomBar({ data }: Props) {
	const [mounted, setMounted] = useState(false);
	const { rowSelection, setRowSelection } = useSalesProductionTableStore();
	const selectedOrders = useMemo(
		() => data.filter((order) => rowSelection[getSalesProductionRowId(order)]),
		[data, rowSelection],
	);
	const salesIds = selectedOrders.map((order) => order.id);
	const salesRefs = selectedOrders.map((order) => ({
		orderNo: order.orderId,
		salesId: order.id,
		salesType: "order" as const,
	}));
	const statusCandidates = selectedOrders.map((order) => ({
		salesId: order.id,
		status: order.lifecycleStatus,
		productionCompleted: order.completed,
	}));

	useEffect(() => {
		setMounted(true);
	}, []);

	if (!mounted || selectedOrders.length === 0) return null;

	return createPortal(
		<motion.div
			className="pointer-events-none fixed bottom-6 left-0 right-0 z-50 flex h-12 justify-center px-2"
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
					<span className="text-sm">{selectedOrders.length} selected</span>

					<div className="flex items-center space-x-2">
						<Button
							variant="ghost"
							className="text-muted-foreground"
							onClick={() => setRowSelection({})}
						>
							Deselect all
						</Button>

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
								onStatusActionSettled={() => setRowSelection({})}
								statusCandidates={statusCandidates}
							/>
						</SalesMenu>
					</div>
				</div>
			</div>
		</motion.div>,
		document.body,
	);
}
