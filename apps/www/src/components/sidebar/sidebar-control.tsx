"use client";

import { Dot, PanelLeft } from "lucide-react";

import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@gnd/ui/dropdown-menu";
import {
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from "@gnd/ui/sidebar";
import { useSidebar, useSidebarState } from "./context";
import { getInitials } from "@/utils/format";
import { setSideMenuMode } from "@/actions/cookies/sidemenu";
import { cn } from "@gnd/ui/cn";

export function SidebarControl({}: {}) {
    const { isMobile } = useSidebar();
    const modes = ["Expanded", "Collapsed"];
    const { defaultOpen, state, setState, setDefaultOpen } = useSidebarState();
    return (
        <SidebarMenu>
            <SidebarMenuItem>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <SidebarMenuButton
                            size="lg"
                            className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground flex justify-center size-8"
                        >
                            {/* <Avatar className="h-8 w-8 rounded-lg">
                                <AvatarImage
                                    src={user.avatar}
                                    alt={user.name}
                                />
                                <AvatarFallback className="rounded-lg">
                                    {getInitials(user.name)}
                                </AvatarFallback>
                            </Avatar> */}
                            <PanelLeft className="size-6" />
                            {/* <ChevronsUpDown className="ml-auto size-4" /> */}
                        </SidebarMenuButton>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                        className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
                        side={isMobile ? "bottom" : "right"}
                        align="end"
                        sideOffset={4}
                    >
                        <DropdownMenuLabel className="font-normal">
                            Sidebar control
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {modes?.map((mode) => (
                            <DropdownMenuItem
                                onClick={(e) => {
                                    setSideMenuMode(mode?.toLocaleLowerCase());
                                    setState(mode?.toLocaleLowerCase() as any);
                                    setDefaultOpen(
                                        mode == "Expanded" ? true : false,
                                    );
                                }}
                                key={mode}
                            >
                                <Dot
                                    className={cn(
                                        "size-6 mr-2",
                                        state != mode?.toLocaleLowerCase() &&
                                            "text-transparent",
                                    )}
                                />
                                {mode}
                            </DropdownMenuItem>
                        ))}
                    </DropdownMenuContent>
                </DropdownMenu>
            </SidebarMenuItem>
        </SidebarMenu>
    );
}
