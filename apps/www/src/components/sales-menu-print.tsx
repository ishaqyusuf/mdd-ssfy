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

import {
    printOrder,
    printOrderWithPacking,
    printPackingSlip,
    printProduction,
    printQuote,
} from "@/lib/quick-print";
import { DropdownMenu } from "@gnd/ui/namespace";
import type { PrintMode } from "@gnd/sales/print/types";

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
                    void PRINT_ACTIONS[mode]({ salesIds, v2: true });
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
                    onSelect={(e) => {
                        e.preventDefault();
                        void PRINT_ACTIONS[mode]({ salesIds, v2: true });
                    }}
                >
                    <Icons.Printer className="mr-2 size-4 text-muted-foreground/70" />
                    Print
                </DropdownMenu.Item>
                <DropdownMenu.Item
                    disabled={isDisabled}
                    onSelect={(e) => {
                        e.preventDefault();
                        void PRINT_ACTIONS[mode]({ salesIds, v2: true });
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

const PRINT_ACTIONS = {
    invoice: printOrder,
    "order-packing": printOrderWithPacking,
    "packing-slip": printPackingSlip,
    production: printProduction,
    quote: printQuote,
} satisfies Record<
    PrintMode,
    (args: { salesIds: number[]; dispatchId?: number | null; v2?: boolean }) => Promise<void>
>;

const ORDER_MODES: { label: string; mode: OrderPrintMode }[] = [
    { label: "Order & Packing", mode: "order-packing" },
    { label: "Order", mode: "invoice" },
    { label: "Packing", mode: "packing-slip" },
    { label: "Production", mode: "production" },
];

const ORDER_MODE_ACTIONS = {
    "order-packing": printOrderWithPacking,
    invoice: printOrder,
    "packing-slip": printPackingSlip,
    production: printProduction,
} satisfies Record<
    OrderPrintMode,
    (args: { salesIds: number[]; dispatchId?: number | null; v2?: boolean }) => Promise<void>
>;

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
                    void printQuote({ salesIds, v2: true });
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
                        onSelect={(e) => {
                            e.preventDefault();
                            void ORDER_MODE_ACTIONS[mode]({ salesIds, v2: true });
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
