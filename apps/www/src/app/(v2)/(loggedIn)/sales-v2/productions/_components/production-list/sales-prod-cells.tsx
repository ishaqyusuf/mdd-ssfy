"use client";

import { openSalesProductionModal } from "@/app/(clean-code)/(sales)/_common/_components/sales-overview-sheet.bin";
import {
    MenuItem,
    RowActionMoreMenu,
} from "@/components/_v1/data-table/data-table-row-actions";
import { TableCol } from "@/components/common/data-table/table-cells";
import { useSalesOverviewQuery } from "@/hooks/use-sales-overview-query";
import { cn, sum } from "@/lib/utils";
import { Dot } from "lucide-react";

import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";

import { ProductionListItemType } from ".";
import { useAssignment } from "../_modals/assignment-modal/use-assignment";

interface Props {
    item: ProductionListItemType;
}
function Order({ item }: Props) {
    return (
        <TableCol className="flex">
            {/* //shref={`/sales-v2/production/${item.slug}`}> */}
            {/* <div>
                <Dot
                    className={cn(
                        item.isDyke ? "text-blue-300" : "text-transparent"
                    )}
                />
            </div> */}
            <div>
                <TableCol.Primary className="line-clamp-1">
                    {item.customer?.businessName || item.customer?.name}
                </TableCol.Primary>
                <TableCol.Secondary className="line-clamp-1">
                    {item.orderId}{" "}
                    {item.isDyke && (
                        <span className="ml-2 rounded-md bg-[#adfa1d] px-1.5 py-0.5 text-xs leading-none text-[#000000] no-underline group-hover:no-underline">
                            v2
                        </span>
                    )}
                </TableCol.Secondary>
            </div>
        </TableCol>
    );
}
function SalesRep({ item }: Props) {
    return (
        <TableCol>
            <TableCol.Secondary>{item.salesRep?.name}</TableCol.Secondary>
        </TableCol>
    );
}
function Status({ item }: Props) {
    let status = "not assigned";
    let color = "red";
    let total = item._meta.totalDoors;
    let assigned = sum(item.assignments.map((a) => a.qtyAssigned));

    if (assigned > 0) {
        status =
            // assigned == total ? "Assigned" :
            // `${assigned}/${total} assigned`;
            "assigned";
        color = assigned == total ? "green" : "yellow";
    }

    // if(item.assignments.length)
    return (
        <>
            <TableCol.Status color={color} status={status} />
        </>
    );
}
function ProductionStatus({ item }: Props) {
    if (item.orderId == "24-0911-2301") {
        console.log(item);
    }
    const submitted = sum(
        item.assignments.map((a) =>
            sum(a.submissions.map((s) => sum([s.lhQty, s.rhQty]))),
        ),
    );
    const totalDoors = item._meta.totalDoors;
    // console.log(item.productionStatus?.status);
    if (submitted == totalDoors && totalDoors > 0)
        return <TableCol.Status status="Completed" />;
    return (
        <>
            <TableCol.Status
                score={submitted}
                total={totalDoors}
                // status={item.productionStatus?.status}
            />
        </>
    );
}
function AssignedTo({ item }: Props) {
    const assignment = useAssignment();
    const assignedTo = item.assignments?.filter(
        (a, i) =>
            i ==
            item.assignments.findIndex((b) => b.assignedToId == a.assignedToId),
    );
    return (
        <TableCol
            onClick={(e) => {
                assignment.open(item.id);
            }}
        >
            <TableCol.Secondary className="hover:cursor-pointer">
                {assignedTo.length ? (
                    <div className="flex flex-wrap items-center gap-1 space-x-2">
                        {assignedTo
                            ?.filter((_, i) => i < 2)
                            .map((user) => (
                                <Badge
                                    variant={"outline"}
                                    className="h-auto"
                                    key={user.id}
                                >
                                    <span className="line-clamp-2 max-w-[80px] whitespace-nowrap">
                                        {user.assignedTo?.name}
                                    </span>
                                </Badge>
                            ))}
                    </div>
                ) : (
                    <TableCol.Status status="Not Assigned" />
                )}
            </TableCol.Secondary>
        </TableCol>
    );
}
function Actions({ item }: Props) {
    const ctx = useSalesOverviewQuery();
    return (
        <>
            <Button
                onClick={() => {
                    ctx.open2(item.orderId, "sales-production");
                    // openSalesProductionModal({
                    //     salesId: item.id,
                    // });
                }}
                size={"sm"}
                className="h-8"
                variant={"default"}
            >
                View
            </Button>
            {/* <RowActionMoreMenu>
                <MenuItem>Mark as Completed</MenuItem>
            </RowActionMoreMenu> */}
        </>
    );
}
function ProdActions({ item }: Props) {
    const assignment = useAssignment({ type: "prod" });
    return (
        <>
            <Button
                onClick={() => assignment.open(item.id)}
                variant={"outline"}
            >
                View
            </Button>
        </>
    );
}
function DueDate({ item }: Props) {
    const dueDate = item.assignments
        .filter(
            (a) =>
                a.dueDate &&
                a.submissions.map((s) => s.qty).reduce((a, b) => a + b, 0) !=
                    a.qtyAssigned,
        )
        .sort((a, b) => (a as any).dueDate - (b as any).dueDate)?.[0]?.dueDate;
    return (
        <>
            <TableCol.Date>{dueDate}</TableCol.Date>
        </>
    );
}

export let ProductionCells = {
    Order,
    SalesRep,
    Status,
    ProductionStatus,
    AssignedTo,
    ProdActions,
    DueDate,
    Actions,
};
// export let ProductionCells = Object.assign(Base, {
//     Order,
//     Actions,
//     SalesRep,
//     Status,
//     AssignedTo,
//     ProductionStatus,
// });
