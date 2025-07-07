"use client";

import { useEffect, useState } from "react";
import {
    DateCellContent,
    PrimaryCellContent,
} from "@/components/_v1/columns/base-columns";
import { HomeInvoiceColumn } from "@/components/_v1/columns/community-columns";
import { ExtendedHome, ICommunityTemplate } from "@/types/community";
import dayjs from "dayjs";
import { useForm } from "react-hook-form";

import { ScrollArea } from "@gnd/ui/scroll-area";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@gnd/ui/table";

interface Props {
    model: ICommunityTemplate;
    cost;
}
export default function CostUnits({ model, cost }: Props) {
    const [models, setModels] = useState<ExtendedHome[]>([]);
    useEffect(() => {
        // console.log(model.homes);
        // console.log([cost]);
        setModels(
            model.homes.filter((home) => {
                // return (
                //     (dayjs(home.createdAt).isSame(cost.startDate, "D") ||
                //         dayjs(home.createdAt).isAfter(cost.startDate, "D")) &&
                //     (!cost.endDate ||
                //         dayjs(home.createdAt).isSame(cost.endDate, "D") ||
                //         dayjs(home.createdAt).isBefore(cost.endDate, "D"))
                // );
                // console.log([home.createdAt, cost.startDate, cost.endDate]);
                return dayjs(home.createdAt).isBetween(
                    dayjs(cost.startDate),
                    dayjs(cost.endDate),
                    "D",
                );
            }),
        );
    }, [model, cost]);
    return (
        <ScrollArea className="h-[350px] max-h-[350px] w-full">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Unit</TableHead>
                        <TableHead align="right">Cost</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {models.map((model) => (
                        <TableRow key={model.id}>
                            <TableCell>
                                <PrimaryCellContent>
                                    {model.lot}
                                    {"/"}
                                    {model.block}
                                </PrimaryCellContent>
                                <DateCellContent>
                                    {model.createdAt}
                                </DateCellContent>
                            </TableCell>
                            <TableCell>
                                <HomeInvoiceColumn home={model} />
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </ScrollArea>
    );
}
