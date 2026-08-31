"use client";

import { SalesMenu } from "@/components/sales-menu";
import { Button } from "@gnd/ui/button";
import { Icons } from "@gnd/ui/icons";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

import type { DispatchBacklogRow } from "./columns";

export function BottomBar({
	rows,
	onDeselect,
}: {
	rows: DispatchBacklogRow[];
	onDeselect: () => void;
}) {
	const [mounted, setMounted] = useState(false);
	useEffect(() => setMounted(true), []);
	if (!mounted || !rows.length) return null;

	const salesRefs = rows.map((row) => ({
		orderNo: row.orderId,
		salesId: row.id,
		salesType: "order" as const,
	}));

	return createPortal(
		<motion.div
			className="pointer-events-none fixed inset-x-0 bottom-6 z-50 flex justify-center px-3"
			initial={{ y: 100 }}
			animate={{ y: 0 }}
			exit={{ y: 100 }}
		>
			<div className="pointer-events-auto flex h-12 w-[calc(100vw-1.5rem)] max-w-[520px] items-center justify-between gap-3 bg-[rgba(247,247,247,0.88)] px-3 backdrop-blur-lg dark:bg-[rgba(19,19,19,0.76)]">
				<span className="shrink-0 text-sm">{rows.length} selected</span>
				<div className="flex items-center gap-2">
					<Button variant="ghost" onClick={onDeselect}>
						Deselect all
					</Button>
					<SalesMenu
						type="order"
						salesIds={salesRefs.map((sale) => sale.salesId)}
						salesRefs={salesRefs}
						trigger={
							<Button variant="ghost">
								<Icons.CheckCheck className="mr-2 size-4" />
								Mark as
								<Icons.ChevronDown className="ml-1 size-3.5" />
							</Button>
						}
					>
						<SalesMenu.MarkAs
							asSubmenu={false}
							onStatusActionSettled={onDeselect}
						/>
					</SalesMenu>
				</div>
			</div>
		</motion.div>,
		document.body,
	);
}
