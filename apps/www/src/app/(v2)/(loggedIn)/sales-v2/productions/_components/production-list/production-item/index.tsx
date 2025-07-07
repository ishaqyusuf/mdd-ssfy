"use client";

import { TableCol } from "@/components/common/data-table/table-cells";
import { ProductionListItemType } from "..";

interface Props {
    item: ProductionListItemType;
}
export default function ProductionItem({ item }: Props) {
    return (
        <div className="p-2 px-4 border-b">
            <div className="text-sm  flex space-x-4">
                <div className="w-[200px] bg-red-300s">
                    <TableCol.Primary className={"truncate"}>
                        {item.customer?.businessName || item.customer?.name}
                    </TableCol.Primary>
                    <TableCol.Secondary>{item.orderId}</TableCol.Secondary>
                </div>
                <div className="w-[200px]">
                    <TableCol.Secondary>
                        {item.salesRep?.name}
                    </TableCol.Secondary>
                </div>
                <div className="flex-1"></div>
                <div className="">
                    {/* <TableCol.Status status={item.productionStatus?.status} /> */}
                </div>
            </div>
        </div>
    );
}
