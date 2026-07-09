"use client";

import { AuthStateProvider, type InitialAuthState } from "@/hooks/use-auth";
import { useAuth } from "@/hooks/use-auth";
import { useIdleQueryEnabled } from "@/hooks/use-idle-query-enabled";
import { useSession } from "@/lib/auth/client";
import { useTRPC } from "@/trpc/client";
import { SiteNav, createSiteNavContext } from "@gnd/site-nav";
import { DropdownMenuItem } from "@gnd/ui/dropdown-menu";
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
                    <div className="relative z-20 flex w-full shrink-0 items-stretch justify-center border-t border-sidebar-border/80 bg-sidebar md:justify-start">
                        <SiteNav.User
                            user={auth}
                            onLogout={() => {
                                window.location.href = "/signout";
                            }}
                        >
                            <DropdownMenuItem asChild>
                                <Link href="/settings/profile">
                                    <Icons.AccountCircle className="mr-2 size-4" />
                                    Profile
                                </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                                <Link href="/settings/notification-channels/v2">
                                    <Icons.Settings className="mr-2 size-4" />
                                    Notification settings
                                </Link>
                            </DropdownMenuItem>
                        </SiteNav.User>
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
