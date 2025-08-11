"use client";
import { cn } from "@gnd/ui/cn";
import { useState, useRef, useEffect } from "react";
import { Icons } from "./_v1/icons";
import { MainMenu, MainMenuContext } from "./main-menu";
import Link from "next/link";

export function Sidebar({}) {
    const [isExpanded, setIsExpanded] = useState(false);
    const mainMenuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!isExpanded && mainMenuRef.current) {
            mainMenuRef.current.scrollTop = 0;
        }
    }, [isExpanded]);
    return (
        <aside
            className={cn(
                "h-screen flex-shrink-0 flex-col desktop:overflow-hidden desktop:rounded-tl-[10px] desktop:rounded-bl-[10px] justify-between fixed top-0 pb-4 items-center hidden md:flex z-50 transition-all duration-200 ease-[cubic-bezier(0.4,0,0.2,1)]",
                "bg-background border-r border-border",
                isExpanded ? "w-[240px]" : "w-[70px]",
            )}
            onMouseEnter={() => setIsExpanded(true)}
            onMouseLeave={() => setIsExpanded(false)}
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
                    )}
                >
                    {isExpanded ? <Icons.LogoLg /> : <Icons.Logo />}
                    {/* <div className="flex">
                         <Icons.logoLg width={100} />
                     </div> */}
                </Link>
            </div>

            <div
                ref={mainMenuRef}
                className="flex flex-col overflow-y-auto scrollbar-hide w-full pt-[70px] flex-1"
            >
                <MainMenuContext isExpanded={isExpanded} />
            </div>

            {/* <TeamDropdown isExpanded={isExpanded} /> */}
        </aside>
    );
}

