"use client";

import React from "react";
import Money from "@/components/_v1/money";
import { useDataPage } from "@/lib/data-page-context";

import { Badge } from "@gnd/ui/badge";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@gnd/ui/table";
import { TabsContent } from "@gnd/ui/tabs";

import { SalesOverviewType } from "../overview-shell";

export function ShelfItemsSalesOverviewTab() {
    const { data } = useDataPage<SalesOverviewType>();

    return (
        <TabsContent value="shelf-items">
            <Table>
                <TableHeader>
                    <TableHead>Item</TableHead>
                    <TableHead>Dimension</TableHead>
                    <TableHead>Left Hand</TableHead>
                    <TableHead>Right Hand</TableHead>
                    <TableHead>Rate</TableHead>
                    <TableHead>Total</TableHead>
                </TableHeader>
                <TableBody>
                    {data.doors.map((door) => (
                        <React.Fragment key={door.type}>
                            <TableRow>
                                <TableCell
                                    className="bg-secondary font-bold uppercase"
                                    colSpan={6}
                                >
                                    {door.type}
                                </TableCell>
                            </TableRow>
                            {door.housePackageTools.map((hpt) => (
                                <React.Fragment key={hpt.id}>
                                    {hpt.doors.map((door, doorIndex) => (
                                        <TableRow key={`door-${door.id}`}>
                                            <TableCell>
                                                {doorIndex == 0 &&
                                                    hpt.door?.title}
                                            </TableCell>
                                            <TableCell>
                                                {door.dimension}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant={"secondary"}>
                                                    {door.lhQty}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant={"secondary"}>
                                                    {door.rhQty}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <Money value={door.unitPrice} />
                                            </TableCell>
                                            <TableCell>
                                                <Money value={door.lineTotal} />
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </React.Fragment>
                            ))}
                        </React.Fragment>
                    ))}
                </TableBody>
            </Table>
        </TabsContent>
    );
}
