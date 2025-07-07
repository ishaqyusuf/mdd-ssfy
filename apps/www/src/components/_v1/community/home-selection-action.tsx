"use client";

import { deepCopy } from "@/lib/deep-copy";
import { openModal } from "@/lib/modal";
import { dispatchSlice } from "@/store/slicers";
import { Printer } from "lucide-react";

import { Button } from "@gnd/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from "@gnd/ui/dropdown-menu";

export function HomeBatchAction({ items }) {
    return (
        <>
            {/* <span>{JSON.stringify(items)}</span> */}

            <Button
                aria-label="Toggle columns"
                variant="default"
                size="icon"
                onClick={() => {
                    dispatchSlice("printHomes", {
                        homes: deepCopy(items),
                    });
                }}
                className="ml-auto hidden h-8 bg-rose-600 hover:bg-rose-700 lg:flex"
            >
                <Printer className=" h-4 w-4" />
                {/* View */}
            </Button>
            <Button
                onClick={() => {
                    openModal("activateProduction", items);
                }}
            >
                Send to Production
            </Button>
        </>
    );
}
