import { BatchAction, BatchBtn, BatchDelete } from "../batch-action";
import { useMemo } from "react";
import { SalesEmailMenuItem } from "@/components/sales-email-menu-item";
import { deleteSalesByOrderIds } from "@/app/(clean-code)/(sales)/_common/data-actions/sales-actions";
import { useTable } from "@gnd/ui/custom/data-table/index";
import { MenuItemPrintAction } from "@/components/menu-item-sales-print-action";

export function BatchActions({}) {
    const ctx = useTable();
    const slugs = useMemo(() => {
        return ctx.selectedRows?.map((r) => (r.original as any)?.orderId);
    }, [ctx.selectedRows]);

    if (!ctx.selectedRows?.length) return null;

    return (
        <BatchAction>
            <BatchBtn
                icon="print"
                menu={
                    <>
                        <MenuItemPrintAction
                            slug={slugs.join(",")}
                            type="quote"
                        />
                        <MenuItemPrintAction
                            slug={slugs.join(",")}
                            type="quote"
                            pdf
                        />
                    </>
                }
            >
                Print
            </BatchBtn>
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

