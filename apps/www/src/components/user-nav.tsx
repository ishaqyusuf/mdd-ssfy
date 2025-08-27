import Link from "@/components/link";
import { getInitials } from "@/utils/format";
import { LayoutGrid, LogOut, User } from "lucide-react";
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
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@gnd/ui/tooltip";
import { useLinks } from "@/hooks/use-sidebar";
import { useAuth } from "@/hooks/use-auth";
import { Fragment } from "react";
import { Icon } from "./_v1/icons";

export function UserNav() {
    // const { data: session } = useSession();
    const auth = useAuth();
    const links = useLinks();
    console.log({ links });
    return (
        <DropdownMenu>
            <TooltipProvider disableHoverableContent>
                <Tooltip delayDuration={100}>
                    <TooltipTrigger asChild>
                        <DropdownMenuTrigger asChild>
                            <Button
                                variant="outline"
                                className="relative h-8 w-8 rounded-full"
                            >
                                <Avatar className="h-8 w-8">
                                    <AvatarImage src="#" alt="Avatar" />
                                    <AvatarFallback className="bg-transparent">
                                        {getInitials(auth?.name)}
                                    </AvatarFallback>
                                </Avatar>
                            </Button>
                        </DropdownMenuTrigger>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">Profile</TooltipContent>
                </Tooltip>
            </TooltipProvider>

            <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium leading-none">
                            {auth?.name}
                        </p>
                        <p className="text-xs leading-none text-muted-foreground">
                            {auth?.email}
                        </p>
                    </div>
                </DropdownMenuLabel>
                {!links.noSidebar ||
                    links.modules
                        .filter((a) => !!a.activeLinkCount)
                        .map((m, mi) => (
                            <Fragment key={mi}>
                                <DropdownMenuSeparator />
                                {m.sections
                                    .map((s) => s.links)
                                    .flat()
                                    .filter((a) => a.show)
                                    .map((ms, mi) => (
                                        <DropdownMenuItem key={mi}>
                                            {/* <DropdownMenuSeparator /> */}
                                            <Link
                                                href={ms.href}
                                                className="flex items-center"
                                            >
                                                <Icon
                                                    name={ms.icon}
                                                    className="size-4 mr-3 text-muted-foreground"
                                                />
                                                {ms.name}
                                            </Link>
                                        </DropdownMenuItem>
                                    ))}
                            </Fragment>
                        ))}
                <DropdownMenuSeparator />
                <Link href={`/signout`}>
                    <DropdownMenuItem onClick={() => {}}>
                        <LogOut className="mr-2 h-4 w-4" />
                        <span>Log out</span>
                        <DropdownMenuShortcut>⇧⌘Q</DropdownMenuShortcut>
                    </DropdownMenuItem>
                </Link>
                {/* <DropdownMenuItem
                    className="hover:cursor-pointer"
                    onClick={() => {

                    }}
                >
                    <LogOut className="size-4 mr-3 text-muted-foreground" />
                    Sign out
                </DropdownMenuItem> */}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
