"use client";

import { AuthStateProvider, type InitialAuthState } from "@/hooks/use-auth";
import { useAuth } from "@/hooks/use-auth";
import { SiteNav, createSiteNavContext } from "@gnd/site-nav";
import { Icons } from "@gnd/ui/icons";
import { usePathname } from "next/dist/client/components/navigation";
import Link from "next/link";
import { Header } from "./header";
import { linkModules } from "./sidebar/links";
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
