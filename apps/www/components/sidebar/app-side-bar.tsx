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
export function AppSideBar({ ...props }: React.ComponentProps<typeof Sidebar>) {
    const store = useSidebarStore((s) => s);
    const pathname = usePathname();
    const sb = useSidebar();
    useEffect(() => {
        setTimeout(() => {
            const links = store.links || {};
            const entry = Object.entries(links).find(([k, link]) => {
                return (
                    link?.url?.toLocaleLowerCase() ===
                    pathname?.toLocaleLowerCase()
                );
            })?.[1];
            // console.log({ entry, links, pathname });
            if (entry) {
                // console.log({ entry, links, pathname });
                store.update("activeLinkName", entry.name);
                store.update("activeModule", entry.moduleName);
            } else {
                store.update("activeLinkName", null);
                store.update("activeModule", null);
            }
        }, 500);
    }, [pathname, store.links]);
    useEffect(() => {
        store.reset();
    }, []);
    // const linkModules = getLinkModules();
    if (!store.render) return null;
    const renderMode = sb?.linkModules?.renderMode;
    return (
        <Sidebar collapsible="icon" className="">
            <SidebarHeader className="bg-white">
                <ModuleSwitcher />
            </SidebarHeader>
            <SidebarContent className="bg-white">
                <div className="">
                    {sb?.linkModules?.renderMode}
                    {"|"}
                </div>
                {sb?.linkModules?.modules
                    ?.filter((a) => a.activeLinkCount)
                    .map((module, mi) => (
                        <SidebarModule
                            name={module.name as any}
                            icon={module.icon}
                            title={module.title}
                            subtitle={module.subtitle}
                            key={mi}
                        >
                            {module.sections?.map((section, si) => (
                                <div
                                    key={si}
                                    className={cn(
                                        !section?.linksCount && "hidden",
                                    )}
                                >
                                    <SidebarModuleSection
                                        title={section.title}
                                        name={section.name}
                                    >
                                        {section.links
                                            ?.filter((a) => a.show)
                                            .map((link, li) => (
                                                <Fragment key={li}>
                                                    {link?.subLinks?.length ? (
                                                        <SidebarLink
                                                            name={link.name}
                                                            title={link.title}
                                                            icon={link.icon}
                                                        >
                                                            {link.subLinks?.map(
                                                                (sub, si) => (
                                                                    <SubLink
                                                                        name={
                                                                            sub?.name
                                                                        }
                                                                        title={
                                                                            sub?.title
                                                                        }
                                                                        link={
                                                                            sub?.href
                                                                        }
                                                                        key={si}
                                                                    />
                                                                ),
                                                            )}
                                                        </SidebarLink>
                                                    ) : (
                                                        <>
                                                            <SidebarLink
                                                                name={link.name}
                                                                title={
                                                                    link.title
                                                                }
                                                                link={
                                                                    link?.href
                                                                }
                                                                icon={link.icon}
                                                            />
                                                        </>
                                                    )}
                                                </Fragment>
                                            ))}
                                    </SidebarModuleSection>
                                </div>
                            ))}
                        </SidebarModule>
                    ))}
            </SidebarContent>
        </Sidebar>
    );
}
interface SidebarModuleProps {
    name: "sales" | "hrm" | "community";
    title;
    subtitle;
    icon: IconKeys;
    children: React.ReactNode;
}
function SidebarModule({
    name,
    title,
    subtitle,
    icon,
    children,
}: SidebarModuleProps) {
    const ctx = useSidebar();
    const store = useSidebarStore();
    useEffect(() => {
        store.update(`siteModules.${name}`, {
            name,
            title,
            subtitle,
            icon,
        });
    }, []);

    return (
        <SideBarModuleProvider args={[name]}>{children}</SideBarModuleProvider>
    );
}
interface SidebarModuleSectionProps {
    name: string;
    title?: string;
    children?: React.ReactNode;
}
function SidebarModuleSection({
    name,
    title,
    children,
}: SidebarModuleSectionProps) {
    const mod = useSidebarModule();
    const sb = useSidebar();
    const renderMode = sb?.linkModules?.renderMode;
    return (
        <SideBarSectionProvider args={[name]}>
            <SidebarGroup
                className={cn(
                    !mod?.isCurrentModule &&
                        sectionGroup({
                            renderMode,
                        }),
                )}
            >
                {(!title && !name) || (
                    <SidebarGroupLabel
                        className={cn(
                            !mod?.isCurrentModule &&
                                sectionLabel({
                                    renderMode,
                                }),
                        )}
                    >
                        {title || name}
                    </SidebarGroupLabel>
                )}
                <SidebarMenu>{children}</SidebarMenu>
            </SidebarGroup>
        </SideBarSectionProvider>
    );
}
interface SidebarLinkProps {
    name: string;
    title: string;
    icon?: IconKeys;
    link?: string;
    children?: React.ReactNode;
}
function SidebarLink({ title, icon, name, link, children }: SidebarLinkProps) {
    const Icon = icon ? Icons[icon] : null;
    const ctx = useSidebar();
    const { siteModule, isCurrentModule } = useSidebarModule();
    const sectionCtx = useSidebarSection();

    const store = useSidebarStore();
    useEffect(() => {
        ctx.form.setValue(`links.${name}`, {
            moduleName: siteModule?.name,
            sectionName: sectionCtx?.name,
            url: link,
            name,
            title,
            icon,
        });
    }, [siteModule, sectionCtx?.name]);
    const subLinks = useMemo(() => {
        const links = Object.entries(ctx.data?.subLinks ?? {})
            .filter(([key, link]) => {
                return key?.startsWith(`${name}|`);
            })
            ?.map(([key, link]) => link);
        return links;
    }, [ctx.data, name]);
    return (
        <SideBarLinkProvider args={[name]}>
            {children}
            {subLinks?.length ? (
                <Collapsible
                    className="group/collapsible"
                    asChild
                    defaultOpen={false}
                >
                    <SidebarMenuItem>
                        <CollapsibleTrigger asChild>
                            <SidebarMenuButton
                                className={cn(isCurrentModule || "hidden")}
                                tooltip={title}
                            >
                                {!Icon || (
                                    <Icon
                                        name={icon}
                                        className="mr-2 h-4 w-4"
                                    />
                                )}
                                <span>{title}</span>
                                <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                            </SidebarMenuButton>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                            <SidebarMenuSub>
                                {subLinks
                                    // ?.filter((a) => a.custom)
                                    .map((subItem) => (
                                        <SidebarMenuSubItem key={subItem.title}>
                                            <SidebarMenuSubButton asChild>
                                                <Link href={subItem.url || ""}>
                                                    <span>{subItem.title}</span>
                                                </Link>
                                            </SidebarMenuSubButton>
                                        </SidebarMenuSubItem>
                                    ))}
                            </SidebarMenuSub>
                        </CollapsibleContent>
                    </SidebarMenuItem>
                </Collapsible>
            ) : (
                <SidebarMenuItem>
                    <SidebarMenuButton
                        asChild
                        variant="outline"
                        className={cn(
                            store?.activeLinkName == name && "bg-muted",
                            // isCurrentModule || "hidden",
                        )}
                    >
                        <Link href={link || ""}>
                            {!Icon || <Icon className="mr-2 h-4 w-4" />}
                            <span>{title}</span>
                            {/* <span>aaa</span> */}
                        </Link>
                        {/* <File /> */}
                        {/* {!Icon || <Icon className="mr-2 h-4 w-4" />}
                          {title} */}
                    </SidebarMenuButton>
                    <SidebarMenuBadge>{/* {item.state} */}</SidebarMenuBadge>
                </SidebarMenuItem>
            )}
        </SideBarLinkProvider>
    );
}
interface SubLinkProps {
    name: string;
    title: string;
    link?: string;
    children?: React.ReactNode;
}
function SubLink({ title, name, link }: SubLinkProps) {
    const ctx = useSidebar();
    // const { siteModule } = useSidebarModule();
    // const sectionCtx = useSidebarSection();
    const linkCtx = useSidebarLink();
    useEffect(() => {
        ctx.form.setValue(`subLinks.${linkCtx?.name}|${name}`, {
            // moduleName: siteModule?.name,
            // sectionName: sectionCtx?.name,
            url: link,
            name,
            title,
            custom: false,
            // icon,
        });
    }, [linkCtx?.name]);
    return null;
}
