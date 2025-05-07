import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { ChevronsUpDown } from "lucide-react";

import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuShortcut,
    DropdownMenuTrigger,
} from "@gnd/ui/dropdown-menu";
import {
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from "@gnd/ui/sidebar";

import { Icon } from "../_v1/icons";
import { useSidebar } from "./context";
import { useSidebarStore } from "./store";

export function ModuleSwitcher() {
    const sb = useSidebar();
    const store = useSidebarStore();
    const { isMobile } = sb;
    const route = useRouter();
    function switchModule(moduleName) {
        const links = Object.values(store.links);
        const link = links
            .sort((a, b) => a.globalIndex - b.globalIndex)
            // .filter((a) => a.visible)
            .find((a) => a.moduleName == moduleName);
        console.log({ link, moduleName, links });
        route?.push(link?.url);
    }
    const { modules, currentModule } = useMemo(() => {
        const modules = Object.values(store?.siteModules ?? {}).filter(
            // (module) => module.visible,
            Boolean,
        );
        const currentModule = modules.find(
            (module) => module?.name == store.activeModule,
            // Object.entries(store?.links ?? {}).some(([key, link]) => {
            //   return link.moduleName === module.name && link.visible;
            // }),
        );
        return {
            modules,
            currentModule,
        };
    }, [store]);

    if (!modules?.length) return null;
    return (
        <SidebarMenu>
            <SidebarMenuItem>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <SidebarMenuButton
                            size="lg"
                            className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground border"
                        >
                            <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                                <Icon
                                    name={currentModule?.icon as any}
                                    className="size-6"
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
                            <ChevronsUpDown className="ml-auto" />
                        </SidebarMenuButton>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                        className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
                        align="start"
                        side={isMobile ? "bottom" : "right"}
                        sideOffset={4}
                    >
                        <DropdownMenuLabel className="text-xs text-muted-foreground">
                            Modules
                        </DropdownMenuLabel>
                        {modules.map((team, index) => (
                            <DropdownMenuItem
                                onClick={(e) => {
                                    switchModule(team.name);
                                }}
                                key={team.name}
                                // onClick={() => setActiveTeam(team)}
                                className="gap-2 p-2"
                            >
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
                            </DropdownMenuItem>
                        ))}
                        <DropdownMenuSeparator />
                    </DropdownMenuContent>
                </DropdownMenu>
            </SidebarMenuItem>
        </SidebarMenu>
    );
}
