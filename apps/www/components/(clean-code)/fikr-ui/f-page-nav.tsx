"use client";

import { Icons } from "@/components/_v1/icons";
import { createPortal } from "react-dom";

import { Button } from "@gnd/ui/button";
import { DropdownMenu, DropdownMenuTrigger } from "@gnd/ui/dropdown-menu";

export default function FPageNav({ children }) {
    const Element = document?.getElementById("headerNav");
    if (!Element) return;
    return createPortal(
        <DropdownMenu>
            <DropdownMenuTrigger>
                <Button size="icon" className="h-6 w-6" variant="outline">
                    <Icons.more className="size-4" />
                </Button>
            </DropdownMenuTrigger>
        </DropdownMenu>,
        Element,
    ) as any;
}
