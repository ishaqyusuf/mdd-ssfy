"use client";

import { useState } from "react";
import { MainMenu } from "./main-menu";
import { Sheet, SheetContent } from "@gnd/ui/sheet";
import { Button } from "@gnd/ui/button";
import { Icons } from "./_v1/icons";
import { SidebarProvider } from "@/hooks/use-sidebar";

export function MobileMenu() {
    const [isOpen, setOpen] = useState(false);

    return (
        <Sheet open={isOpen} onOpenChange={setOpen}>
            <div>
                <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setOpen(true)}
                    className="rounded-full w-8 h-8 items-center relative flex md:hidden"
                >
                    <Icons.Menu size={16} />
                </Button>
            </div>
            <SheetContent
                side="left"
                className="border-none rounded-none -ml-4"
            >
                <div className="ml-2 mb-8">
                    <Icons.Logo />
                </div>

                <div className="-ml-2">
                    <SidebarProvider
                        args={[
                            {
                                onSelect: () => setOpen(false),
                                mobile: true,
                            },
                        ]}
                    >
                        <MainMenu />
                    </SidebarProvider>
                </div>
            </SheetContent>
        </Sheet>
    );
}

