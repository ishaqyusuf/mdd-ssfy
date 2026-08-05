"use client";

import { Avatar } from "@/components/avatar";
import Link from "@/components/link";
import { useAuth } from "@/hooks/use-auth";
import { useTestEmailMode } from "@/store/test-email-mode";
import { SiteNav } from "@gnd/site-nav";
import { Button } from "@gnd/ui/button";
import { cn } from "@gnd/ui/cn";
import {
	Drawer,
	DrawerClose,
	DrawerContent,
	DrawerDescription,
	DrawerFooter,
	DrawerHeader,
	DrawerTitle,
	DrawerTrigger,
} from "@gnd/ui/drawer";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuShortcut,
	DropdownMenuTrigger,
} from "@gnd/ui/dropdown-menu";
import { useIsMobile } from "@gnd/ui/hooks/use-mobile";
import { Icon, Icons } from "@gnd/ui/icons";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@gnd/ui/tooltip";
import { type ComponentProps, Fragment, forwardRef, useState } from "react";
import {
	BugReportButton,
	BugReportTrigger,
} from "./bug-reports/bug-report-button";
import { NotificationCenter } from "./notification-center";
import { SalesRepRequestBadge } from "./sales-rep-request-badge";
import { OpenSearchButton } from "./search/open-search-button";

type UserNavLink = {
	href?: string;
	icon?: ComponentProps<typeof Icon>["name"];
	name?: string;
	show?: boolean;
};

type UserNavLinks = {
	noSidebar?: boolean;
	modules?: Array<{
		activeLinkCount?: number;
		name?: string;
		title?: string;
		sections?: Array<{ links?: UserNavLink[] }>;
	}>;
};

type UserNavProps = {
	links: UserNavLinks;
};

function isVisibleUserNavLink(
	link: UserNavLink,
): link is UserNavLink & { href: string } {
	return Boolean(link.show && link.href);
}

type TestEmailModeActionProps = {
	presentation?: "header" | "menu-item";
};

function TestEmailModeAction({
	presentation = "header",
}: TestEmailModeActionProps = {}) {
	const auth = useAuth();
	const testEmailMode = useTestEmailMode((state) => state.enabled);
	const toggleTestEmailMode = useTestEmailMode((state) => state.toggle);
	const isSuperAdmin = auth.roleTitle?.toLowerCase() === "super admin";
	const isMenuItem = presentation === "menu-item";

	if (!isSuperAdmin) return null;

	return (
		<Button
			type="button"
			variant={
				testEmailMode ? "destructive" : isMenuItem ? "ghost" : "secondary"
			}
			size={isMenuItem ? "sm" : "icon"}
			className={
				isMenuItem
					? "h-11 w-full justify-start gap-3 rounded-lg px-3 text-sm font-medium"
					: "h-8 w-8 rounded-full"
			}
			aria-label="Toggle test email mode"
			aria-pressed={testEmailMode}
			title="Toggle test email mode"
			onClick={toggleTestEmailMode}
		>
			<Icons.Mail className="size-4" />
			{isMenuItem ? (
				<>
					<span className="flex-1 text-left">Test email mode</span>
					<span className="text-xs font-normal opacity-70">
						{testEmailMode ? "On" : "Off"}
					</span>
				</>
			) : null}
		</Button>
	);
}

type AvatarTriggerProps = ComponentProps<typeof Button> & {
	mobile?: boolean;
};

const AvatarTrigger = forwardRef<HTMLButtonElement, AvatarTriggerProps>(
	({ className, mobile = false, ...props }, ref) => {
		const auth = useAuth();

		return (
			<Button
				ref={ref}
				variant="outline"
				size="icon"
				aria-label="Open account and navigation menu"
				className={cn(
					"relative size-11 shrink-0 rounded-full",
					!mobile && "md:size-8",
					className,
				)}
				{...props}
			>
				<Avatar
					name={auth?.name}
					email={auth?.email}
					className={mobile ? "size-11" : "size-11 md:size-8"}
				/>
			</Button>
		);
	},
);
AvatarTrigger.displayName = "AvatarTrigger";

