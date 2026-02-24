"use client";

import { Button } from "@gnd/ui/button";
import { X, Receipt } from "lucide-react";
import { SummaryPanel } from "./summary-panel";
import { InvoiceOverviewPanel } from "./invoice-overview-panel";

interface Props {
    mobileOpen: boolean;
    onClose: () => void;
}

export function InvoiceSummarySidebar(props: Props) {
    return (
        <>
            {props.mobileOpen ? (
                <div
                    className="fixed inset-0 z-30 bg-background/70 backdrop-blur-[1px] lg:hidden"
                    onClick={props.onClose}
                />
            ) : null}

            <aside
                className={`fixed inset-y-0 right-0 z-40 w-full max-w-[420px] border-l bg-card shadow-2xl transition-transform duration-300 lg:static lg:z-auto lg:flex lg:h-full lg:w-[420px] lg:max-w-none lg:translate-x-0 lg:border-l lg:shadow-none ${
                    props.mobileOpen ? "translate-x-0" : "translate-x-full lg:translate-x-0"
                }`}
            >
                <div className="flex h-full flex-col">
                    <div className="flex items-center border-b px-4 py-3">
                        <div className="flex items-center gap-2">
                            <Receipt className="size-4 text-primary" />
                            <h3 className="text-sm font-semibold uppercase tracking-wide text-foreground">
                                Invoice Summary
                            </h3>
                        </div>
                        <div className="ml-auto flex items-center gap-2">
                            <Button
                                size="icon"
                                variant="ghost"
                                className="lg:hidden"
                                onClick={props.onClose}
                            >
                                <X className="size-4" />
                            </Button>
                        </div>
                    </div>

                    <div className="flex-1 space-y-4 overflow-auto p-4">
                        <SummaryPanel />
                        <InvoiceOverviewPanel />
                    </div>
                </div>
            </aside>
        </>
    );
}
