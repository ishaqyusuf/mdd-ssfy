"use client";

import Link from "next/link";
import { Icons } from "@/components/_v1/icons";
import { LogOut, User2 } from "lucide-react";
import { useSession } from "next-auth/react";

import { Avatar, AvatarFallback, AvatarImage } from "@gnd/ui/avatar";
import { Button } from "@gnd/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuShortcut,
    DropdownMenuTrigger,
} from "@gnd/ui/dropdown-menu";

export default function AcccountHeader() {
    const { data: session } = useSession();
    const name = session?.user?.name;
    const initials = `${name?.charAt(0) ?? ""} ${name?.charAt(1) ?? ""}`;
    if (session?.user?.id)
        return (
            <>
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
                        {/* {nav.noSideBar &&
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
                          ))} */}
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
            </>
        );
    return (
        <Link href={"/login"} className="flex items-center space-x-2">
            <User2 className="size-4" />
            <span>My Account</span>
        </Link>
    );
}
