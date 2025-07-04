import { TableCell } from "@/app/_components/data-table/table-cells";
import { GetDispatchSalesAction } from "../_actions/get-dispatchs";

interface CellProps {
    item: GetDispatchSalesAction["data"][number];
}
function Order({ item }: CellProps) {
    return (
        <TableCell>
            <div>{item.orderId}</div>
        </TableCell>
    );
}
function Customer({ item }: CellProps) {
    return (
        <TableCell>
            <TableCell.Primary>
                {item.shippingAddress?.name || item.customer?.name}
            </TableCell.Primary>
            <TableCell.Secondary>
                {item.shippingAddress?.address1}
            </TableCell.Secondary>
        </TableCell>
    );
}
function ProductionStatus({ item }: CellProps) {
    // ready for delivery, 2/4 delivered
    return <TableCell></TableCell>;
}
function DeliveryStatus({ item }: CellProps) {
    // ready for delivery, 2/4 delivered
    return <TableCell></TableCell>;
}
function DispatchType({ item }: CellProps) {
    return (
        <TableCell>
            <TableCell.Status status={item.deliveryOption || "Set dispatch"} />
        </TableCell>
    );
}
function Actions({ item }: CellProps) {
    return <TableCell></TableCell>;
}
export let Cells = {
    Order,
    Customer,
    DeliveryStatus,
    ProductionStatus,
    DispatchType,
    Actions,
};
