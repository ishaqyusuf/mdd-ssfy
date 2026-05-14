import { Avatar, AvatarFallback, AvatarImage } from "@gnd/ui/avatar";
import { Button } from "@gnd/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@gnd/ui/dropdown-menu";
import { Icons } from "@gnd/ui/icons";
import type { ReactNode } from "react";
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
	const { isExpanded } = useSiteNav();

	return (
		<div
			className={
				isExpanded
					? "relative w-full overflow-hidden rounded-lg border border-sidebar-border/90 bg-white/82 shadow-[0_1px_2px_rgba(15,23,42,0.05),0_12px_32px_rgba(15,23,42,0.06)] backdrop-blur-xl transition-colors duration-200 hover:bg-white dark:bg-sidebar-accent/82 dark:hover:bg-sidebar-accent"
					: "relative w-full overflow-hidden rounded-lg border border-transparent bg-transparent transition-colors duration-200"
			}
		>
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<Button
						size="lg"
						variant="link"
						className="flex h-full min-h-[56px] w-full gap-3 px-3 py-2 text-sidebar-foreground no-underline data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-foreground"
					>
						<Avatar className="h-10 w-10 rounded-lg border border-sidebar-border">
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
				<DropdownMenuContent
					className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
					side="right"
					align="end"
					sideOffset={4}
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
			</DropdownMenu>
		</div>
	);
}
