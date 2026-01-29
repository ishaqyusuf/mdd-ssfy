"use client";

import { useAuth } from "@/hooks/use-auth";
import { SidebarProvider, useLinks } from "@/hooks/use-sidebar";
import { Sidebar } from "./sidebar";
import { cn } from "@gnd/ui/cn";
import { Header } from "./header";
import { usePathname } from "next/dist/client/components/navigation";
import { createSiteNavContext, SiteNav } from "@gnd/site-nav";
import Link from "next/link";
import { linkModules } from "./sidebar/links";
export function SidebarContent({ children }) {
    const auth = useAuth();
    if (!auth.id) return null;
    if (process.env.NODE_ENV === "development") {
        return <NavLayoutClient>{children}</NavLayoutClient>;
    }
    return (
        <SidebarProvider args={[{}]}>
            <Sidebar />
            <Content>{children}</Content>
        </SidebarProvider>
    );
}

function Content({ children }) {
    const links = useLinks();
    return (
        <div className={cn("pb-8", links?.noSidebar || "md:ml-[70px]")}>
            <Header />
            <div className="px-6">{children}</div>
        </div>
    );
}

function NavLayoutClient({ children }) {
    const auth = useAuth();
    const pathName = usePathname();
    return (
        <SiteNav.Provider
            value={createSiteNavContext({
                pathName,
                linkModules,
                Link,
                role: auth.role,
                userId: auth.id,
            })}
        >
            <div className="relative">
                <SiteNav.Sidebar>
                    {/* <TermSwitcher /> */}
                    {/* <ModuleSwitcher /> */}
                </SiteNav.Sidebar>
                <SiteNav.Shell className="pb-8">
                    <Header />
                    <div className="px-6">{children}</div>
                </SiteNav.Shell>
            </div>
        </SiteNav.Provider>
    );
}

