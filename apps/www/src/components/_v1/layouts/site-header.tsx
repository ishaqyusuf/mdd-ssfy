"use client";

import Link from "next/link";
import { ModeToggle } from "@/components/(clean-code)/layouts/mode-toggle";
import { ISidebar } from "@/lib/navs";
import { cn } from "@/lib/utils";
import { LogOut } from "lucide-react";
import { useSession } from "next-auth/react";

import { Avatar, AvatarFallback, AvatarImage } from "@gnd/ui/avatar";
import { Button } from "@gnd/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuShortcut,
    DropdownMenuTrigger,
} from "@gnd/ui/dropdown-menu";

import { Icons } from "../icons";
import { MobileNav } from "../mobile-nav";
import Notifications from "../notification";

export default function SiteHeader({ nav }: { nav: ISidebar }) {
    const { data: session } = useSession();

    const name = session?.user?.name;
    const initials = `${name?.charAt(0) ?? ""} ${name?.charAt(1) ?? ""}`;
    return (
        <header
            className={cn(
                `flex flex-col border-b px-4`,
                nav.noSideBar && "lg:px-16",
            )}
        >
            <div className="flex h-14 items-center  space-x-3">
                <MobileNav nav={nav} />
                <div
                    className={cn(
                        !nav.noSideBar && "md:hidden",
                        "mr-4  h-10 w-10",
                    )}
                >
                    <Icons.logo />
                </div>
                <div
                    id="headerTitleSlot"
                    className="flex items-center space-x-1"
                />
                <div id="headerNav" className="flex items-center space-x-1" />
                <div id="breadCrumb" className="flex items-center space-x-1">
                    {/* <Breadcrumbs segments={navs} /> */}
                </div>
                <div className="flex-1" />
                <div className="inline-flex gap-4" id="actionNav"></div>
                <Notifications />
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button
                            variant="ghost"
                            className="relative h-8 w-8 rounded-full"
                        >
                            <Avatar className="h-9 w-9">
                                <AvatarImage
                                    // src="https://ui-avatars.com/api/?background=0D8ABC&color=fff"
                                    alt="@shadcn"
                                />
                                {/* <AvatarImage src="/avatars/03.png" alt="@shadcn" /> */}
                                <AvatarFallback>{initials}</AvatarFallback>
                            </Avatar>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                        className="w-56"
                        align="end"
                        forceMount
                    >
                        <DropdownMenuLabel className="font-normal">
                            <div className="flex flex-col space-y-1">
                                <p className="text-sm font-medium leading-none">
                                    {session?.user?.name}
                                </p>
                                <p className="text-xs leading-none text-muted-foreground">
                                    {session?.user?.email}
                                </p>
                            </div>
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {nav.noSideBar &&
                            nav.routeGroup.map((rg, index) => (
                                <DropdownMenuGroup key={index}>
                                    {rg?.routes?.map((r, index2) => (
                                        <Link href={`${r?.path}`} key={index2}>
                                            <DropdownMenuItem>
                                                <r.icon className="mr-2 h-4 w-4" />
                                                <span>{r.title}</span>
                                                <DropdownMenuShortcut>
                                                    ⇧⌘P
                                                </DropdownMenuShortcut>
                                            </DropdownMenuItem>
                                        </Link>
                                    ))}
                                </DropdownMenuGroup>
                            ))}
                        <DropdownMenuSeparator />
                        <Link href={`/signout`}>
                            <DropdownMenuItem onClick={() => {}}>
                                <LogOut className="mr-2 h-4 w-4" />
                                <span>Log out</span>
                                <DropdownMenuShortcut>⇧⌘Q</DropdownMenuShortcut>
                            </DropdownMenuItem>
                        </Link>
                    </DropdownMenuContent>
                </DropdownMenu>
                <ModeToggle />
            </div>
            <div className="overflow-auto" id="tab"></div>
        </header>
    );
}
