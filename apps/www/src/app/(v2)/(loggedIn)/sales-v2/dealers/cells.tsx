"use client";

import { TableCell } from "@/app/_components/data-table/table-cells";

import { Button } from "@gnd/ui/button";

import { GetDealersAction } from "./action";
import { useDealerSheet } from "./dealer-overview-sheet";

interface CellProps {
    item: GetDealersAction["data"][number];
}
function MainActions({ item }: CellProps) {
    const modal = useDealerSheet();

    return (
        <TableCell>
            <Button
                onClick={() => {
                    modal.open(item);
                }}
                size="sm"
                className="h-8"
                variant="outline"
            >
                Overview
            </Button>
        </TableCell>
    );
}
function Dealer({ item }: CellProps) {
    return (
        <TableCell>
            <TableCell.Primary>{item.dealer.businessName}</TableCell.Primary>
            <TableCell.Secondary>{item.dealer.name}</TableCell.Secondary>
        </TableCell>
    );
}
export let Cells = {
    Dealer,
    MainActions,
};
