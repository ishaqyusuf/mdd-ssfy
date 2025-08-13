"use client";

import { TCell } from "@/components/(clean-code)/data-table/table-cells";
import { Progress } from "@/components/(clean-code)/progress";

import { ColumnDef } from "@/types/type";
import { RouterOutputs } from "@api/trpc/routers/_app";
import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import { cn } from "@gnd/ui/cn";
import { colorsObject, getColor, hexToRgba } from "@gnd/utils/colors";
import { CheckCircle, Clock, Upload } from "lucide-react";

export type Item =
    RouterOutputs["inventories"]["inventoryImports"]["data"][number];

const categoryColumn = {
    header: "Category",
    accessorKey: "Category",
    meta: {},
    cell: ({ row: { original: item } }) => (
        <>
            <TCell.Primary>{item.title}</TCell.Primary>
            <TCell.Secondary>
                <Progress>
                    <Progress.Status noDot>{item.subCategory}</Progress.Status>
                </Progress>
            </TCell.Secondary>
        </>
    ),
};
const productCount = {
    header: "Product Count",
    accessorKey: "productCount",
    meta: {},
    cell: ({ row: { original: item } }) => (
        <div className="w-16">
            <div className="text-center">
                <TCell.Primary>{item.totalProducts}</TCell.Primary>
                <TCell.Secondary>products</TCell.Secondary>
            </div>
        </div>
    ),
};
const statucColumn = {
    header: "Import Status",
    accessorKey: "Import Status",
    meta: {},
    cell: ({ row: { original: item } }) => (
        <>
            <Badge
                style={{
                    backgroundColor: hexToRgba(
                        item?.categoryUid
                            ? colorsObject?.emerald
                            : colorsObject?.orange,
                        0.1,
                    ),
                    color: item?.categoryUid
                        ? colorsObject?.emerald
                        : colorsObject?.orange,
                }}
                className={cn("gap-1 px-1")}
            >
                {item.categoryUid ? (
                    <CheckCircle className="size-3" />
                ) : (
                    <Clock className="size-3" />
                )}
                {item.categoryUid ? "Imported" : "Pending"}
            </Badge>
        </>
    ),
};
const actionColumn = {
    header: "Action",
    accessorKey: "Action",
    meta: {},
    cell: ({ row: { original: item } }) => {
        const startImport = () => {};

        return (
            <div className="gap-4 flex justify-end">
                <Button
                    disabled={!!item?.categoryUid}
                    variant="default"
                    size="sm"
                    onClick={startImport}
                    className="gap-1"
                >
                    <Upload className="w-4 h-4" />
                    Import
                </Button>
            </div>
        );
    },
};
export const columns: ColumnDef<Item>[] = [
    categoryColumn,
    statucColumn,
    productCount,
    actionColumn,
];

