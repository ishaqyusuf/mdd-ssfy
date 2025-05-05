import { Fragment, useEffect, useMemo } from "react";
import { ChevronRight } from "lucide-react";

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
    SidebarMenuAction,
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
import { linkModules } from "./links";
import { ModuleSwitcher } from "./module-switcher";
import { useSidebarStore } from "./store";

export function AppSideBar({ ...props }: React.ComponentProps<typeof Sidebar>) {
    const store = useSidebarStore((s) => s);
    useEffect(() => {
        store.reset();
    }, []);
    if (!store.render) return null;
    return (
        <Sidebar collapsible="icon">
            <SidebarHeader>
                <ModuleSwitcher />
            </SidebarHeader>
            <SidebarContent>
                <></>
                {/* {linkModules.map((module, mi) => (
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
                                                name={li.name}
                                                title={li.title}
                                                icon={li.icon}
                                            >
                                                {li.links?.map((sub, si) => (
                                                    <SubLink
                                                        name={sub?.name}
                                                        title={sub?.title}
                                                        link={sub?.href}
                                                        key={si}
                                                    />
                                                ))}
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
                ))} */}
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
    useEffect(() => {
        console.log(store);
    }, [store]);
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
    const ctx = useSidebar();
    const mod = useSidebarModule();
    useEffect(() => {
        console.log(ctx?.data);
    }, [ctx?.data]);
    return (
        <SideBarSectionProvider args={[name]}>
            <SidebarGroup>
                {!title || <SidebarGroupLabel>{title}</SidebarGroupLabel>}
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
    const { siteModule } = useSidebarModule();
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
                            {/* <SidebarMenuAction className="data-[state=open]:rotate-90">
                                <ChevronRight />
                                <span className="sr-only">Toggle</span>
                            </SidebarMenuAction> */}
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                            <SidebarMenuSub>
                                {subLinks
                                    // ?.filter((a) => a.custom)
                                    .map((subItem) => (
                                        <SidebarMenuSubItem key={subItem.title}>
                                            <SidebarMenuSubButton asChild>
                                                <a href={subItem.url || ""}>
                                                    <span>{subItem.title}</span>
                                                </a>
                                            </SidebarMenuSubButton>
                                        </SidebarMenuSubItem>
                                    ))}
                            </SidebarMenuSub>
                        </CollapsibleContent>
                    </SidebarMenuItem>
                </Collapsible>
            ) : (
                <SidebarMenuItem>
                    <SidebarMenuButton asChild>
                        <a href={link}>
                            {!Icon || <Icon className="mr-2 h-4 w-4" />}
                            <span>{title}</span>
                        </a>
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
    return (
        <SidebarMenuSubItem>
            <SidebarMenuSubButton asChild>
                <a href={link}>
                    <span>{title}</span>
                </a>
            </SidebarMenuSubButton>
        </SidebarMenuSubItem>
    );
}
