import { TCell } from "@/components/(clean-code)/data-table/table-cells";

import { Progress } from "@/components/(clean-code)/progress";

import { TransformedDispatchListItem } from "../../../_common/data-actions/dispatch-actions/dispatch-list-dto";
type ItemProps = {
    item: TransformedDispatchListItem;
};
function Status({ item }: ItemProps) {
    return (
        <TCell>
            <Progress.Status>{item.status || "queue"}</Progress.Status>
        </TCell>
    );
}

function Date({ item }: ItemProps) {
    return (
        <TCell>
            <TCell.Date>{item.createdAt}</TCell.Date>
        </TCell>
    );
}
function Order({ item }: ItemProps) {
    return (
        <TCell>
            <TCell.Primary>{item.order.orderId}</TCell.Primary>
        </TCell>
    );
}
function Customer({ item }: ItemProps) {
    return <TCell></TCell>;
}
function CustomerPhone({ item }: ItemProps) {
    return <TCell></TCell>;
}
function Address({ item }: ItemProps) {
    return (
        <TCell>
            {/* <TCell.Secondary>{item.shipping.address}</TCell.Secondary> */}
        </TCell>
    );
}
function SalesRep({ item }: ItemProps) {
    return (
        <TCell>
            <TCell.Secondary>{item.author?.name}</TCell.Secondary>
        </TCell>
    );
}
function DispatchId({ item }: ItemProps) {
    return (
        <TCell>
            <TCell.Secondary>{item.uid}</TCell.Secondary>
        </TCell>
    );
}
function DispatchMode({ item }: ItemProps) {
    return (
        <TCell>
            <TCell.Status
                status={item.deliveryMode}
                color={item.deliveryMode == "pickup" ? "red" : "purple"}
            />
        </TCell>
    );
}
function Dispatcher({ item }: ItemProps) {
    return (
        <TCell>
            <TCell.Status
                status={item.assignedTo?.name || "Not Assigned"}
                color={item.assignedTo?.id ? "red" : null}
            />
        </TCell>
    );
}
function Action({ item }: ItemProps) {
    return <TCell></TCell>;
}
export let DispatchCells = {
    Status,
    Action,
    DispatchMode,
    Dispatcher,
    SalesRep,
    Address,
    CustomerPhone,
    Customer,
    Order,
    DispatchId,
    Date,
};
