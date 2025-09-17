import {
    BatchAction,
    BatchBtn,
    BatchDelete,
} from "@gnd/ui/custom/data-table/batch-action";
import { useMemo } from "react";
import { SalesEmailMenuItem } from "@/components/sales-email-menu-item";
import { PrintAction } from "@/app/(clean-code)/(sales)/_common/_components/overview-sheet.bin/footer/print.action";
import { deleteSalesByOrderIds } from "@/app/(clean-code)/(sales)/_common/data-actions/sales-actions";
import { useTable } from "@gnd/ui/custom/data-table/index";

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
                        <PrintAction
                            data={{
                                slugs: slugs,
                                item: {
                                    type: "order",
                                },
                            }}
                        />
                        <PrintAction
                            pdf
                            data={{
                                slugs: slugs,
                                item: {
                                    type: "order",
                                },
                            }}
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
                            salesType="order"
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

