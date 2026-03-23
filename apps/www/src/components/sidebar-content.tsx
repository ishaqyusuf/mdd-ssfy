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
import { Icons } from "./_v1/icons";
export function SidebarContent({ children }) {
    const auth = useAuth();
    if (!auth.id) return null;
    if (
        // process.env.NODE_ENV === "development" ||
        auth.roleTitle === "Super Admin"
    ) {
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
            <div className="px-6 flex flex-col">{children}</div>
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
            <div className="relative ">
                <SiteNav.Sidebar>
                    <SiteNav.Logo Icon={Icons.LogoLg} />
                    <SiteNav.LogoSm Icon={Icons.Logo} />
                    {/* <TermSwitcher /> */}
                    {/* <ModuleSwitcher /> */}
                    <div className="absolute bottom-4 left-0 right-0 z-10 px-2 w-full flex items-center justify-center md:justify-start md:px-2">
                        <SiteNav.User
                            user={auth}
                            onLogout={() => {
                                window.location.href = "/signout";
                            }}
                        />
                    </div>
                </SiteNav.Sidebar>
                <SiteNav.Shell className="pb-8">
                    <Header />
                    <div className="px-6">{children}</div>
                </SiteNav.Shell>
            </div>
        </SiteNav.Provider>
    );
}

