"use client";

import { AuthStateProvider, type InitialAuthState } from "@/hooks/use-auth";
import { useIdleQueryEnabled } from "@/hooks/use-idle-query-enabled";
import { useAuth } from "@/hooks/use-auth";
import { useSession } from "@/lib/auth/client";
import { useTRPC } from "@/trpc/client";
import { SiteNav, createSiteNavContext } from "@gnd/site-nav";
import { Icons } from "@gnd/ui/icons";
import { useQuery } from "@gnd/ui/tanstack";
import { usePathname } from "next/dist/client/components/navigation";
import Link from "next/link";
import { Header } from "./header";
import { linkModules } from "./sidebar-links";
export function SidebarContent({
    children,
    initialAuth = null,
    pageTabDefaults = {},
}: {
    children: React.ReactNode;
    initialAuth?: InitialAuthState | null;
    pageTabDefaults?: Record<string, string>;
}) {
    return (
        <AuthStateProvider value={initialAuth}>
            <NavLayoutClient pageTabDefaults={pageTabDefaults}>
                {children}
            </NavLayoutClient>
        </AuthStateProvider>
    );
}

function NavLayoutClient({ children, pageTabDefaults }) {
    const auth = useAuth();
    const { status } = useSession();
    const trpc = useTRPC();
    const pathName = usePathname();
    const hasInitialDefaults = Object.keys(pageTabDefaults).length > 0;
    const idleQueryEnabled = useIdleQueryEnabled(1000);
    const { data: defaults = pageTabDefaults } = useQuery({
        ...trpc.pageTabs.defaults.queryOptions(undefined, {
            ...(hasInitialDefaults ? { initialData: pageTabDefaults } : {}),
        }),
        enabled:
            auth.enabled &&
            status === "authenticated" &&
            (hasInitialDefaults || idleQueryEnabled),
        refetchOnMount: false,
        refetchOnWindowFocus: false,
        staleTime: Number.POSITIVE_INFINITY,
    });
    const navDefaults = defaults;

    return (
        <SiteNav.Provider
            value={createSiteNavContext({
                pathName,
                linkModules,
                Link,
                role: auth.role,
                userId: auth.id,
                permissions: auth.can,
                defaultHrefByPath: navDefaults,
            })}
        >
            <div className="relative ">
                <SiteNav.Sidebar>
                    <SiteNav.Logo
                        Icon={Icons.Logo}
                        title="GND"
                        subtitle="Millwork Corp"
                    />
                    <SiteNav.LogoSm Icon={Icons.Logo} />
                    {/* <TermSwitcher /> */}
                    {/* <ModuleSwitcher /> */}
                    <div className="relative z-20 flex w-full shrink-0 items-center justify-center border-t border-sidebar-border/80 bg-sidebar px-3 py-2.5 md:justify-start">
                        <SiteNav.User
                            user={auth}
                            onLogout={() => {
                                window.location.href = "/signout";
                            }}
                        />
                    </div>
                </SiteNav.Sidebar>
                <SiteNav.Shell className="">
                    <Header />
                    <div className="">{children}</div>
                </SiteNav.Shell>
            </div>
        </SiteNav.Provider>
    );
}
