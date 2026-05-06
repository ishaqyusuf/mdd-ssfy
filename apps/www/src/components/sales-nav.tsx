"use client";

import { buttonVariants } from "@gnd/ui/button";
import { cn } from "@gnd/ui/cn";
import { NavigationMenu } from "@gnd/ui/namespace";
import Portal from "@gnd/ui/custom/portal";
import Link from "next/link";
import { AuthGuard } from "./auth-guard";
import { _perm } from "./sidebar-links";

export function SalesNav() {
    return (
        <AuthGuard rules={[_perm.is("editOrders")]}>
            <Portal nodeId={"navRightSlot"}>
                <NavigationMenu>
                    <NavigationMenu.List>
                        <NavigationMenu.Item>
                            <NavigationMenu.Link asChild>
                                <Link
                                    className={cn(
                                        buttonVariants({
                                            variant: "ghost",
                                        }),
                                    )}
                                    href="/sales-book/orders"
                                >
                                    Sales
                                </Link>
                            </NavigationMenu.Link>
                        </NavigationMenu.Item>
                        <NavigationMenu.Item>
                            <NavigationMenu.Link asChild>
                                <Link
                                    className={cn(
                                        buttonVariants({
                                            variant: "ghost",
                                        }),
                                    )}
                                    href="/sales-book/quotes"
                                >
                                    Quotes
                                </Link>
                            </NavigationMenu.Link>
                        </NavigationMenu.Item>
                    </NavigationMenu.List>
                </NavigationMenu>
            </Portal>
        </AuthGuard>
    );
}

