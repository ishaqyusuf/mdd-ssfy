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

const moduleVariants = cva("", {
    variants: {},
    defaultVariants: {},
});
const linksVariant = cva("", {
    variants: {
        renderMode: {
            suppressed: "",
            default: "",
            none: "",
        },
    },
    defaultVariants: {
        renderMode: "default",
    },
});
const sectionLabel = cva("", {
    variants: {
        renderMode: {
            suppressed: "",
            default: "hidden",
            none: "",
        },
    },
    defaultVariants: {
        renderMode: "default",
    },
});
const sectionGroup = cva("", {
    variants: {
        renderMode: {
            suppressed: "",
            default: "hidden",
            none: "",
        },
    },
    defaultVariants: {
        renderMode: "default",
    },
});
export function SideMenu({}) {
    const sb = useSidebar();
    const { renderMode, activeLink } = sb;
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
                                >
                                    <SidebarGroupLabel
                                        className={
                                            cn(
                                                activeLink?.module !=
                                                    module.name &&
                                                    sectionLabel({
                                                        renderMode,
                                                    }),
                                            )
                                            // !mod?.isCurrentModule &&
                                            //     sectionLabel({
                                            //         renderMode,
                                            //     }),
                                        }
                                    >
                                        {section?.title}
                                    </SidebarGroupLabel>
                                    <SidebarMenu>
                                        {section?.links
                                            ?.filter((l) => l?.show)
                                            ?.map((link, li) => (
                                                <Fragment key={li}></Fragment>
                                            ))}
                                    </SidebarMenu>
                                </SidebarGroup>
                            ))}
                        </Fragment>
                    ))}
            </SidebarContent>
        </Sidebar>
    );
}
