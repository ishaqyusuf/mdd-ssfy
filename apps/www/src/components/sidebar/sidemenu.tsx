import { Fragment } from "react";
import Link from "@/components/link";
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
    SidebarFooter,
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

import { Icon, Icons } from "../_v1/icons";
import { useSidebar, useSidebarState } from "./context";
import { cva } from "class-variance-authority";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from "@gnd/ui/dropdown-menu";
import { ModuleSwitcher } from "./module-switcher";
import { SidebarNavUser } from "./sidebar-nav-user";
import { SidebarControl } from "./sidebar-control";

const moduleVariants = cva("", {
    variants: {
        renderMode: {
            suppressed: "",
            default: "",
            none: "",
        },
        isCurrent: {
            true: "",
            false: "",
        },
        moduleType: {
            global: "",
            module: "",
        },
    },
    compoundVariants: [
        {
            renderMode: "default",
            isCurrent: false,
            className: "hidden",
            moduleType: "module",
        },
    ],
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
            none: "hidden",
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
    const { setDefaultOpen, defaultOpen } = useSidebarState();

    const { renderMode, activeLink } = sb;
    return (
        <Sidebar collapsible="icon" className="">
            <SidebarHeader className="bg-white">
                <ModuleSwitcher />
                {sb.state == "expanded" ? (
                    <div className="flex">
                        <Icons.logoLg width={100} />
                    </div>
                ) : (
                    <Icons.logo />
                )}
            </SidebarHeader>
            <SidebarContent
                onMouseEnter={() => setDefaultOpen(true)}
                onMouseLeave={() => setDefaultOpen(false)}
                className="bg-white"
            >
                {sb?.linkModules?.modules
                    ?.filter((a) => a.activeLinkCount)
                    .map((module, mi) => (
                        <Fragment key={mi}>
                            {module?.sections?.map((section, si) => (
                                <SidebarGroup
                                    key={si}
                                    className={cn(
                                        !section?.linksCount && "hidden",
                                        moduleVariants({
                                            isCurrent:
                                                activeLink?.module ==
                                                module?.name,
                                            renderMode,
                                            moduleType: module?.name
                                                ? "module"
                                                : "global",
                                        }),
                                    )}
                                >
                                    {renderMode != "default" &&
                                    si > 0 ? null : (
                                        <SidebarGroupLabel
                                            className={cn(
                                                "uppercase",
                                                activeLink?.module !=
                                                    module.name &&
                                                    sectionLabel({
                                                        renderMode,
                                                    }),
                                                !section?.title &&
                                                    !section?.name &&
                                                    (si > 0 || !module?.name) &&
                                                    "hidden",
                                                renderMode != "default" &&
                                                    si > 0 &&
                                                    "hidden",
                                            )}
                                        >
                                            {si == 0 && renderMode != "default"
                                                ? module.name
                                                : section?.title ||
                                                  section.name}
                                        </SidebarGroupLabel>
                                    )}
                                    <SidebarMenu>
                                        {section?.links
                                            ?.filter((l) => l?.show)
                                            ?.map((link, li) => (
                                                <Fragment key={li}>
                                                    {/* {link?.subLinks?.length ? } */}
                                                    <MenuItem
                                                        link={link}
                                                        key={li}
                                                        module={module}
                                                    />
                                                </Fragment>
                                            ))}
                                    </SidebarMenu>
                                </SidebarGroup>
                            ))}
                        </Fragment>
                    ))}
            </SidebarContent>
            <SidebarFooter className="bg-white">
                <SidebarControl />
                <SidebarNavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
function MenuItem({ link: _link, module }) {
    const sb = useSidebar();
    const { renderMode, activeLink } = sb;
    const link =
        _link as (typeof sb.linkModules)["modules"][number]["sections"][number]["links"][number];
    const isCurrentModule = module?.name == activeLink?.module;
    const isActiveLink = isCurrentModule && activeLink?.name == link.name;
    const subLinks = link?.subLinks;
    const View =
        sb.state == "collapsed"
            ? {
                  Base: DropdownMenu,
                  Trigger: DropdownMenuTrigger,
                  Content: DropdownMenuContent,
              }
            : {
                  Base: Collapsible,
                  Trigger: CollapsibleTrigger,
                  Content: CollapsibleContent,
              };
    return subLinks?.length ? (
        <View.Base className="group/collapsible" asChild defaultOpen={false}>
            <SidebarMenuItem>
                <View.Trigger asChild>
                    <SidebarMenuButton
                        className={cn(isCurrentModule || "hidden")}
                        tooltip={link.title}
                    >
                        {!link.icon || (
                            <Icon name={link.icon} className="mr-2 h-4 w-4" />
                        )}
                        <span>{link.title}</span>
                        <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                    </SidebarMenuButton>
                </View.Trigger>
                <View.Content>
                    <SidebarMenuSub>
                        {subLinks
                            // ?.filter((a) => a.custom)
                            .map((subItem) => (
                                <SidebarMenuSubItem key={subItem.title}>
                                    <SidebarMenuSubButton asChild>
                                        <Link href={subItem.href || ""}>
                                            <span>{subItem.title}</span>
                                        </Link>
                                    </SidebarMenuSubButton>
                                </SidebarMenuSubItem>
                            ))}
                    </SidebarMenuSub>
                </View.Content>
            </SidebarMenuItem>
        </View.Base>
    ) : (
        <SidebarMenuItem>
            <SidebarMenuButton
                asChild
                variant="outline"
                className={cn(
                    isActiveLink &&
                        "bg-destructive text-destructive-foreground",
                )}
            >
                <Link href={link.href || ""}>
                    {!link.icon || (
                        <Icon
                            name={link.icon}
                            className={cn(
                                "mr-2 h-4 w-4",
                                isActiveLink && "text-destructive-foreground",
                            )}
                        />
                    )}
                    <span>{link.title}</span>
                </Link>
                {/* <File /> */}
                {/* {!Icon || <Icon className="mr-2 h-4 w-4" />}
                          {title} */}
            </SidebarMenuButton>
            <SidebarMenuBadge>{/* {item.state} */}</SidebarMenuBadge>
        </SidebarMenuItem>
    );
}
