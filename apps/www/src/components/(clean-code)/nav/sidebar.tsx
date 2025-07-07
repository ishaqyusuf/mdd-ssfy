import Link from "next/link";
import { useSidebarToggle } from "@/app/(clean-code)/(sales)/_common/hooks/use-sidebar-toggle";
import { useStore } from "@/app/(clean-code)/(sales)/_common/hooks/use-store";
import { Icons } from "@/components/_v1/icons";
import { cn } from "@/lib/utils";

import { Button } from "@gnd/ui/button";

import Menu from "./menu";
import { SidebarToggle } from "./sidebar-toggle";

export function Sidebar() {
    const sidebar = useStore(useSidebarToggle, (state) => state);
    if (!sidebar) return null;

    return (
        <aside
            className={cn(
                "fixed left-0 top-0 z-20 h-screen -translate-x-full transition-[width] duration-300 ease-in-out lg:translate-x-0",
                sidebar?.isOpen === false ? "w-[90px]" : "w-72",
            )}
        >
            <SidebarToggle
                isOpen={sidebar?.isOpen}
                setIsOpen={sidebar?.setIsOpen}
            />
            <div className="relative flex h-full flex-col overflow-y-auto px-3 py-4 shadow-md dark:shadow-zinc-800">
                <Button
                    className={cn(
                        "mb-1 transition-transform duration-300 ease-in-out",
                        sidebar?.isOpen === false
                            ? "translate-x-1"
                            : "translate-x-0",
                    )}
                    variant="ghost"
                    asChild
                >
                    <Link href="/dashboard" className="flex items-center gap-2">
                        {!sidebar?.isOpen ? <Icons.Logo /> : <Icons.LogoLg />}
                    </Link>
                </Button>
                <Menu isOpen={sidebar?.isOpen} />
            </div>
        </aside>
    );
}
