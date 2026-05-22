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

function TestEmailModeIndicator({ visible }: { visible: boolean }) {
	const testEmailMode = useTestEmailMode((state) => state.enabled);

	if (!visible || !testEmailMode) return null;

	return (
		<div className="pointer-events-none fixed inset-x-3 bottom-3 z-[80] flex justify-center md:bottom-5 md:left-[84px]">
			<div className="flex max-w-[calc(100vw-1.5rem)] items-center gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-950 shadow-lg shadow-amber-950/10">
				<Icons.Mail className="size-4 shrink-0 text-amber-700" />
				<span className="truncate">Test email mode is on</span>
			</div>
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
					<div className="relative z-20 flex w-full shrink-0 items-center justify-center border-t border-sidebar-border/80 bg-sidebar px-3 py-2.5 md:justify-start">
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
				<TestEmailModeIndicator visible={isSuperAdmin} />
			</div>
		</SiteNav.Provider>
	);
}
