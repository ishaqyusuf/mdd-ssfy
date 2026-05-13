"use client";

import { AuthStateProvider, type InitialAuthState } from "@/hooks/use-auth";
import { useAuth } from "@/hooks/use-auth";
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
	const trpc = useTRPC();
	const pathName = usePathname();
	const { data: defaults = pageTabDefaults } = useQuery({
		...trpc.pageTabs.defaults.queryOptions(),
		enabled: auth.enabled,
		initialData: pageTabDefaults,
	});

	return (
		<SiteNav.Provider
			value={createSiteNavContext({
				pathName,
				linkModules,
				Link,
				role: auth.role,
				userId: auth.id,
				permissions: auth.can,
				defaultHrefByPath: defaults,
			})}
		>
			<div className="relative ">
				<SiteNav.Sidebar>
					<SiteNav.Logo Icon={Icons.LogoLg} />
					<SiteNav.LogoSm Icon={Icons.Logo} />
					{/* <TermSwitcher /> */}
					{/* <ModuleSwitcher /> */}
					<div className="absolute bottom-5 left-0 right-0 z-10 flex w-full items-center justify-center px-3 md:justify-start">
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
