"use client";

import { SalesMenu } from "@/components/sales-menu";
import { SalesOverviewVersionMenuItems } from "@/components/sales-overview-version-menu-items";
import { useSalesQueryClient } from "@/hooks/use-sales-query-client";
import { useTRPC } from "@/trpc/client";
import { Button } from "@gnd/ui/button";
import { Icons } from "@gnd/ui/icons";
import { toast } from "@gnd/ui/use-toast";
import { useMutation } from "@tanstack/react-query";

type SalesOrderActionItem = {
    id?: number | null;
    slug?: string | null;
    uuid?: string | null;
    email?: string | null;
    displayName?: string | null;
    orderId?: string | null;
};

export function SalesOrderMoreActionsMenu({
    item,
    open,
    onOpenChange,
}: {
    item: SalesOrderActionItem;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}) {
    return (
        <SalesMenu
            id={item.id ?? undefined}
            slug={item.slug ?? undefined}
            type="order"
            orderNo={item.orderId ?? null}
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
                type="order"
                uuid={item.uuid ?? undefined}
            />
            <SalesMenu.SalesEmailMenuItems />
            <SalesMenu.SalesPrintMenuItems />
            <SalesMenu.Copy />
            <SalesMenu.Move />
            <SalesMenu.Separator />
            <SalesMenu.Delete />
        </SalesMenu>
    );
}

export function SalesOrderRestoreAction({
    item,
}: {
    item: SalesOrderActionItem;
}) {
    const trpc = useTRPC();
    const sq = useSalesQueryClient();
    const restore = useMutation(
        trpc.sales.restore.mutationOptions({
            onSuccess: () => {
                sq.invalidate.salesList();
                toast({
                    title: "Sale restored",
                    description: item.orderId
                        ? `${item.orderId} is back in the order list.`
                        : "The sale is back in the order list.",
                });
            },
            onError: () => {
                toast({
                    title: "Unable to restore sale",
                    variant: "destructive",
                });
            },
        }),
    );

    return (
        <Button
            type="button"
            size="xs"
            variant="outline"
            disabled={!item.id || restore.isPending}
            onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                if (!item.id) return;
                restore.mutate({ salesId: item.id });
            }}
        >
            {restore.isPending ? (
                <Icons.Loader2 className="size-4 animate-spin" />
            ) : (
                <Icons.RotateCcw className="size-4" />
            )}
            <span className="sr-only">Restore</span>
        </Button>
    );
}
