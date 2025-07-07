import { TableCol } from "@/components/common/data-table/table-cells";
import { DispatchProm } from "../[type]/dispatch-table-shell";

interface Props {
    item: DispatchProm["Item"];
}

function Order({ item }: Props) {
    return (
        <TableCol>
            <TableCol.Primary>{item.order.orderId}</TableCol.Primary>
            <TableCol.Secondary>
                {item.order.customer?.businessName || item.order.customer?.name}
            </TableCol.Secondary>
        </TableCol>
    );
}
function Recipient({ item }: Props) {
    return (
        <TableCol>
            <TableCol.Primary>{item.deliveredTo || "-"}</TableCol.Primary>
        </TableCol>
    );
}
function ApprovedBy({ item }: Props) {
    return (
        <TableCol>
            <></>
            {/* <TableCol.Primary>{item.approvedBy?.name || "-"}</TableCol.Primary> */}
        </TableCol>
    );
}
export let DispatchColumns = Object.assign(() => <></>, {
    Order,
    Recipient,
    ApprovedBy,
});
