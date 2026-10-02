"use client";

import { useInventoryStockParams } from "@/hooks/use-inventory-stock-params";
import { useIsMobile } from "@/hooks/use-mobile";
import { Drawer, DrawerContent } from "@gnd/ui/drawer";
import { Sheet, SheetContent } from "@gnd/ui/sheet";
import { useRef } from "react";
import { WorkflowStockContent } from "./content";
import { WorkflowStockProvider, type WorkflowStockSheetProps } from "./context";
import { WorkflowStockSheetHeader } from "./sheet-header";

export function WorkflowStockSheet(props: WorkflowStockSheetProps) {
	const { stockOperation } = useInventoryStockParams();
	const isMobile = useIsMobile();
	const adjustmentTarget = useRef<string | null>(null);
	const focusContent = (event: Event) => {
		event.preventDefault();
		requestAnimationFrame(() => {
			const target = adjustmentTarget.current;
			const button = target
				? document.querySelector<HTMLElement>(
						`[data-workflow-stock-adjust-target="${target}"] button`,
					)
				: null;
			(
				button ||
				document.querySelector<HTMLElement>("[data-workflow-stock-close]")
			)?.focus();
			adjustmentTarget.current = null;
		});
	};
	const onOpenChange = (open: boolean) => {
		if (!open && stockOperation !== "adjust") props.onClose();
	};
	const content = (
		<>
			<WorkflowStockSheetHeader isMobile={isMobile} />
			<div
				className="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-[max(1rem,env(safe-area-inset-bottom))]"
				onClickCapture={(event) => {
					if (
						event.target instanceof Element &&
						event.target.closest('button[aria-label="Adjust stock"]')
					)
						adjustmentTarget.current =
							event.target
								.closest("[data-workflow-stock-adjust-target]")
								?.getAttribute("data-workflow-stock-adjust-target") || null;
				}}
			>
				<WorkflowStockContent />
			</div>
		</>
	);
	return (
		<WorkflowStockProvider {...props}>
			{isMobile ? (
				<Drawer
					open={stockOperation !== "adjust"}
					shouldScaleBackground={false}
					onOpenChange={onOpenChange}
				>
					<DrawerContent
						className="max-h-[88dvh] sm:mx-auto sm:max-w-xl [&>div:first-child]:mt-2 [&>div:first-child]:h-1 [&>div:first-child]:w-8"
						onCloseAutoFocus={(event) => event.preventDefault()}
						onOpenAutoFocus={focusContent}
					>
						{content}
					</DrawerContent>
				</Drawer>
			) : (
				<Sheet open={stockOperation !== "adjust"} onOpenChange={onOpenChange}>
					<SheetContent
						side="right"
						hideClose
						className="flex w-full flex-col gap-0 p-0 sm:max-w-[520px]"
						onOpenAutoFocus={focusContent}
						onCloseAutoFocus={(event) => event.preventDefault()}
					>
						{content}
					</SheetContent>
				</Sheet>
			)}
		</WorkflowStockProvider>
	);
}
