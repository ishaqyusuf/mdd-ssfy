"use client";

import { Avatar } from "@/components/avatar";
import Link from "@/components/link";
import { useAuth } from "@/hooks/use-auth";
import { useTestEmailMode } from "@/store/test-email-mode";
import { Button } from "@gnd/ui/button";
import { cn } from "@gnd/ui/cn";
import {
	Drawer,
	DrawerClose,
	DrawerContent,
	DrawerDescription,
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
import { BugReportButton } from "./bug-reports/bug-report-button";
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

function getAccountLinkGroups(links: UserNavLinks) {
	if (!links.noSidebar) return [];

	return (links.modules ?? [])
		.filter((module) => Boolean(module.activeLinkCount))
		.map((module) => ({
			key: module.title ?? module.name ?? "account-links",
			links: (module.sections ?? [])
				.flatMap((section) => section.links ?? [])
				.filter(isVisibleUserNavLink),
		}))
		.filter((module) => module.links.length > 0);
}

function TestEmailModeButton() {
	const auth = useAuth();
	const testEmailMode = useTestEmailMode((state) => state.enabled);
	const toggleTestEmailMode = useTestEmailMode((state) => state.toggle);
	const isSuperAdmin = auth.roleTitle?.toLowerCase() === "super admin";

	if (!isSuperAdmin) return null;

	return (
		<Button
			type="button"
			variant={testEmailMode ? "destructive" : "secondary"}
			size="icon"
			className="h-8 w-8 rounded-full"
			aria-label="Toggle test email mode"
			aria-pressed={testEmailMode}
			title="Toggle test email mode"
			onClick={toggleTestEmailMode}
		>
			<Icons.Mail className="size-4" />
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
				aria-label="Open account menu"
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
		<div className="flex min-w-0 flex-col space-y-1 text-left">
			<p className="truncate text-sm font-medium leading-none">{auth?.name}</p>
			<p className="truncate text-xs leading-none text-muted-foreground">
				{auth?.email}
			</p>
		</div>
	);
}

export function HeaderActions() {
	return (
		<>
			<SalesRepRequestBadge />
			<BugReportButton />
			<TestEmailModeButton />
			<NotificationCenter />
		</>
	);
}

function DesktopAccountMenu({ links }: UserNavProps) {
	const accountLinkGroups = getAccountLinkGroups(links);

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
					<AccountIdentity />
				</DropdownMenuLabel>
				{accountLinkGroups.map((module) => (
					<Fragment key={module.key}>
						<DropdownMenuSeparator />
						{module.links.map((link) => (
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
				))}
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

function MobileAccountDrawer({ links }: UserNavProps) {
	const [isOpen, setOpen] = useState(false);
	const accountLinkGroups = getAccountLinkGroups(links);

	return (
		<Drawer open={isOpen} onOpenChange={setOpen} shouldScaleBackground={false}>
			<DrawerTrigger asChild>
				<AvatarTrigger mobile onClick={() => setOpen(true)} />
			</DrawerTrigger>
			<DrawerContent className="max-h-[85dvh] overflow-hidden rounded-t-2xl">
				<div className="flex min-h-0 flex-1 flex-col overflow-hidden">
					<DrawerHeader className="relative border-b px-4 pb-4 pr-16 pt-3 text-left">
						<DrawerTitle>Account</DrawerTitle>
						<DrawerDescription>View your account options.</DrawerDescription>
						<DrawerClose asChild>
							<Button
								type="button"
								variant="ghost"
								size="icon"
								aria-label="Close account menu"
								className="absolute right-3 top-2 size-11 rounded-full"
							>
								<Icons.X className="size-5" />
							</Button>
						</DrawerClose>
					</DrawerHeader>

					<div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-[max(1rem,env(safe-area-inset-bottom))]">
						<div className="flex items-center justify-between gap-3 border-b p-4">
							<AccountIdentity />
							<div className="flex items-center gap-2">
								<HeaderActions />
							</div>
						</div>
						<div className="border-b p-3">
							<OpenSearchButton
								presentation="menu-item"
								onOpen={() => setOpen(false)}
							/>
						</div>
						{accountLinkGroups.map((module) => (
							<div key={module.key} className="space-y-1 border-b p-3">
								{module.links.map((link) => (
									<Button
										key={link.href}
										asChild
										variant="ghost"
										className="h-11 w-full justify-start gap-3 px-3"
									>
										<Link href={link.href} onClick={() => setOpen(false)}>
											{link.icon ? (
												<Icon
													name={link.icon}
													className="size-4 text-muted-foreground"
												/>
											) : null}
											{link.name}
										</Link>
									</Button>
								))}
							</div>
						))}
						<div className="p-3">
							<Button
								asChild
								variant="ghost"
								className="h-11 w-full justify-start gap-3 px-3"
							>
								<Link href="/signout" onClick={() => setOpen(false)}>
									<Icons.LogOut className="size-4" />
									Log out
								</Link>
							</Button>
						</div>
					</div>
				</div>
			</DrawerContent>
		</Drawer>
	);
}

export function UserNav({ links }: UserNavProps) {
	const isMobile = useIsMobile();

	if (isMobile) {
		return <MobileAccountDrawer links={links} />;
	}

	return <DesktopAccountMenu links={links} />;
}
