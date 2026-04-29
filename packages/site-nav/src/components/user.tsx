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
		<div className="bg-sidebar-accent/70 border-sidebar-border hover:bg-sidebar-accent relative w-full overflow-hidden rounded-[22px] border shadow-sm backdrop-blur-xl transition-colors duration-200">
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<Button
						size="lg"
						variant="link"
						className="text-sidebar-foreground data-[state=open]:bg-sidebar-accent flex h-full min-h-[56px] w-full gap-3 px-3 py-2 no-underline data-[state=open]:text-sidebar-foreground"
					>
						<Avatar className="border-sidebar-border h-10 w-10 rounded-2xl border">
							<AvatarImage src={user?.avatar} alt={user?.name} />
							<AvatarFallback className="bg-sidebar rounded-2xl text-sidebar-foreground">
								{getInitials(user?.name)}
							</AvatarFallback>
						</Avatar>
						{!isExpanded || (
							<>
								<div className="grid flex-1 text-left text-sm leading-tight">
									<span className="text-sidebar-foreground truncate font-semibold">
										{user?.name}
									</span>
									<span className="text-sidebar-foreground/50 truncate text-xs">
										{user?.email}
									</span>
								</div>
								<Icons.ChevronDown className="text-sidebar-foreground/50 ml-auto size-4" />
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
