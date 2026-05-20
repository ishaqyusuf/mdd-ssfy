"use client";

import { AuthStateProvider, type InitialAuthState } from "@/hooks/use-auth";
import { useAuth } from "@/hooks/use-auth";
import { useTestEmailMode } from "@/store/test-email-mode";
import { useTRPC } from "@/trpc/client";
import { SiteNav, createSiteNavContext } from "@gnd/site-nav";
import { Icons } from "@gnd/ui/icons";
import { Switch } from "@gnd/ui/switch";
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

function TestEmailModeMenuItem() {
	const testEmailMode = useTestEmailMode((state) => state.enabled);
	const setTestEmailMode = useTestEmailMode((state) => state.setEnabled);

	return (
		<div className="flex items-center justify-between gap-3 px-2 py-1.5 text-sm">
			<div className="flex min-w-0 items-center gap-2">
				<Icons.Mail className="size-4 text-muted-foreground" />
				<div className="min-w-0">
					<div className="flex items-center gap-2">
						<span>Test email mode</span>
						{testEmailMode ? (
							<span className="rounded-sm bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-800">
								On
							</span>
						) : null}
					</div>
					<p className="truncate text-xs text-muted-foreground">
						Route sales emails to TEST_EMAILS
					</p>
				</div>
			</div>
			<Switch
				checked={testEmailMode}
				onCheckedChange={setTestEmailMode}
				aria-label="Toggle test email mode"
			/>
		</div>
	);
}

function NavLayoutClient({ children, pageTabDefaults }) {
	const auth = useAuth();
	const trpc = useTRPC();
	const pathName = usePathname();
	const isSuperAdmin = auth.roleTitle?.toLowerCase() === "super admin";
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
						>
							{isSuperAdmin ? <TestEmailModeMenuItem /> : null}
						</SiteNav.User>
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
