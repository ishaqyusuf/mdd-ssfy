import ConfirmBtn from "@/components/_v1/confirm-btn";
import TextWithTooltip from "@/components/(clean-code)/custom/text-with-tooltip";
import { TCell } from "@/components/(clean-code)/data-table/table-cells";
import { Progress } from "@/components/(clean-code)/progress";

import { GetProductionListPage } from "../../../_common/data-actions/production-actions/productions-list-action";
import { OrderCells } from "./orders-page-cells";

export interface ItemProps {
    item: GetProductionListPage["data"][number];
    itemIndex?;
}
export type SalesItemProp = ItemProps["item"];
function Date({ item }: ItemProps) {
    return (
        <TCell>
            <TCell.Primary className="font-mono">
                {item.alert.date ? (
                    <TCell.Date>{item.alert.date}</TCell.Date>
                ) : (
                    <>N/A</>
                )}
            </TCell.Primary>
            <TCell.Secondary className="flex gap-4 font-mono">
                {item.completed ? (
                    <></>
                ) : (
                    <TCell.Status
                        noDot
                        color={item.alert.color}
                        status={item.alert.text}
                    />
                )}
            </TCell.Secondary>
        </TCell>
    );
}
function Order({ item }: ItemProps) {
    return (
        <TCell>
            <TCell.Primary className="font-mono">{item.orderId}</TCell.Primary>
        </TCell>
    );
}
function Alert({ item }: ItemProps) {
    return (
        <TCell>
            <TCell.Secondary className="flex gap-4 font-mono">
                {item.completed ? (
                    <></>
                ) : (
                    <TCell.Status
                        color={item.alert.color}
                        status={item.alert.text}
                    />
                )}
            </TCell.Secondary>
        </TCell>
    );
}
function Assignments({ item }: ItemProps) {
    return (
        <TCell>
            <TCell.Primary className="flex gap-4 font-mono">
                <TCell.Status status={item.assignedTo} color={"gray"} />
            </TCell.Primary>
        </TCell>
    );
}
function Status({ item }: ItemProps) {
    // const status = `${item.stats?.prodCompleted?.score}/${item.stats?.prodCompleted?.total}`;
    const production = item.status?.production;
    return (
        <TCell>
            <Progress>
                <Progress.Status color={production?.color || production?.color}>
                    {production?.scoreStatus || production?.status}
                </Progress.Status>
            </Progress>
        </TCell>
    );
}
function AssignedTo({ item }: ItemProps) {
    return (
        <TCell>
            <TCell.Primary className="whitespace-nowrap uppercase">
                <TextWithTooltip
                    className="max-w-[185px]"
                    text={item.assignedTo}
                />
            </TCell.Primary>
        </TCell>
    );
}
function SalesRep({ item }: ItemProps) {
    return (
        <TCell>
            <TCell.Primary className="whitespace-nowrap uppercase">
                <TextWithTooltip
                    className="max-w-[85px]"
                    text={item.salesRep}
                />
            </TCell.Primary>
        </TCell>
    );
}
function Action({ item }: ItemProps) {
    return (
        <>
            {/* <ConfirmBtn trash size="icon" variant="ghost" /> */}
            {/* <div>a</div>
            <div>a</div> */}
        </>
    );
}
export let Cells = {
    Action,
    Date,
    Alert,
    Order,
    SalesRep,
    AssignedTo,
    Assignments,
    Status,
    Customer({ item }: ItemProps) {
        return (
            <TCell>
                <TCell.Primary>{item.customer}</TCell.Primary>
            </TCell>
        );
    },
};
