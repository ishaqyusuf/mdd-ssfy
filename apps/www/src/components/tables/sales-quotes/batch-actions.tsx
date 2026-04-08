import {
    BatchAction,
    BatchDelete,
} from "@gnd/ui/custom/data-table/batch-action";
import { deleteSalesByOrderIds } from "@/app-deps/(clean-code)/(sales)/_common/data-actions/sales-actions";
import { useTable } from "@gnd/ui/data-table";
import { Button } from "@gnd/ui/button";
import { Icons } from "@gnd/ui/icons";
import { invalidateInfiniteQueries } from "@/hooks/use-invalidate-query";
import { Item } from "./columns";
import { SalesMenu } from "@/components/sales-menu";

export function BatchActions({}) {
    const ctx = useTable();
    const selections = ctx.selectedRows.map((r) => r.original as Item);
    const slugs = selections?.map((r) => r?.orderId);
    const salesIds = selections?.map((r) => r?.id);
    if (!ctx.selectedRows?.length) return null;

    return (
        <BatchAction>
            <SalesMenu
                type="quote"
                salesIds={salesIds}
                trigger={
                    <Button variant="ghost">
                        <Icons.Print className="size-4 mr-2" />
                        Print
                    </Button>
                }
            >
                <SalesMenu.QuotePrintMenuItems />
            </SalesMenu>
            <SalesMenu
                type="quote"
                salesIds={salesIds}
                trigger={
                    <Button variant="ghost">
                        <Icons.Email className="mr-2 size-4" />
                        Email
                    </Button>
                }
            >
                <SalesMenu.QuoteEmailMenuItems />
            </SalesMenu>
            <BatchDelete
                onClick={async () => {
                    await deleteSalesByOrderIds(slugs);
                    invalidateInfiniteQueries("sales.quotes");
                }}
            />
        </BatchAction>
    );
}
