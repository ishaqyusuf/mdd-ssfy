import {
    BatchAction,
    BatchBtn,
    BatchDelete,
} from "@gnd/ui/custom/data-table/batch-action";
import { useMemo } from "react";
import { SalesEmailMenuItem } from "@/components/sales-email-menu-item";
import { deleteSalesByOrderIds } from "@/app/(clean-code)/(sales)/_common/data-actions/sales-actions";
import { useTable } from "@gnd/ui/data-table";
import { MenuItemPrintAction } from "@/components/menu-item-sales-print-action";
import { DropdownMenu } from "@gnd/ui/composite";
import { SuperAdminGuard } from "@/components/auth-guard";

export function BatchActions({}) {
    const ctx = useTable();
    const slugs = useMemo(() => {
        return ctx.selectedRows?.map((r) => (r.original as any)?.orderId);
    }, [ctx.selectedRows]);
    const salesIds = ctx.selectedRows?.map((c) => c?.original?.id);
    if (!ctx.selectedRows?.length) return null;

    return (
        <BatchAction>
            <BatchBtn
                icon="print"
                menu={
                    <>
                        <MenuItemPrintAction
                            slug={slugs.join(",")}
                            type="order"
                        />

                        <DropdownMenu.Separator />
                        <DropdownMenu.Group>
                            <MenuItemPrintAction
                                slug={slugs.join(",")}
                                type="order"
                                pdf
                            />
                            <SuperAdminGuard>
                                <MenuItemPrintAction
                                    type="order"
                                    salesIds={salesIds}
                                />
                            </SuperAdminGuard>
                        </DropdownMenu.Group>
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

