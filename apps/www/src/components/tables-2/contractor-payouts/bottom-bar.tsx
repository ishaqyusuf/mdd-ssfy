"use client";

import { printContractorPayoutReport } from "@/lib/job-print";
import { Button } from "@gnd/ui/button";
import { Icons } from "@gnd/ui/icons";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

import type { ContractorPayoutRow } from "./columns";
import { useContractorPayoutsTableStore } from "./store";

type Props = {
	data: ContractorPayoutRow[];
};

export function BottomBar({ data }: Props) {
	const [mounted, setMounted] = useState(false);
	const { rowSelection, setRowSelection } = useContractorPayoutsTableStore();
	const selectedIds = data
		.filter((item) => rowSelection[String(item.id)])
		.map((item) => item.id);
	const selectedCount = selectedIds.length;

	useEffect(() => {
		setMounted(true);
	}, []);

	if (!mounted || !selectedCount) {
		return null;
	}

	return createPortal(
		<motion.div
			className="pointer-events-none fixed bottom-6 left-0 right-0 z-50 flex h-12 justify-center"
			initial={{ y: 100 }}
			animate={{ y: 0 }}
			exit={{ y: 100 }}
			transition={{ duration: 0.2, ease: "easeOut" }}
		>
			<div className="pointer-events-auto relative h-12 max-w-[calc(100vw-1rem)] overflow-x-auto scrollbar-hide sm:min-w-[360px]">
				<motion.div
					className="absolute inset-0 bg-[rgba(247,247,247,0.85)] backdrop-blur-lg backdrop-filter dark:bg-[rgba(19,19,19,0.7)]"
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					exit={{ opacity: 0 }}
					transition={{ duration: 0.15 }}
				/>
				<div className="relative flex h-12 min-w-max items-center justify-between gap-3 pl-4 pr-2">
					<span className="text-sm">{selectedCount} selected</span>
					<div className="flex items-center gap-1">
						<Button
							variant="ghost"
							className="rounded-none"
							onClick={() =>
								printContractorPayoutReport({
									paymentIds: selectedIds,
								})
							}
						>
							<Icons.Printer size={12} className="mr-1" />
							Print Report
						</Button>
						<Button
							variant="ghost"
							className="text-muted-foreground"
							onClick={() => setRowSelection({})}
						>
							<span>Deselect all</span>
						</Button>
					</div>
				</div>
			</div>
		</motion.div>,
		document.body,
	);
}
