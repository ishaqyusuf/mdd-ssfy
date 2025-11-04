"use client";
import { Button } from "@gnd/ui/button";
import { ButtonGroup } from "@gnd/ui/button-group";
import { cn } from "@gnd/ui/cn";
import { Tabs } from "@gnd/ui/composite";
import Portal from "@gnd/ui/custom/portal";
import { Separator } from "@gnd/ui/separator";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Fragment } from "react";

export function SalesCustomTab({}) {
    const path = usePathname();
    return (
        <Portal noDelay nodeId="filterSlot">
            <ButtonGroup>
                {["orders", "quotes"].map((a, i) => (
                    <Fragment key={a}>
                        <Button
                            asChild
                            className={cn(
                                "capitalize",
                                path.includes(a) && "bg-green-600"
                            )}
                            variant={path.includes(a) ? "default" : "outline"}
                        >
                            <Link href={`/sales-book/${a}`} key={a}>
                                {i == 0 ? "Sales" : a}
                            </Link>
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

