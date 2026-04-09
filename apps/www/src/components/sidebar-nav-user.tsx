"use client";

import { Icons } from "@gnd/ui/icons";

import { Avatar } from "@/components/avatar";
import Link from "@/components/link";
import { useAuth } from "@/hooks/use-auth";
import { useSidebar } from "@/hooks/use-sidebar";
import { useRef } from "react";

import { Button } from "@gnd/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@gnd/ui/dropdown-menu";

export function SidebarNavUser() {
	const { isExpanded, isMobile } = useSidebar();
	const user = useAuth();
	const ref = useRef<HTMLDivElement>(null);
	return (
		<div className="relative h-[40px] " ref={ref}>
			<div className="fixed left-[19px] bottom-4 w-[32px] h-[32px]">
				<div className="relative w-[32px] h-[32px]" />
			</div>
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<Button
						size="lg"
						variant="link"
						className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground flex gap-2 px-2 w-full"
					>
						<Avatar
							url={user.avatar}
							name={user.name}
							email={user.email}
							shape="square"
							className="h-8 w-8"
						/>
						{!isExpanded || (
							<>
								<div className="grid flex-1 text-left text-sm leading-tight">
									<span className="truncate font-semibold">{user.name}</span>
									<span className="truncate text-xs">{user.email}</span>
								</div>
								<Icons.ChevronsUpDown className="ml-auto size-4" />
							</>
						)}
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent
					className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
					side={isMobile ? "bottom" : "right"}
					align="end"
					sideOffset={4}
				>
					<DropdownMenuLabel className="p-0 font-normal">
						<div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
							<Avatar
								url={user.avatar}
								name={user.name}
								email={user.email}
								shape="square"
								className="h-8 w-8"
							/>
							<div className="grid flex-1 text-left text-sm leading-tight">
								<span className="truncate font-semibold">{user.name}</span>
								<span className="truncate text-xs">{user.email}</span>
							</div>
						</div>
					</DropdownMenuLabel>
					<DropdownMenuSeparator />
					{/* <DropdownMenuGroup>
                            <DropdownMenuItem>
                                <Sparkles />
                                Upgrade to Pro
                            </DropdownMenuItem>
                        </DropdownMenuGroup>
                        <DropdownMenuSeparator />
                        <DropdownMenuGroup>
                            <DropdownMenuItem>
                                <BadgeCheck />
                                Account
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                                <CreditCard />
                                Billing
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                                <Bell />
                                Notifications
                            </DropdownMenuItem>
                        </DropdownMenuGroup>
                        <DropdownMenuSeparator /> */}
					<Link href="/signout">
						<DropdownMenuItem>
							<Icons.LogOut className="size-4 mr-2" />
							Log out
						</DropdownMenuItem>
					</Link>
				</DropdownMenuContent>
			</DropdownMenu>
		</div>
	);
}
