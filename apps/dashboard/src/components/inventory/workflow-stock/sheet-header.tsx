"use client";

import { Button } from "@gnd/ui/button";
import { DrawerDescription, DrawerTitle } from "@gnd/ui/drawer";
import { SheetDescription, SheetTitle } from "@gnd/ui/sheet";
import { ArrowLeft, X } from "lucide-react";
import { useWorkflowStock } from "./context";

export function WorkflowStockSheetHeader({ isMobile }: { isMobile: boolean }) {
	const stock = useWorkflowStock();
	const Title = isMobile ? DrawerTitle : SheetTitle;
	const Description = isMobile ? DrawerDescription : SheetDescription;
	return (
		<header className="flex shrink-0 items-center gap-2 border-b px-4 py-3 text-left">
			{stock.selectedUid ? (
				<Button
					type="button"
					variant="ghost"
					size="icon"
					className="size-11 shrink-0"
					aria-label="Back to inventory overview"
					onClick={stock.back}
				>
					<ArrowLeft className="size-4" />
				</Button>
			) : null}
			<div className="min-w-0 flex-1 space-y-1">
				<Title className="text-base">
					{stock.selectedUid ? "Inventory information" : "Inventory overview"}
				</Title>
				<Description className="break-words text-xs">
					{stock.selected?.title || stock.stepTitle}
				</Description>
			</div>
			<Button
				type="button"
				variant="ghost"
				size="icon"
				className="size-11 shrink-0"
				aria-label="Close inventory overview"
				data-workflow-stock-close
				onClick={stock.onClose}
			>
				<X className="size-4" />
			</Button>
		</header>
	);
}
