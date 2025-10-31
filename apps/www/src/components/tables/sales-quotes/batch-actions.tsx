import {
    BatchAction,
    BatchBtn,
    BatchDelete,
} from "@gnd/ui/custom/data-table/batch-action";
import { useMemo } from "react";
import { SalesEmailMenuItem } from "@/components/sales-email-menu-item";
import { deleteSalesByOrderIds } from "@/app-deps/(clean-code)/(sales)/_common/data-actions/sales-actions";
import { useTable } from "@gnd/ui/data-table";
import { MenuItemPrintAction } from "@/components/menu-item-sales-print-action";
import { printQuote } from "@/utils/sales-invoice";
import { Button } from "@gnd/ui/button";
import { Icons } from "@gnd/ui/custom/icons";
import { Download } from "lucide-react";

export function BatchActions({}) {
    const ctx = useTable();
    const slugs = useMemo(() => {
        return ctx.selectedRows?.map((r) => (r.original as any)?.orderId);
    }, [ctx.selectedRows]);
    const salesIds = ctx.selectedRows?.map((c) => c?.original?.id);
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
                // menu={
                //     <>
                //         <MenuItemPrintAction
                //             slug={slugs.join(",")}
                //             type="quote"
                //         />
                //         <MenuItemPrintAction
                //             slug={slugs.join(",")}
                //             type="quote"
                //             pdf
                //         />
                //     </>
                // }
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
                // menu={
                //     <>
                //         <MenuItemPrintAction
                //             slug={slugs.join(",")}
                //             type="quote"
                //         />
                //         <MenuItemPrintAction
                //             slug={slugs.join(",")}
                //             type="quote"
                //             pdf
                //         />
                //     </>
                // }
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
                }}
            />
        </BatchAction>
    );
}

