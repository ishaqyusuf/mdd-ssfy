"use client";

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

import { quickPrint } from "@/lib/quick-print";
import { DropdownMenu } from "@gnd/ui/namespace";
import type { PrintMode } from "@gnd/sales/print/types";
import { FileText, Printer } from "lucide-react";

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
    const isDisabled = disabled || !salesIds.length;

    if (!showPdf) {
        return (
            <DropdownMenu.Item
                disabled={isDisabled}
                onSelect={(e) => {
                    e.preventDefault();
                    void quickPrint({ salesIds, mode, v2: true });
                }}
            >
                <Printer className="mr-2 size-4 text-muted-foreground/70" />
                Print
            </DropdownMenu.Item>
        );
    }

    return (
        <DropdownMenu.Sub>
            <DropdownMenu.SubTrigger disabled={isDisabled}>
                <Printer className="mr-2 size-4 text-muted-foreground/70" />
                Print
            </DropdownMenu.SubTrigger>
            <DropdownMenu.SubContent>
                <DropdownMenu.Item
                    disabled={isDisabled}
                    onSelect={(e) => {
                        e.preventDefault();
                        void quickPrint({ salesIds, mode, v2: true });
                    }}
                >
                    <Printer className="mr-2 size-4 text-muted-foreground/70" />
                    Print
                </DropdownMenu.Item>
                <DropdownMenu.Item
                    disabled={isDisabled}
                    onSelect={(e) => {
                        e.preventDefault();
                        void quickPrint({ salesIds, mode, v2: true });
                    }}
                >
                    <FileText className="mr-2 size-4 text-muted-foreground/70" />
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

const ORDER_MODES: { label: string; mode: PrintMode }[] = [
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
    const isDisabled = disabled || !salesIds.length;

    if (salesType === "quote") {
        return (
            <DropdownMenu.Item
                disabled={isDisabled}
                onSelect={(e) => {
                    e.preventDefault();
                    void quickPrint({ salesIds, mode: "quote", v2: true });
                }}
            >
                <Printer className="mr-2 size-4 text-muted-foreground/70" />
                Print
            </DropdownMenu.Item>
        );
    }

    return (
        <DropdownMenu.Sub>
            <DropdownMenu.SubTrigger disabled={isDisabled}>
                <Printer className="mr-2 size-4 text-muted-foreground/70" />
                Print
            </DropdownMenu.SubTrigger>
            <DropdownMenu.SubContent>
                {ORDER_MODES.map(({ label, mode }) => (
                    <DropdownMenu.Item
                        key={mode}
                        disabled={isDisabled}
                        onSelect={(e) => {
                            e.preventDefault();
                            void quickPrint({ salesIds, mode, v2: true });
                        }}
                    >
                        <Printer className="mr-2 size-4 text-muted-foreground/70" />
                        {label}
                    </DropdownMenu.Item>
                ))}
            </DropdownMenu.SubContent>
        </DropdownMenu.Sub>
    );
}
