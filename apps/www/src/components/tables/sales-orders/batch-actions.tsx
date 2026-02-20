import {
    BatchAction,
    BatchBtn,
    BatchDelete,
} from "@gnd/ui/custom/data-table/batch-action";
import { useRef } from "react";
import { SalesEmailMenuItem } from "@/components/sales-email-menu-item";
import { deleteSalesByOrderIds } from "@/app-deps/(clean-code)/(sales)/_common/data-actions/sales-actions";
import { useTable } from "@gnd/ui/data-table";
import { MenuItemPrintAction } from "@/components/menu-item-sales-print-action";
import { SalesPaymentProcessor } from "@/components/widgets/sales-payment-processor/sales-payment-processor";
import { sum } from "@gnd/utils";
import { _qc, _trpc } from "@/components/static-trpc";
import { invalidateInfiniteQueries } from "@/hooks/use-invalidate-query";
import { Item } from "./columns";

export function BatchActions({}) {
    const ctx = useTable();

    const selections = ctx.selectedRows.map((r) => r.original as Item);
    const slugs = selections?.map((r) => r?.orderId);
    const salesIds = selections?.map((r) => r?.id);

    const sameCustomers =
        [...new Set(selections?.map((a) => a?.accountNo))].length == 1 &&
        sum(selections?.map((a) => a?.due)) > 0;

    const item = selections?.[0];
    const buttonRef = useRef<HTMLButtonElement>(null);
    return (
        <>
            {!ctx.selectedRows?.length || (
                <BatchAction>
                    <BatchBtn
                        icon="print"
                        menu={
                            <>
                                <MenuItemPrintAction
                                    pdf
                                    type="order"
                                    salesIds={salesIds}
                                />
                                <MenuItemPrintAction
                                    type="order"
                                    salesIds={salesIds}
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
                    <SalesPaymentProcessor
                        phoneNo={item?.customerPhone}
                        selectedIds={salesIds}
                        customerId={item?.customerId}
                        buttonProps={{
                            variant: "ghost",
                        }}
                    ></SalesPaymentProcessor>
                    <BatchDelete
                        onClick={async () => {
                            await deleteSalesByOrderIds(slugs);
                            invalidateInfiniteQueries("sales.getOrders");
                        }}
                    />
                </BatchAction>
            )}
        </>
    );
}

