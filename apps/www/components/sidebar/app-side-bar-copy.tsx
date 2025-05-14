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
import { getLinkModules } from "./links";
import { ModuleSwitcher } from "./module-switcher";
import { useSidebarStore } from "./store";

export function AppSideBar({ ...props }: React.ComponentProps<typeof Sidebar>) {
    const store = useSidebarStore((s) => s);
    const pathname = usePathname();

    useEffect(() => {
        setTimeout(() => {
            const links = store.links || {};
            const entry = Object.entries(links).find(([k, link]) => {
                return (
                    link?.url?.toLocaleLowerCase() ===
                    pathname?.toLocaleLowerCase()
                );
            })?.[1];

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
    const linkModules = getLinkModules();
    if (!store.render) return null;
    return (
        <Sidebar collapsible="icon">
            <SidebarHeader>
                <ModuleSwitcher />
            </SidebarHeader>
            <SidebarContent className="bg-white">
                {linkModules.map((module, mi) => (
                    <SidebarModule
                        name={module.name as any}
                        icon={module.icon}
                        title={module.title}
                        subtitle={module.subtitle}
                        key={mi}
                    >
                        {module.sections?.map((section, si) => (
                            <SidebarModuleSection
                                title={section.title}
                                key={si}
                                name={section.name}
                            >
                                {section.links?.map((link, li) => (
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
                                                            name={sub?.name}
                                                            title={sub?.title}
                                                            link={sub?.href}
                                                            key={si}
                                                        />
                                                    ),
                                                )}
                                            </SidebarLink>
                                        ) : (
                                            <>
                                                <SidebarLink
                                                    name={link.name}
                                                    title={link.title}
                                                    link={link?.href}
                                                    icon={link.icon}
                                                />
                                            </>
                                        )}
                                    </Fragment>
                                ))}
                            </SidebarModuleSection>
                        ))}
                    </SidebarModule>
                ))}
            </SidebarContent>
        </Sidebar>
    );
}
interface SidebarModuleProps {
    name?: string;
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

    return (
        <SideBarSectionProvider args={[name]}>
            <SidebarGroup className={cn(mod?.isCurrentModule || "hidden")}>
                {!title || !mod?.isCurrentModule || (
                    <SidebarGroupLabel>{title}</SidebarGroupLabel>
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
    const store = useSidebarStore();
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
                            <SidebarMenuButton tooltip={title}>
                                <Icon name={icon} className="mr-2 h-4 w-4" />
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
                            isCurrentModule || "hidden",
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
            url: link,
            name,
            title,
            custom: false,
            // icon,
        });
    }, [linkCtx?.name, name, title, ctx?.form, link]);
    return null;
}
