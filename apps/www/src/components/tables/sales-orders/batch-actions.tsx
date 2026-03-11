import {
    BatchAction,
    BatchDelete,
} from "@gnd/ui/custom/data-table/batch-action";
import { deleteSalesByOrderIds } from "@/app-deps/(clean-code)/(sales)/_common/data-actions/sales-actions";
import { useTable } from "@gnd/ui/data-table";
import { SalesPaymentProcessor } from "@/components/widgets/sales-payment-processor/sales-payment-processor";
import { sum } from "@gnd/utils";
import { invalidateInfiniteQueries } from "@/hooks/use-invalidate-query";
import { Item } from "./columns";
import { Button } from "@gnd/ui/button";
import { Icons } from "@gnd/ui/icons";
import { SalesMenu } from "@/components/sales-menu";

export function BatchActions({}) {
    const ctx = useTable();

    const selections = ctx.selectedRows.map((r) => r.original as Item);
    const slugs = selections?.map((r) => r?.orderId);
    const salesIds = selections?.map((r) => r?.id);

    const sameCustomers =
        [...new Set(selections?.map((a) => a?.accountNo))].length == 1 &&
        sum(selections?.map((a) => a?.due)) > 0;

    const item = selections?.[0];
    return (
        <>
            {!ctx.selectedRows?.length || (
                <BatchAction>
                    <SalesMenu
                        type="order"
                        salesIds={salesIds}
                        trigger={
                            <Button variant="ghost">
                                <Icons.print className="mr-2 size-4" />
                                Print
                            </Button>
                        }
                    >
                        <SalesMenu.PDF />
                        <SalesMenu.Print />
                    </SalesMenu>
                    <SalesMenu
                        type="order"
                        salesIds={salesIds}
                        trigger={
                            <Button variant="ghost">
                                <Icons.Email className="mr-2 size-4" />
                                Email
                            </Button>
                        }
                    >
                        <SalesMenu.Notifications />
                        <SalesMenu.PaymentNotifications />
                    </SalesMenu>
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
