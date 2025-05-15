import { Fragment, useEffect, useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";

import { cn } from "@gnd/ui/cn";
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@gnd/ui/collapsible";
import {
    Sidebar,
    SidebarContent,
    SidebarGroup,
    SidebarGroupLabel,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuBadge,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarMenuSub,
    SidebarMenuSubButton,
    SidebarMenuSubItem,
} from "@gnd/ui/sidebar";

import { IconKeys, Icons } from "../_v1/icons";
import {
    SideBarLinkProvider,
    SideBarModuleProvider,
    SideBarSectionProvider,
    useSidebar,
    useSidebarLink,
    useSidebarModule,
    useSidebarSection,
} from "./context";
import { ModuleSwitcher } from "./module-switcher";
import { useSidebarStore } from "./store";
import { cva } from "class-variance-authority";

export function SideMenu({}) {
    const sb = useSidebar();
    return (
        <Sidebar collapsible="icon" className="bg-white">
            <SidebarContent className="">
                {sb?.linkModules?.modules
                    ?.filter((a) => a.activeLinkCount)
                    .map((module, mi) => (
                        <Fragment key={mi}>
                            {module?.sections?.map((section, si) => (
                                <SidebarGroup
                                    key={si}
                                    className={cn(
                                        !section?.linksCount && "hidden",
                                    )}
                                ></SidebarGroup>
                            ))}
                        </Fragment>
                    ))}
            </SidebarContent>
        </Sidebar>
    );
}
