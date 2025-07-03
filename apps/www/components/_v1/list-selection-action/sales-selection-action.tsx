"use client";

import { Printer } from "lucide-react";

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
                        <Printer className=" h-4 w-4" />
                        {/* View */}
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                
            </DropdownMenu>
        </>
    );
}
