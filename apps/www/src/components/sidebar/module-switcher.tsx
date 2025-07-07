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
import Link from "next/link";

export function ModuleSwitcher() {
    const sb = useSidebar();
    const store = useSidebarStore();
    const { isMobile } = sb;
    const route = useRouter();

    const { modules, currentModule } = useMemo(() => {
        const modules = sb?.linkModules?.modules
            ?.filter((a) => a.activeLinkCount && a?.name)
            .map((module) => {
                const prim = module?.sections
                    ?.map((a) => a.links?.filter((l) => l.show))
                    ?.flat()
                    ?.sort((a, b) => a.globalIndex - b.globalIndex)?.[0];
                const href =
                    module.defaultLink ||
                    prim?.href ||
                    prim?.subLinks?.filter((a) => a.show)?.[0]?.href;
                return {
                    ...module,
                    href,
                };
            });
        const currentModule = modules.find(
            (m) => m.name == sb?.activeLink?.module,
        );

        return {
            modules,
            currentModule,
        };
    }, [sb.linkModules, sb.activeLink]);

    if (modules?.length < 2) return null;
    return (
        <SidebarMenu>
            <SidebarMenuItem>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <SidebarMenuButton
                            size="lg"
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
            </SidebarMenuItem>
        </SidebarMenu>
    );
}
