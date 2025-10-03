"use client";
import { cn } from "@gnd/ui/cn";
import { Icons } from "./_v1/icons";
import Link from "next/link";
import { SidebarNavUser } from "./sidebar-nav-user";
import { useSidebar } from "@/hooks/use-sidebar";
import { MainMenu } from "./main-menu";
import { SidebarModules } from "./sidebar-modules";

export function Sidebar({}) {
    const ctx = useSidebar();
    const { isExpanded, setIsExpanded, mainMenuRef, linkModules } = ctx;
    if (linkModules?.noSidebar) return null;
    return (
        <aside
            className={cn(
                "h-screen flex-shrink-0 flex-col desktop:overflow-hidden desktop:rounded-tl-[10px] desktop:rounded-bl-[10px] justify-between fixed top-0 pb-4 items-center hidden md:flex z-50 transition-all duration-200 ease-[cubic-bezier(0.4,0,0.2,1)]",
                "bg-background border-r border-border",
                isExpanded ? "w-[240px]" : "w-[70px]",
            )}
        >
            <div
                className={cn(
                    "absolute top-0 left-0 h-[70px] flex items-center justify-center bg-background border-b border-border transition-all duration-200 ease-[cubic-bezier(0.4,0,0.2,1)] z-10",
                    isExpanded ? "w-full justify-starts" : "w-[69px]",
                )}
            >
                <Link
                    href="/"
                    className={cn(
                        "absolute left-[8px] transition-none",
                        isExpanded && "left-[16px]s  ",
                        process.env.NODE_ENV == "production" || "grayscale",
                    )}
                >
                    {isExpanded ? <Icons.LogoLg /> : <Icons.Logo />}
                    {/* <div className="flex">
                         <Icons.logoLg width={100} />
                     </div> */}
                </Link>
            </div>
            <div className="pt-[75px] flex w-full">
                <SidebarModules />
            </div>
            <div
                ref={mainMenuRef}
                onMouseEnter={() => setIsExpanded(true)}
                onMouseLeave={() => setIsExpanded(false)}
                className="flex flex-col overflow-y-auto scrollbar-hide w-full pb-[100px] flex-1"
            >
                <MainMenu />
            </div>
            <SidebarNavUser />
            {/* <TeamDropdown isExpanded={isExpanded} /> */}
        </aside>
    );
}

