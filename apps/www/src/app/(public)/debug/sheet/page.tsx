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
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetFooter,
    SheetHeader,
    SheetTitle,
} from "@gnd/ui/sheet";

import { CustomSheetDebugModal } from "./custom-sheet";
import { Table, TableBody, TableCell, TableRow } from "@gnd/ui/table";
import { ScrollArea } from "@gnd/ui/scroll-area";

export default function Page({}) {
    return (
        <>
            <Sheet open>
                <SheetContent className="flex flex-col">
                    <SheetHeader>
                        <SheetTitle>Testbed</SheetTitle>
                        <SheetDescription>
                            Lorem ipsum dolor sit amet..
                        </SheetDescription>
                    </SheetHeader>
                    <ScrollArea className="flex-1 overflow-auto">
                        <Table>
                            <TableBody>
                                {[...Array(50)].map((a, i) => (
                                    <TableRow key={i}>
                                        <TableCell>{i}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </ScrollArea>
                    <SheetFooter>
                        <Button>Action</Button>
                    </SheetFooter>
                </SheetContent>
            </Sheet>
        </>
    );
}