function AccountIdentity() {
	const auth = useAuth();

	return (
		<div className="flex min-w-0 items-center gap-3">
			<Avatar
				name={auth?.name}
				email={auth?.email}
				className="size-11 shrink-0"
			/>
			<div className="min-w-0 flex-1 text-left">
				<p className="truncate text-sm font-semibold">{auth?.name}</p>
				<p className="truncate text-xs text-muted-foreground">{auth?.email}</p>
			</div>
		</div>
	);
}

function DesktopHeaderActions() {
	return (
		<div className="hidden items-center gap-2 md:flex">
			<SalesRepRequestBadge />
			<BugReportButton variant="secondary" />
			<TestEmailModeAction />
			<NotificationCenter />
		</div>
	);
}

function DesktopAccountMenu({ links }: UserNavProps) {
	const auth = useAuth();

	return (
		<DropdownMenu>
			<TooltipProvider disableHoverableContent>
				<Tooltip delayDuration={100}>
					<TooltipTrigger asChild>
						<DropdownMenuTrigger asChild>
							<AvatarTrigger />
						</DropdownMenuTrigger>
					</TooltipTrigger>
					<TooltipContent side="bottom">Profile</TooltipContent>
				</Tooltip>
			</TooltipProvider>

			<DropdownMenuContent className="w-56" align="end">
				<DropdownMenuLabel className="font-normal">
					<div className="flex flex-col space-y-1">
						<p className="truncate text-sm font-medium leading-none">
							{auth?.name}
						</p>
						<p className="truncate text-xs leading-none text-muted-foreground">
							{auth?.email}
						</p>
					</div>
				</DropdownMenuLabel>
				{links.noSidebar
					? (links.modules ?? [])
							.filter((module) => Boolean(module.activeLinkCount))
							.map((module) => (
								<Fragment key={module.title ?? module.name}>
									<DropdownMenuSeparator />
									{(module.sections ?? [])
										.flatMap((section) => section.links ?? [])
										.filter(isVisibleUserNavLink)
										.map((link) => (
											<DropdownMenuItem key={link.href} asChild>
												<Link href={link.href}>
													{link.icon ? (
														<Icon
															name={link.icon}
															className="mr-3 size-4 text-muted-foreground"
														/>
													) : null}
													{link.name}
												</Link>
											</DropdownMenuItem>
										))}
								</Fragment>
							))
					: null}
				<DropdownMenuSeparator />
				<DropdownMenuItem asChild>
					<Link href="/signout">
						<Icons.LogOut className="mr-2 size-4" />
						<span>Log out</span>
						<DropdownMenuShortcut>⇧⌘Q</DropdownMenuShortcut>
					</Link>
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

function MobileAccountDrawer() {
	const [isOpen, setOpen] = useState(false);
	const [bugReportOpen, setBugReportOpen] = useState(false);
	const [notificationsOpen, setNotificationsOpen] = useState(false);
	const [notificationTriggerContainer, setNotificationTriggerContainer] =
		useState<HTMLDivElement | null>(null);
	const coveredByNotifications = notificationsOpen ? true : undefined;

	return (
		<>
			<Drawer
				open={isOpen}
				onOpenChange={(nextOpen) => {
					setOpen(nextOpen);
					if (!nextOpen) setNotificationsOpen(false);
				}}
				shouldScaleBackground={false}
			>
				<DrawerTrigger asChild>
					<AvatarTrigger mobile onClick={() => setOpen(true)} />
				</DrawerTrigger>
				<DrawerContent className="h-[92dvh] max-h-[92dvh] overflow-hidden rounded-t-2xl">
					<div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
						<DrawerHeader
							className={cn(
								"relative border-b px-4 pb-4 pr-16 pt-3 text-left",
								notificationsOpen && "hidden",
							)}
							aria-hidden={coveredByNotifications}
							inert={coveredByNotifications}
						>
							<DrawerTitle>Account and navigation</DrawerTitle>
							<DrawerDescription>
								Choose a workspace page or account action.
							</DrawerDescription>
							<DrawerClose asChild>
								<Button
									type="button"
									variant="ghost"
									size="icon"
									aria-label="Close account and navigation menu"
									className="absolute right-3 top-2 size-11 rounded-full"
								>
									<Icons.X className="size-5" />
								</Button>
							</DrawerClose>
						</DrawerHeader>

						<div
							className={cn(
								"min-h-0 flex-1 overflow-y-auto overscroll-contain",
								notificationsOpen && "hidden",
							)}
						>
							<div
								className="border-b p-4"
								aria-hidden={coveredByNotifications}
								inert={coveredByNotifications}
							>
								<AccountIdentity />
							</div>

							<section
								aria-labelledby="mobile-navigation-heading"
								className="border-b bg-sidebar pb-4 text-sidebar-foreground"
								aria-hidden={coveredByNotifications}
								inert={coveredByNotifications}
							>
								<h2 id="mobile-navigation-heading" className="sr-only">
									Navigation
								</h2>
								<div className="border-b border-sidebar-border/80 p-3">
									<SiteNav.ModuleSelector
										forceExpanded
										expandNavOnOpen={false}
									/>
								</div>
								<SiteNav.NavsList mobile onSelect={() => setOpen(false)} />
							</section>

							<section
								aria-labelledby="mobile-quick-actions-heading"
								className="p-3"
							>
								<div
									className="contents"
									aria-hidden={coveredByNotifications}
									inert={coveredByNotifications}
								>
									<h2
										id="mobile-quick-actions-heading"
										className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground"
									>
										Quick actions
									</h2>
								</div>
								<div className="space-y-1">
									<div
										className="contents"
										aria-hidden={coveredByNotifications}
										inert={coveredByNotifications}
									>
										<OpenSearchButton
											presentation="menu-item"
											onOpen={() => setOpen(false)}
										/>
										<SalesRepRequestBadge
											presentation="menu-item"
											onNavigate={() => setOpen(false)}
										/>
										<BugReportTrigger
											presentation="menu-item"
											onOpen={() => {
												setOpen(false);
												setBugReportOpen(true);
											}}
										/>
										<TestEmailModeAction presentation="menu-item" />
									</div>
									<div
										ref={setNotificationTriggerContainer}
										className="contents"
									/>
								</div>
							</section>
						</div>

						<DrawerFooter
							className={cn(
								"gap-1 border-t pb-[max(1rem,env(safe-area-inset-bottom))]",
								notificationsOpen && "hidden",
							)}
							aria-hidden={coveredByNotifications}
							inert={coveredByNotifications}
						>
							<Button
								asChild
								variant="ghost"
								className="h-11 justify-start gap-3"
							>
								<Link href="/settings/profile" onClick={() => setOpen(false)}>
									<Icons.AccountCircle className="size-4" />
									Profile
								</Link>
							</Button>
							<Button
								asChild
								variant="ghost"
								className="h-11 justify-start gap-3"
							>
								<Link
									href="/settings/notification-channels/v2"
									onClick={() => setOpen(false)}
								>
									<Icons.Settings className="size-4" />
									Notification settings
								</Link>
							</Button>
							<Button
								asChild
								variant="ghost"
								className="h-11 justify-start gap-3"
							>
								<Link href="/signout" onClick={() => setOpen(false)}>
									<Icons.LogOut className="size-4" />
									Log out
								</Link>
							</Button>
						</DrawerFooter>
						<NotificationCenter
							presentation="menu-item"
							onNavigate={() => setOpen(false)}
							open={notificationsOpen}
							onOpenChange={setNotificationsOpen}
							triggerContainer={notificationTriggerContainer}
						/>
					</div>
				</DrawerContent>
			</Drawer>
			<BugReportButton
				hideTrigger
				open={bugReportOpen}
				onOpenChange={setBugReportOpen}
			/>
		</>
	);
}

export function UserNav({ links }: UserNavProps) {
	const isMobile = useIsMobile();

	if (isMobile) {
		return <MobileAccountDrawer />;
	}

	return (
		<>
			<DesktopHeaderActions />
			<DesktopAccountMenu links={links} />
		</>
	);
}
