"use client";

import { AuthStateProvider, type InitialAuthState } from "@/hooks/use-auth";
import { useAuth } from "@/hooks/use-auth";
import { Header } from "./header";
import { usePathname } from "next/dist/client/components/navigation";
import { createSiteNavContext, SiteNav } from "@gnd/site-nav";
import Link from "next/link";
import { linkModules } from "./sidebar/links";
import { Icons } from "@gnd/ui/icons";
export function SidebarContent({
    children,
    initialAuth = null,
}: {
    children: React.ReactNode;
    initialAuth?: InitialAuthState | null;
}) {
    return (
        <AuthStateProvider value={initialAuth}>
            <NavLayoutClient>{children}</NavLayoutClient>
        </AuthStateProvider>
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
                permissions: auth.can,
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
                    <div className="">{children}</div>
                </SiteNav.Shell>
            </div>
        </SiteNav.Provider>
    );
}
