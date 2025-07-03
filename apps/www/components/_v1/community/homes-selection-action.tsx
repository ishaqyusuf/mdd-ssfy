"use client";

import { deepCopy } from "@/lib/deep-copy";
import { dispatchSlice } from "@/store/slicers";
import { Printer } from "lucide-react";

import { Button } from "@gnd/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from "@gnd/ui/dropdown-menu";

export function HomesBatchAction({ items }) {
    return (
        <>
            {/* <span>{JSON.stringify(items)}</span> */}
            <Button
                aria-label="Toggle columns"
                variant="default"
                size="icon"
                onClick={() => {
                    dispatchSlice("printHomes", {
                        homes: items?.map((row) => deepCopy(row)),
                    });
                }}
                className="ml-auto hidden h-8 bg-rose-950 lg:flex"
            >
                <Printer className=" h-4 w-4" />
                {/* View */}
            </Button>
        </>
    );
}
