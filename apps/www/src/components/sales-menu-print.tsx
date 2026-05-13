"use client";

import { Icons } from "@gnd/ui/icons";

/**
 * SalesMenuPrint — standalone print/PDF menu component.
 *
 * Drop this anywhere you need a print or PDF action for one or more sales.
 * Does NOT modify the existing <SalesMenu> compound component.
 *
 * Usage:
 *   <SalesMenuPrint salesIds={[123]} mode="invoice" />
 *   <SalesMenuPrint salesIds={[123]} mode="quote" showPdf />
 */

import { useSalesPrintController } from "@/modules/sales-print/application/use-sales-print-controller";
import type { PrintMode } from "@gnd/sales/print/types";
import { DropdownMenu } from "@gnd/ui/namespace";
import { useRef } from "react";

interface SalesMenuPrintProps {
	salesIds: number[];
	/** Which print mode to use. Defaults to "invoice". */
	mode?: PrintMode;
	/** When true, also show a PDF sub-option that opens the v2 PDF viewer. */
	showPdf?: boolean;
	disabled?: boolean;
}

/**
 * A minimal, self-contained print-action component.
 * Generates a signed token and opens the v2 sales print page.
 */
export function SalesMenuPrint({
	salesIds,
	mode = "invoice",
	showPdf = true,
	disabled = false,
}: SalesMenuPrintProps) {
	const salesPrint = useSalesPrintController();
	const isDisabled =
		disabled ||
		!salesIds.length ||
		salesPrint.isPrinting ||
		salesPrint.isDownloading;
	const shiftClickRef = useRef(false);
	const captureShiftClick = (event: { shiftKey: boolean }) => {
		shiftClickRef.current = event.shiftKey;
	};
	const consumeShiftClick = () => {
		const openInNewTab = shiftClickRef.current;
		shiftClickRef.current = false;
		return openInNewTab;
	};

	if (!showPdf) {
		return (
			<DropdownMenu.Item
				disabled={isDisabled}
				onPointerDown={captureShiftClick}
				onSelect={(e) => {
					e.preventDefault();
					void salesPrint.print({
						salesIds,
						mode,
						openInNewTab: consumeShiftClick(),
					});
				}}
			>
				<Icons.Printer className="mr-2 size-4 text-muted-foreground/70" />
				Print
			</DropdownMenu.Item>
		);
	}

	return (
		<DropdownMenu.Sub>
			<DropdownMenu.SubTrigger disabled={isDisabled}>
				<Icons.Printer className="mr-2 size-4 text-muted-foreground/70" />
				Print
			</DropdownMenu.SubTrigger>
			<DropdownMenu.SubContent>
				<DropdownMenu.Item
					disabled={isDisabled}
					onPointerDown={captureShiftClick}
					onSelect={(e) => {
						e.preventDefault();
						void salesPrint.print({
							salesIds,
							mode,
							openInNewTab: consumeShiftClick(),
						});
					}}
				>
					<Icons.Printer className="mr-2 size-4 text-muted-foreground/70" />
					Print
				</DropdownMenu.Item>
				<DropdownMenu.Item
					disabled={isDisabled}
					onSelect={(e) => {
						e.preventDefault();
						void salesPrint.downloadPdf({ salesIds, mode });
					}}
				>
					<Icons.FileText className="mr-2 size-4 text-muted-foreground/70" />
					PDF
				</DropdownMenu.Item>
			</DropdownMenu.SubContent>
		</DropdownMenu.Sub>
	);
}

interface SalesMenuPrintModesProps {
	salesIds: number[];
	/** Sales type — determines which modes to show */
	salesType?: "order" | "quote";
	disabled?: boolean;
}

function V2Badge() {
	return (
		<span className="ml-auto rounded border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
			v2
		</span>
	);
}

type OrderPrintMode = Exclude<PrintMode, "quote">;

const ORDER_MODES: { label: string; mode: OrderPrintMode }[] = [
	{ label: "Order & Packing", mode: "order-packing" },
	{ label: "Order", mode: "invoice" },
	{ label: "Packing", mode: "packing-slip" },
	{ label: "Production", mode: "production" },
];

/**
 * A print sub-menu that exposes all print modes for an order.
 * For quotes, shows a single "Quote" option.
 */
export function SalesMenuPrintModes({
	salesIds,
	salesType = "order",
	disabled = false,
}: SalesMenuPrintModesProps) {
	const salesPrint = useSalesPrintController();
	const isDisabled = disabled || !salesIds.length || salesPrint.isPrinting;
	const shiftClickRef = useRef(false);
	const captureShiftClick = (event: { shiftKey: boolean }) => {
		shiftClickRef.current = event.shiftKey;
	};
	const consumeShiftClick = () => {
		const openInNewTab = shiftClickRef.current;
		shiftClickRef.current = false;
		return openInNewTab;
	};

	if (salesType === "quote") {
		return (
			<DropdownMenu.Item
				disabled={isDisabled}
				onPointerDown={captureShiftClick}
				onSelect={(e) => {
					e.preventDefault();
					void salesPrint.print({
						salesIds,
						mode: "quote",
						openInNewTab: consumeShiftClick(),
						salesType: "quote",
					});
				}}
			>
				<Icons.Printer className="mr-2 size-4 text-muted-foreground/70" />
				Print
				<V2Badge />
			</DropdownMenu.Item>
		);
	}

	return (
		<DropdownMenu.Sub>
			<DropdownMenu.SubTrigger disabled={isDisabled}>
				<Icons.Printer className="mr-2 size-4 text-muted-foreground/70" />
				Print
				<V2Badge />
			</DropdownMenu.SubTrigger>
			<DropdownMenu.SubContent>
				{ORDER_MODES.map(({ label, mode }) => (
					<DropdownMenu.Item
						key={mode}
						disabled={isDisabled}
						onPointerDown={captureShiftClick}
						onSelect={(e) => {
							e.preventDefault();
							void salesPrint.print({
								salesIds,
								mode,
								openInNewTab: consumeShiftClick(),
								salesType: "order",
							});
						}}
					>
						<Icons.Printer className="mr-2 size-4 text-muted-foreground/70" />
						{label}
					</DropdownMenu.Item>
				))}
			</DropdownMenu.SubContent>
		</DropdownMenu.Sub>
	);
}
