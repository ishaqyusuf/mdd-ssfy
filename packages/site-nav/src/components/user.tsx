import { Avatar, AvatarFallback, AvatarImage } from "@gnd/ui/avatar";
import { Button } from "@gnd/ui/button";
import { cn } from "@gnd/ui/cn";
import {
	DropdownMenu,
	DropdownMenuContentWithoutPortal,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@gnd/ui/dropdown-menu";
import { Icons } from "@gnd/ui/icons";
import { type ReactNode, useState } from "react";
import { useSiteNav } from "./use-site-nav";

type SiteNavUserData = {
	name?: string;
	email?: string;
	avatar?: string;
};

interface SiteNavUserProps {
	user: SiteNavUserData;
	onLogout?: () => void;
	children?: ReactNode;
}

function getInitials(name?: string) {
	if (!name) return "";
	const parts = name.trim().split(/\s+/).filter(Boolean).slice(0, 2);
	return parts.map((part) => part[0]?.toUpperCase() || "").join("");
}

export function User({ user, onLogout, children }: SiteNavUserProps) {
	const { isExpanded, expandSiteNav, isNavHoverCollapsePending } = useSiteNav();
	const [isMenuRequestedOpen, setIsMenuRequestedOpen] = useState(false);
	const isMenuOpen = isExpanded && isMenuRequestedOpen;

	const handleOpenChange = (open: boolean) => {
		if (open) {
			expandSiteNav();
			setIsMenuRequestedOpen(true);
			return;
		}
		if (isMenuRequestedOpen && (!isExpanded || isNavHoverCollapsePending())) {
			return;
		}
		setIsMenuRequestedOpen(false);
	};

	return (
		<div
			className={cn(
				"relative w-full transition-colors duration-200",
				isMenuOpen ? "overflow-visible" : "overflow-hidden",
			)}
		>
			<DropdownMenu
				modal={false}
				open={isMenuOpen}
				onOpenChange={handleOpenChange}
			>
				<DropdownMenuTrigger asChild>
					<Button
						size="lg"
						variant="link"
						aria-label="Open account menu"
						className={cn(
							"flex h-full min-h-[72px] rounded-none text-sidebar-foreground no-underline hover:bg-sidebar-accent/70 data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-foreground",
							isExpanded
								? "w-full justify-start gap-3 px-6 py-3"
								: "w-full justify-center px-0 py-3",
						)}
					>
						<Avatar className="h-9 w-9 rounded-lg border border-sidebar-border">
							<AvatarImage src={user?.avatar} alt={user?.name} />
							<AvatarFallback className="rounded-lg bg-sidebar-primary/10 text-sidebar-primary">
								{getInitials(user?.name)}
							</AvatarFallback>
						</Avatar>
						{!isExpanded || (
							<>
								<div className="grid flex-1 text-left text-sm leading-tight">
									<span className="truncate font-semibold text-sidebar-foreground">
										{user?.name}
									</span>
									<span className="truncate text-xs text-sidebar-foreground/50">
										{user?.email}
									</span>
								</div>
								<Icons.ChevronDown className="ml-auto size-4 text-sidebar-foreground/50" />
							</>
						)}
					</Button>
				</DropdownMenuTrigger>
				{isExpanded ? (
					<DropdownMenuContentWithoutPortal
						className="w-[268px] min-w-[268px] rounded-lg border-sidebar-border bg-sidebar text-sidebar-foreground shadow-[0_16px_42px_rgba(15,23,42,0.16)]"
						side="top"
						align="start"
						sideOffset={8}
					>
						<DropdownMenuLabel className="p-0 font-normal">
							<div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
								<Avatar className="h-8 w-8 rounded-xl">
									<AvatarImage src={user?.avatar} alt={user?.name} />
									<AvatarFallback className="rounded-xl">
										{getInitials(user?.name)}
									</AvatarFallback>
								</Avatar>
								<div className="grid flex-1 text-left text-sm leading-tight">
									<span className="truncate font-semibold">{user?.name}</span>
									<span className="truncate text-xs">{user?.email}</span>
								</div>
							</div>
						</DropdownMenuLabel>
						{children ? <DropdownMenuSeparator /> : null}
						{children}
						{onLogout ? (
							<>
								<DropdownMenuSeparator />
								<DropdownMenuItem onClick={onLogout}>
									<Icons.ExitToApp className="size-4 mr-2" />
									Log out
								</DropdownMenuItem>
							</>
						) : null}
					</DropdownMenuContentWithoutPortal>
				) : null}
			</DropdownMenu>
		</div>
	);
}
