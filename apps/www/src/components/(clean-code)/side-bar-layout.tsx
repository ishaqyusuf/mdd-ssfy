"use client";

import React, { useMemo } from "react";
import { redirect, usePathname } from "next/navigation";
import { getMenuList } from "@/app/(clean-code)/_common/utils/get-menu-list";
import { useSidebarToggle } from "@/app/(clean-code)/(sales)/_common/hooks/use-sidebar-toggle";
import { useStore } from "@/app/(clean-code)/(sales)/_common/hooks/use-store";
import { cn, sum } from "@/lib/utils";
import { useSession } from "next-auth/react";

import { Sidebar } from "./nav/sidebar";

export default function SidebarLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const sidebar = useStore(useSidebarToggle, (state) => state);
    const { data: session } = useSession({
        required: true,
        onUnauthenticated() {
            redirect("/login");
        },
    });
    const pathname = usePathname();
    const menuList = useMemo(() => {
        const ml = getMenuList(pathname, session);

        return {
            menuList: ml,
            hideMenu:
                sum(
                    ml.map((a) => a.menus?.filter((b) => b?.visible)?.length),
                ) == 0,
        };
    }, [pathname, session]);
    if (!session?.user) return <></>;
    if (!sidebar) return null;

    return (
        <>
            {menuList?.hideMenu || <Sidebar />}
            {/* min-h-[calc(100vh_-_56px)] with footer */}
            <main
                className={cn(
                    "min-h-[calc(100vh)] bg-zinc-50 transition-[margin-left] duration-300 ease-in-out dark:bg-zinc-900",
                    menuList?.hideMenu
                        ? ""
                        : sidebar?.isOpen === false
                          ? "lg:ml-[90px]"
                          : "lg:ml-72",
                )}
            >
                {children}
            </main>
        </>
    );
}
