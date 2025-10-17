"use client";

import { Button } from "@gnd/ui/button";

export function EmptyState() {
    return (
        <div className="mt-16 flex h-full flex-col items-center justify-center space-y-4 text-center">
            <p className="text-sm text-[#606060]">
                No invoices created yet.
                <br />
                Create an invoice to get started.
            </p>

            <Button
                variant="outline"
                //   onClick={() =>
                //     setParams({ type: "create" })}
            >
                Create invoice
            </Button>
        </div>
    );
}

