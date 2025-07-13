import Link from "@/components/link";
import { Icons } from "@/components/_v1/icons";
import { cn } from "@/lib/utils";
import { MenuIcon } from "lucide-react";

import { Button } from "@gnd/ui/button";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@gnd/ui/sheet";

import { siteNavStore } from "../site-nav/store";
import Menu from "./menu";

export function SheetMenu() {
    const store = siteNavStore();
    // const sidebar = useStore(useSidebarToggle, (state) => state);
    return (
        <Sheet>
            <SheetTrigger className="lg:hidden" asChild>
                <Button className="h-8" variant="outline" size="icon">
                    <MenuIcon size={20} />
                </Button>
            </SheetTrigger>
            <SheetContent
                className="flex h-full flex-col px-3 sm:w-72"
                side="left"
                aria-describedby={undefined}
            >
                <SheetHeader>
                    <SheetTitle className="w-full" asChild>
                        <Button
                            className={cn(
                                "mb-1 transition-transform duration-300 ease-in-out",
                                store?.sideNavOpened === false
                                    ? "translate-x-1"
                                    : "translate-x-0",
                            )}
                            variant="ghost"
                            asChild
                        >
                            <Link
                                href="/dashboard"
                                className="flex items-center gap-2"
                            >
                                {!store?.sideNavOpened ? (
                                    <Icons.logo />
                                ) : (
                                    <Icons.logoLg />
                                )}
                            </Link>
                        </Button>
                    </SheetTitle>
                </SheetHeader>
                <Menu isOpen />
            </SheetContent>
        </Sheet>
    );
}
