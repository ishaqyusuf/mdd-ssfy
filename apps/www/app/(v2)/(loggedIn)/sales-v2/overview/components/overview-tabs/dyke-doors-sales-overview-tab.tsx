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

export function SalesOverviewDykeInvoiceTab() {
    const { data } = useDataPage<SalesOverviewType>();

    return (
        <TabsContent value="dyke-doors">
            {data.housePackageTools.map((hpt, index) => (
                <React.Fragment key={index}>
                    <Table key={index}>
                        <TableBody>
                            <React.Fragment>
                                <TableRow>
                                    <TableCell
                                        className="bg-secondary font-bold uppercase"
                                        colSpan={6}
                                    >
                                        {hpt.doorType}
                                    </TableCell>
                                </TableRow>
                                {/* {hpt.doors?.map((door, doorIndex) => ( */}
                                {/* <React.Fragment key={doorIndex}> */}
                                <TableRow>
                                    <TableCell colSpan={6}>
                                        <div className="grid grid-cols-2">
                                            {hpt.doorDetails
                                                .filter((d) => d.value)

                                                .map((detail) => (
                                                    <div
                                                        key={detail.title}
                                                        className="grid grid-cols-5 gap-2 border-b  border-r"
                                                    >
                                                        <div className="col-span-2 border-r  px-2 py-1 font-bold">
                                                            {detail.title}
                                                        </div>
                                                        <div className=" col-span-3 px-2 py-1">
                                                            {detail.value}
                                                        </div>
                                                    </div>
                                                ))}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            </React.Fragment>
                        </TableBody>
                    </Table>
                    <Table className="w-full ">
                        <TableBody>
                            <TableHeader>
                                <TableHead>Item</TableHead>
                                <TableHead>Dimension</TableHead>
                                <TableHead>Left Hand</TableHead>
                                <TableHead>Right Hand</TableHead>
                                <TableHead>Rate</TableHead>
                                <TableHead>Total</TableHead>
                            </TableHeader>
                            <TableBody>
                                {data.housePackageTools.map((hpt, index) => (
                                    <React.Fragment key={index}>
                                        {hpt.doors?.map((door, doorIndex) => (
                                            <TableRow key={`door-${doorIndex}`}>
                                                <TableCell>
                                                    {/* {doorIndex == 0 && hpt.door?.title} */}
                                                </TableCell>
                                                <TableCell>
                                                    {door.dimension}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge
                                                        variant={"secondary"}
                                                    >
                                                        {door.lhQty}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge
                                                        variant={"secondary"}
                                                    >
                                                        {door.rhQty}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <Money
                                                        value={door.unitPrice}
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <Money
                                                        value={door.totalPrice}
                                                    />
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </React.Fragment>
                                ))}
                            </TableBody>
                        </TableBody>
                    </Table>
                </React.Fragment>
            ))}
        </TabsContent>
    );
}
