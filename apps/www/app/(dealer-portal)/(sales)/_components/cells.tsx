"use client";

import {
    SalesCellProps,
    SalesCells,
} from "@/app/(v2)/(loggedIn)/sales/dashboard/_components/sales-cells";
import Button from "@/components/common/button";
import { TableCol } from "@/components/common/data-table/table-cells";
import { useModal } from "@/components/common/modal/provider";
import { SalesStatus } from "@/types/sales";

function Order({ item }: SalesCellProps) {
    const href = item.isDyke
        ? `/sales-form/${item.type}/${item.slug}`
        : `/sales-form/${item.type}/${item.slug}`;
    return <SalesCells.OrderDispatch item={item} href={href} />;
}
function DispatchStatus({ item }: SalesCellProps) {}
function OrderAction({ item }: SalesCellProps) {
    const status = item.status as SalesStatus;
    const noPayStatus: SalesStatus[] = ["Evaluating"];
    const modal = useModal();
    async function _pay() {}
    return (
        <TableCol>
            {item.amountDue > 0 && status != "Evaluating" && (
                <Button size="sm" action={_pay}>
                    <span>Pay</span>
                </Button>
            )}
        </TableCol>
    );
}
export let Cells = {
    Order,
    Invoice: SalesCells.Invoice,
    Address: SalesCells.Address,
    Customer: ({ item }) => <SalesCells.Customer item={item} noLink />,
    Dispatch: SalesCells.Dispatch,
    Status: SalesCells.SalesStatus,
    OrderAction,
};
