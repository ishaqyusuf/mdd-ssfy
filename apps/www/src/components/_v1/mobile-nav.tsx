"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icons } from "@/components/_v1/icons";
import { ISidebar } from "@/lib/navs";
import { cn } from "@/lib/utils";

import { Button } from "@gnd/ui/button";
import { ScrollArea } from "@gnd/ui/scroll-area";
import { Sheet, SheetContent, SheetTrigger } from "@gnd/ui/sheet";

import SiteNav from "./layouts/site-nav";

interface MobileNavProps {
    //   mainNavItems?: MainNavItem[]
    //   sidebarNavItems: SidebarNavItem[]
    nav: ISidebar;
}

export function MobileNav({ nav }: MobileNavProps) {
    const pathname = usePathname();
    const [isOpen, setIsOpen] = React.useState(false);

    return (
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
                <Button
                    variant="ghost"
                    className="mr-2 px-0 text-base hover:bg-transparent focus-visible:bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 lg:hidden"
                >
                    <Icons.menu className="h-6 w-6" />
                    <span className="sr-only">Toggle Menu</span>
                </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-56 pl-1 pr-0">
                <ScrollArea className="h-[calc(100vh-2rem)] ">
                    <div className="pl-1 ">
                        <SiteNav
                            nav={nav}
                            mobile
                            onClick={() => setIsOpen(false)}
                        />
                    </div>
                </ScrollArea>
            </SheetContent>
        </Sheet>
    );
}

interface MobileLinkProps {
    children?: React.ReactNode;
    href: string;
    disabled?: boolean;
    pathname: string;
    setIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

function MobileLink({
    children,
    href,
    disabled,
    pathname,
    setIsOpen,
}: MobileLinkProps) {
    return (
        <Link
            href={href}
            className={cn(
                "text-foreground/70 transition-colors hover:text-foreground",
                pathname === href && "text-foreground",
                disabled && "pointer-events-none opacity-60",
            )}
            onClick={() => setIsOpen(false)}
        >
            {children}
        </Link>
    );
}
