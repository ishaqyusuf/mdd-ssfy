"use client";

import { Icons } from "@gnd/ui/icons";

import { Avatar } from "@/components/avatar";
import Link from "@/components/link";
import { useAuth } from "@/hooks/use-auth";
import { useSidebar } from "@/hooks/use-sidebar";
import { useTestEmailMode } from "@/store/test-email-mode";
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
import { Switch } from "@gnd/ui/switch";

export function SidebarNavUser() {
	const { isExpanded, isMobile } = useSidebar();
	const user = useAuth();
	const ref = useRef<HTMLDivElement>(null);
	const testEmailMode = useTestEmailMode((state) => state.enabled);
	const setTestEmailMode = useTestEmailMode((state) => state.setEnabled);
	const isSuperAdmin = user.roleTitle?.toLowerCase() === "super admin";
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
					{isSuperAdmin ? (
						<>
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
							<DropdownMenuSeparator />
						</>
					) : null}
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
