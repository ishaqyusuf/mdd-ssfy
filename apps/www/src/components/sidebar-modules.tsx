"use client";

import { ChevronsUpDown, LogOut } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@gnd/ui/avatar";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuShortcut,
    DropdownMenuTrigger,
} from "@gnd/ui/dropdown-menu";

import { getInitials } from "@/utils/format";
import Link from "@/components/link";
import { useAuth } from "@/hooks/use-auth";
import { useRef } from "react";
import { Button } from "@gnd/ui/button";
import { useSidebar } from "@/hooks/use-sidebar";
import { Icon } from "./_v1/icons";

export function SidebarModules() {
    const { isExpanded, isMobile, modules, currentModule } = useSidebar();
    const user = useAuth();
    const ref = useRef<HTMLDivElement>(null);
    // if (modules.length < 2) return null;

    return (
        <div className="relative h-[32px]" ref={ref}>
            <div className="fixed left-[19px] bottom-4 w-[32px] h-[32px]">
                <div className="relative w-[32px] h-[32px]"></div>
            </div>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button
                        size="lg"
                        variant="ghost"
                        className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                    >
                        <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary ">
                            <Icon
                                name={currentModule?.icon as any}
                                className="size-4 text-primary-foreground"
                            />
                        </div>
                        <div className="grid flex-1 text-left text-sm leading-tight">
                            <span className="truncate font-semibold">
                                {currentModule?.title}
                            </span>
                            <span className="truncate text-xs">
                                {currentModule?.subtitle}
                            </span>
                        </div>
                        {!isExpanded || (
                            <ChevronsUpDown className="ml-auto size-4" />
                        )}
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                    className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
                    side={isMobile ? "bottom" : "right"}
                    align="end"
                    sideOffset={4}
                >
                    <DropdownMenuLabel className="text-xs text-muted-foreground">
                        Modules
                    </DropdownMenuLabel>
                    {modules.map((team, index) => (
                        <DropdownMenuItem
                            asChild
                            key={team.name}
                            className="gap-2 p-2"
                        >
                            <Link href={team?.href}>
                                <div className="flex size-6 items-center justify-center rounded-sm border">
                                    <Icon
                                        name={team?.icon as any}
                                        className="size-4 shrink-0"
                                    />
                                </div>
                                {team.title}
                                <DropdownMenuShortcut>
                                    ⌘{index + 1}
                                </DropdownMenuShortcut>
                            </Link>
                        </DropdownMenuItem>
                    ))}
                    <DropdownMenuSeparator />
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    );
}

