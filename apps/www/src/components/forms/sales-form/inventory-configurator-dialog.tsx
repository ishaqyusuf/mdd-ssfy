"use client";

import { SalesOverviewInventoryContent } from "@/components/sales-overview-system/tabs/inventory-tab";
import { Button } from "@gnd/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@gnd/ui/dialog";
import { useCallback, useRef, useState } from "react";

type InventoryConfiguratorDialogProps = {
	open: boolean;
	salesOrderId: number | null;
	onOpenChange: (open: boolean) => void;
};

export function InventoryConfiguratorDialog({
	open,
	salesOrderId,
	onOpenChange,
}: InventoryConfiguratorDialogProps) {
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="flex max-h-[88vh] max-w-5xl flex-col gap-0 p-0">
				<DialogHeader className="border-b px-5 py-4">
					<DialogTitle>Configure inventory</DialogTitle>
					<DialogDescription>
						Review stock rows, create inbound stock, allocate available stock,
						and adjust inventory tracking before leaving the saved order.
					</DialogDescription>
				</DialogHeader>
				<div className="min-h-0 flex-1 overflow-y-auto p-5">
					{open ? (
						<SalesOverviewInventoryContent salesOrderId={salesOrderId} />
					) : null}
				</div>
				<DialogFooter className="border-t px-5 py-3">
					<Button type="button" onClick={() => onOpenChange(false)}>
						Done
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

export function useSalesInventoryConfiguratorPrompt() {
	const [open, setOpen] = useState(false);
	const [salesOrderId, setSalesOrderId] = useState<number | null>(null);
	const resolverRef = useRef<(() => void) | null>(null);

	const closeConfigurator = useCallback(() => {
		const resolve = resolverRef.current;
		resolverRef.current = null;
		setOpen(false);
		resolve?.();
	}, []);

	const openSalesInventoryConfigurator = useCallback(
		(nextSalesOrderId?: number | null) => {
			const normalizedSalesOrderId = Number(nextSalesOrderId || 0);
			if (!normalizedSalesOrderId) {
				return Promise.resolve();
			}

			setSalesOrderId(normalizedSalesOrderId);
			setOpen(true);
			return new Promise<void>((resolve) => {
				resolverRef.current = resolve;
			});
		},
		[],
	);

	return {
		inventoryConfiguratorDialog: (
			<InventoryConfiguratorDialog
				open={open}
				salesOrderId={salesOrderId}
				onOpenChange={(nextOpen) => {
					if (!nextOpen) closeConfigurator();
					else setOpen(true);
				}}
			/>
		),
		openSalesInventoryConfigurator,
	};
}
