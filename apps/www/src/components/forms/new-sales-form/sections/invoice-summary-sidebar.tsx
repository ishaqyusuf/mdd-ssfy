"use client";

import { Button } from "@gnd/ui/button";
import { X, Building2 } from "lucide-react";
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
                    className="fixed inset-0 z-30 bg-background/70 backdrop-blur-[1px] xl:hidden"
                    onClick={props.onClose}
                />
            ) : null}

            <aside
                className={`fixed inset-y-0 right-0 z-40 w-full max-w-[420px] border-l bg-card shadow-2xl transition-transform duration-300 xl:static xl:z-auto xl:flex xl:h-full xl:w-[420px] xl:max-w-none xl:translate-x-0 xl:border-l xl:shadow-none ${
                    props.mobileOpen ? "translate-x-0" : "translate-x-full xl:translate-x-0"
                }`}
            >
                <div className="flex h-full flex-col">
                    <div className="flex items-center border-b px-4 py-3">
                        <div className="flex items-center gap-2">
                            <Building2 className="size-5 text-primary" />
                            <h3 className="text-xl font-bold leading-tight tracking-tight text-foreground">
                                Invoice Summary
                            </h3>
                        </div>
                        <div className="ml-auto flex items-center gap-2">
                            <Button
                                size="icon"
                                variant="ghost"
                                className="xl:hidden"
                                onClick={props.onClose}
                            >
                                <X className="size-4" />
                            </Button>
                        </div>
                    </div>

                    <div className="flex-1 overflow-auto p-4">
                        <InvoiceOverviewPanel />
                    </div>
                </div>
            </aside>
        </>
    );
}
