import { Avatar, AvatarFallback, AvatarImage } from "@gnd/ui/avatar";
import { Button } from "@gnd/ui/button";
import { cn } from "@gnd/ui/cn";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@gnd/ui/dropdown-menu";
import { Icons } from "@gnd/ui/icons";
import { useState, type ReactNode } from "react";
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
	const {
		isExpanded,
		expandSiteNav,
		handleNavFloatingMouseEnter,
		handleNavFloatingMouseLeave,
		isNavHoverCollapsePending,
	} = useSiteNav();
	const [isMenuRequestedOpen, setIsMenuRequestedOpen] = useState(false);
	const isMenuOpen = isExpanded && isMenuRequestedOpen;

	const handleOpenChange = (open: boolean) => {
		if (open) {
			expandSiteNav();
			setIsMenuRequestedOpen(true);
			return;
		}
		if (
			isMenuRequestedOpen &&
			(!isExpanded || isNavHoverCollapsePending())
		) {
			return;
		}
		setIsMenuRequestedOpen(false);
	};

	return (
		<div
			className={cn(
				"relative overflow-hidden rounded-lg border transition-colors duration-200",
				isExpanded
					? "w-full border-sidebar-border/90 bg-white/82 shadow-[0_1px_2px_rgba(15,23,42,0.05),0_12px_32px_rgba(15,23,42,0.06)] backdrop-blur-xl hover:bg-white dark:bg-sidebar-accent/82 dark:hover:bg-sidebar-accent"
					: "w-auto border-transparent bg-transparent",
			)}
		>
			<DropdownMenu open={isMenuOpen} onOpenChange={handleOpenChange}>
				<DropdownMenuTrigger asChild>
					<Button
						size="lg"
						variant="link"
						aria-label="Open account menu"
						className={cn(
							"flex h-full min-h-12 gap-3 py-1.5 text-sidebar-foreground no-underline data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-foreground",
							isExpanded ? "w-full px-3" : "w-12 justify-center px-1.5",
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
					<DropdownMenuContent
						data-site-nav-hover-surface="floating"
						onMouseEnter={handleNavFloatingMouseEnter}
						onMouseLeave={handleNavFloatingMouseLeave}
						className="w-[244px] min-w-[244px] rounded-lg border-sidebar-border bg-sidebar text-sidebar-foreground shadow-[0_16px_42px_rgba(15,23,42,0.16)]"
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
					</DropdownMenuContent>
				) : null}
			</DropdownMenu>
		</div>
	);
}
