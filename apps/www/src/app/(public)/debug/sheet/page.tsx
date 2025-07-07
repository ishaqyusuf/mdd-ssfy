"use client";

import { useState } from "react";
import { _modal } from "@/components/common/modal/provider";

import { Button } from "@gnd/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSub,
    DropdownMenuSubContent,
    DropdownMenuSubTrigger,
    DropdownMenuTrigger,
} from "@gnd/ui/dropdown-menu";
import { Input } from "@gnd/ui/input";
// import { Menu } from "@/components/(clean-code)/menu";
import { Sheet, SheetContent, SheetHeader } from "@gnd/ui/sheet";

import { CustomSheetDebugModal } from "./custom-sheet";

export default function Page({}) {
    const [open, menuOpenChange] = useState(false);
    return (
        <>
            <Button
                onClick={() => {
                    _modal.openModal(<CustomSheetDebugModal />);
                }}
            >
                Open Custom
            </Button>
            <Sheet>
                <SheetContent side="bottomRight">
                    <SheetHeader>Test</SheetHeader>
                    <div className="">
                        {open || "CLOSED"}
                        <DropdownMenu open={open} onOpenChange={menuOpenChange}>
                            <DropdownMenuTrigger>Menu</DropdownMenuTrigger>
                            <DropdownMenuContent>
                                <Input />
                                <DropdownMenuItem>Item 1</DropdownMenuItem>
                                <DropdownMenuItem>Item 2</DropdownMenuItem>
                                <DropdownMenuSub>
                                    <DropdownMenuSubTrigger>
                                        Item 3
                                    </DropdownMenuSubTrigger>
                                    <DropdownMenuSubContent>
                                        <DropdownMenuItem>
                                            Sub Item 1
                                        </DropdownMenuItem>
                                        <DropdownMenuItem>
                                            Sub Item 2
                                        </DropdownMenuItem>
                                    </DropdownMenuSubContent>
                                </DropdownMenuSub>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </SheetContent>
            </Sheet>
        </>
    );
}
