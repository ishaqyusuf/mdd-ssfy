import { useTable } from "..";
import { BatchAction, BatchBtn, BatchDelete } from "../batch-action";
import { useMemo } from "react";
import { SalesEmailMenuItem } from "@/components/sales-email-menu-item";
import { PrintAction } from "@/app/(clean-code)/(sales)/_common/_components/overview-sheet.bin/footer/print.action";
import { deleteSalesByOrderIds } from "@/app/(clean-code)/(sales)/_common/data-actions/sales-actions";
import { useInventoryTrpc } from "@/hooks/use-inventory-trpc";

export function BatchActions({}) {
    const ctx = useTable();
    const ids = useMemo(() => {
        return ctx.selectedRows?.map((r) => (r.original as any)?.id);
    }, [ctx.selectedRows]);

    const { mutateDeleteInventories } = useInventoryTrpc();
    if (!ctx.selectedRows?.length) return null;

    return (
        <BatchAction>
            {/* <BatchBtn
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
            </BatchBtn> */}
            {/* <BatchBtn
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
            </BatchBtn> */}
            <BatchDelete
                onClick={async () => {
                    mutateDeleteInventories({
                        ids,
                    });
                }}
            />
        </BatchAction>
    );
}

