"use client";

import { Button } from "@gnd/ui/button";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

import type { SalesResolutionRow } from "./columns";
import { useSalesResolutionTableStore } from "./store";

type Props = {
	data: SalesResolutionRow[];
};

export function BottomBar({ data }: Props) {
	const [mounted, setMounted] = useState(false);
	const { rowSelection, setRowSelection } = useSalesResolutionTableStore();
	const selectedCount = data.filter(
		(item) => rowSelection[String(item.id)],
	).length;

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
			<div className="pointer-events-auto relative h-12 max-w-[calc(100vw-1rem)] overflow-x-auto scrollbar-hide sm:min-w-[300px]">
				<motion.div
					className="absolute inset-0 bg-[rgba(247,247,247,0.85)] backdrop-blur-lg backdrop-filter dark:bg-[rgba(19,19,19,0.7)]"
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					exit={{ opacity: 0 }}
					transition={{ duration: 0.15 }}
				/>
				<div className="relative flex h-12 min-w-max items-center justify-between gap-6 pl-4 pr-2">
					<span className="text-sm">{selectedCount} selected</span>

					<Button
						variant="ghost"
						className="text-muted-foreground"
						onClick={() => setRowSelection({})}
					>
						<span>Deselect all</span>
					</Button>
				</div>
			</div>
		</motion.div>,
		document.body,
	);
}
