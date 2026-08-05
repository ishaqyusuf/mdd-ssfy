"use client";

import { buildSalesInventoryPrintViewerUrl } from "@/modules/sales-print/application/inventory-print-request";
import { Button } from "@gnd/ui/button";
import { Icons } from "@gnd/ui/icons";
import { motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

import type { InventoryBackorderRow } from "./columns";
import { getInventoryBackorderRowId } from "./columns";
import { useInventoryBackordersTableStore } from "./store";

export function BottomBar({ data }: { data: InventoryBackorderRow[] }) {
	const [mounted, setMounted] = useState(false);
	const { rowSelection, setRowSelection } = useInventoryBackordersTableStore();
	const selectedRows = useMemo(
		() => data.filter((item) => rowSelection[getInventoryBackorderRowId(item)]),
		[data, rowSelection],
	);
	const salesOrderIds = useMemo(
		() =>
			Array.from(
				new Set(
					selectedRows.flatMap((item) =>
						item.salesOrderId ? [item.salesOrderId] : [],
					),
				),
			),
		[selectedRows],
	);

	useEffect(() => setMounted(true), []);
	if (!mounted || selectedRows.length === 0) return null;

	return createPortal(
		<motion.div
			className="pointer-events-none fixed bottom-6 left-0 right-0 z-50 flex h-12 justify-center"
			initial={{ y: 100 }}
			animate={{ y: 0 }}
		>
			<div className="pointer-events-auto flex h-12 min-w-[360px] items-center gap-3 rounded-md border bg-background/90 px-3 shadow-lg backdrop-blur">
				<span className="mr-auto text-sm">{selectedRows.length} selected</span>
				<Button
					type="button"
					size="sm"
					variant="outline"
					disabled={salesOrderIds.length === 0}
					onClick={() => {
						window.open(
							buildSalesInventoryPrintViewerUrl({
								salesIds: salesOrderIds,
								mode: "packing-slip",
							}),
							"_blank",
							"noopener,noreferrer",
						);
					}}
				>
					<Icons.FileText className="mr-2 size-4" />
					Print selected
				</Button>
				<Button
					type="button"
					size="sm"
					variant="ghost"
					onClick={() => setRowSelection({})}
				>
					Deselect
				</Button>
			</div>
		</motion.div>,
		document.body,
	);
}
