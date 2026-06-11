"use client";

import { Button } from "@gnd/ui/button";
import { ButtonGroup } from "@gnd/ui/button-group";
import { cn } from "@gnd/ui/cn";
import Portal from "@gnd/ui/custom/portal";
import { Separator } from "@gnd/ui/separator";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Fragment } from "react";

const salesCustomTabs = [
    { key: "orders", href: "/sales-book/orders/v2", label: "Sales" },
    { key: "quotes", href: "/sales-book/quotes", label: "quotes" },
];

export function SalesCustomTab({}) {
    const path = usePathname();
    return (
        <Portal noDelay nodeId="filterSlot">
            <ButtonGroup>
                {salesCustomTabs.map((tab, i) => (
                    <Fragment key={tab.key}>
                        <Button
                            asChild
                            className={cn(
                                "capitalize",
                                path.includes(tab.key) && "bg-green-600",
                            )}
                            variant={
                                path.includes(tab.key) ? "default" : "outline"
                            }
                        >
                            <Link href={tab.href}>{tab.label}</Link>
                        </Button>
                        {i != 0 || (
                            <Separator orientation="vertical"></Separator>
                        )}
                    </Fragment>
                ))}
            </ButtonGroup>
            {/* <Tabs.Root value={path}>
                <Tabs.List>
                    <Tabs.Trigger
                        className="bg-red-400"
                        value="/sales-book/orders"
                        asChild
                    >
                        <Link
                            className={cn({
                                variant: "default",
                            })}
                            href="/sales-book/orders"
                        >
                            Sales
                        </Link>
                    </Tabs.Trigger>
                    <Tabs.Trigger value="/sales-book/quotes" asChild>
                        <Link href="/sales-book/quotes">Quotes</Link>
                    </Tabs.Trigger>
                </Tabs.List>
            </Tabs.Root> */}
        </Portal>
    );
}
