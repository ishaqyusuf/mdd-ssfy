import { useEffect, useMemo } from "react";
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
import { ModuleSwitcher } from "./module-switcher";

export function AppSideBar({ ...props }: React.ComponentProps<typeof Sidebar>) {
    return (
        <Sidebar collapsible="icon">
            <SidebarHeader>
                <ModuleSwitcher />
            </SidebarHeader>
            <SidebarContent>
                <SidebarModule
                    name="sales"
                    title="Sales"
                    subtitle="GND Sales Module"
                    icon="orders"
                >
                    <SidebarModuleSection name="sales" title="Sales">
                        <SidebarLink
                            name="side-bar"
                            title="Hello Side bar"
                            icon="billing"
                            link="/hello-side-bar"
                        />
                        <SidebarLink
                            name="accounting"
                            title="Accounting"
                            icon="billing"
                        />
                        <SidebarLink
                            name="sales-orders"
                            title="Orders"
                            icon="billing"
                        >
                            <SubLink name="quotes" title="Quotes" />
                            <SubLink name="productions" title="Productions" />
                            <SubLink name="dispatch" title="Dispatch" />
                        </SidebarLink>
                    </SidebarModuleSection>
                </SidebarModule>
            </SidebarContent>
        </Sidebar>
    );
}
interface SidebarModuleProps {
    name;
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
    useEffect(() => {
        ctx.form.setValue(`siteModules.${name}`, {
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
    title: string;
    children: React.ReactNode;
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
                <SidebarGroupLabel>{title}</SidebarGroupLabel>
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
        console.log(ctx.data?.subLinks);

        const links = Object.entries(ctx.data?.subLinks ?? {})
            .filter(([key, link]) => {
                return key?.startsWith(sectionCtx?.name);
            })
            ?.map(([key, link]) => link);
        return links;
    }, [ctx.data]);
    return (
        <SideBarLinkProvider args={[name]}>
            {/* <span>{}</span> */}
            {subLinks?.length ? (
                <Collapsible asChild defaultOpen={false}>
                    <SidebarMenuItem>
                        <SidebarMenuButton asChild tooltip={title}>
                            <a href={link}>
                                <Icon name={icon} className="mr-2 h-4 w-4" />
                                <span>{title}</span>
                            </a>
                        </SidebarMenuButton>
                        <CollapsibleTrigger asChild>
                            <SidebarMenuAction className="data-[state=open]:rotate-90">
                                <ChevronRight />
                                <span className="sr-only">Toggle</span>
                            </SidebarMenuAction>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                            <SidebarMenuSub>
                                {children}
                                {subLinks
                                    ?.filter((a) => a.custom)
                                    .map((subItem) => (
                                        <SidebarMenuSubItem key={subItem.title}>
                                            <SidebarMenuSubButton asChild>
                                                <a href={subItem.url}>
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
                    <SidebarMenuButton>
                        {/* <File /> */}
                        {!Icon || <Icon className="mr-2 h-4 w-4" />}
                        {title}
                    </SidebarMenuButton>
                    <SidebarMenuBadge>{/* {item.state} */}</SidebarMenuBadge>
                    {children}
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
        ctx.form.setValue(`subLinks.${linkCtx?.name}-${name}`, {
            // moduleName: siteModule?.name,
            // sectionName: sectionCtx?.name,
            url: link,
            name,
            title,
            custom: false,
            // icon,
        });
    }, [linkCtx?.name]);
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
