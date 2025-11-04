"use client";
import { ButtonGroup } from "@gnd/ui/button-group";
import { Tabs } from "@gnd/ui/composite";
import Portal from "@gnd/ui/custom/portal";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function SalesCustomTab({}) {
    const path = usePathname();
    return (
        <Portal noDelay nodeId="filterSlot">
            <Tabs.Root value={path}>
                <Tabs.List>
                    <Tabs.Trigger value="/sales-book/orders" asChild>
                        <Link href="/sales-book/orders">Sales</Link>
                    </Tabs.Trigger>
                    <Tabs.Trigger value="/sales-book/quotes" asChild>
                        <Link href="/sales-book/quotes">Quotes</Link>
                    </Tabs.Trigger>
                </Tabs.List>
            </Tabs.Root>
        </Portal>
    );
}

