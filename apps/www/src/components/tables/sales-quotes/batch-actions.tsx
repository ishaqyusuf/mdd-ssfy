import {
    BatchAction,
    BatchBtn,
    BatchDelete,
} from "@gnd/ui/custom/data-table/batch-action";
import { SalesEmailMenuItem } from "@/components/sales-email-menu-item";
import { deleteSalesByOrderIds } from "@/app-deps/(clean-code)/(sales)/_common/data-actions/sales-actions";
import { useTable } from "@gnd/ui/data-table";
import { printQuote } from "@/utils/sales-invoice";
import { Button } from "@gnd/ui/button";
import { Icons } from "@gnd/ui/icons";
import { Download } from "lucide-react";
import { invalidateInfiniteQueries } from "@/hooks/use-invalidate-query";
import { Item } from "./columns";

export function BatchActions({}) {
    const ctx = useTable();
    const selections = ctx.selectedRows.map((r) => r.original as Item);
    const slugs = selections?.map((r) => r?.orderId);
    const salesIds = selections?.map((r) => r?.id);
    if (!ctx.selectedRows?.length) return null;

    return (
        <BatchAction>
            <Button
                // icon="print"
                variant="ghost"
                onClick={async (e) => {
                    await printQuote({
                        salesIds,
                        preview: true,
                    });
                }}
            >
                <Icons.print className="size-4 mr-2" />
                Print
            </Button>
            <Button
                // icon="print"
                variant="ghost"
                onClick={async (e) => {
                    await printQuote({
                        salesIds,
                        preview: false,
                    });
                }}
            >
                <Download className="size-4 mr-2" />
                Download
            </Button>
            <BatchBtn
                icon="Email"
                menu={
                    <>
                        <SalesEmailMenuItem
                            asChild
                            salesType="quote"
                            orderNo={slugs}
                        />
                    </>
                }
            >
                Email
            </BatchBtn>
            <BatchDelete
                onClick={async () => {
                    await deleteSalesByOrderIds(slugs);
                    invalidateInfiniteQueries("sales.quotes");
                }}
            />
        </BatchAction>
    );
}

