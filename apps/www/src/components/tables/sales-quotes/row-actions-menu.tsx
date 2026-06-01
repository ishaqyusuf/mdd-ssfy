"use client";

import { SalesMenu } from "@/components/sales-menu";
import { SalesOverviewVersionMenuItems } from "@/components/sales-overview-version-menu-items";
import { Button } from "@gnd/ui/button";
import { Icons } from "@gnd/ui/icons";

type QuoteActionItem = {
    id?: number | null;
    slug?: string | null;
    uuid?: string | null;
    email?: string | null;
    displayName?: string | null;
};

export function QuoteRowActionsMenu({
    item,
    open,
    onOpenChange,
}: {
    item: QuoteActionItem;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}) {
    return (
        <SalesMenu
            id={item.id ?? undefined}
            slug={item.slug ?? undefined}
            type="quote"
            customerEmail={item.email ?? null}
            customerName={item.displayName}
            open={open}
            onOpenChange={onOpenChange}
            trigger={
                <Button size="xs" variant="outline">
                    <Icons.MoreHoriz className="size-4 text-muted-foreground" />
                </Button>
            }
        >
            <SalesOverviewVersionMenuItems
                type="quote"
                uuid={item.uuid ?? undefined}
            />
            <SalesMenu.QuoteEmailMenuItems />
            <SalesMenu.QuotePrintMenuItems />
            <SalesMenu.Copy />
            <SalesMenu.Move />
            <SalesMenu.Separator />
            <SalesMenu.Delete />
        </SalesMenu>
    );
}
