"use client";

import { Icons } from "@gnd/ui/icons";

import { Button } from "@gnd/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from "@gnd/ui/dropdown-menu";

export function SalesBatchAction({ items }) {
    return (
        <>
            {/* <span>{JSON.stringify(items)}</span> */}
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button
                        aria-label="Toggle columns"
                        variant="default"
                        size="icon"
                        className="ml-auto hidden h-8 bg-rose-600 lg:flex"
                    >
                        <Icons.Printer className=" h-4 w-4" />
                        {/* View */}
                    </Button>
                </DropdownMenuTrigger>
            </DropdownMenu>
        </>
    );
}
