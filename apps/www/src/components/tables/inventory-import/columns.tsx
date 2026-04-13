"use client";

import { Icons } from "@gnd/ui/icons";

import { TCell } from "@/components/(clean-code)/data-table/table-cells";
import { Progress } from "@gnd/ui/custom/progress";
import { ColumnDef } from "@/types/type";
import { RouterOutputs } from "@api/trpc/routers/_app";
import { Badge } from "@gnd/ui/badge";
import { cn } from "@gnd/ui/cn";
import { colorsObject, hexToRgba } from "@gnd/utils/colors";

export type Item =
    RouterOutputs["inventories"]["inventoryImports"]["data"][number];
interface ItemProps {
    item: Item;
}

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
            {item.scopeReason ? (
                <TCell.Secondary>{item.scopeReason}</TCell.Secondary>
            ) : null}
        </>
    ),
};
const productCount = {
    header: "Product Count",
    accessorKey: "productCount",
    meta: {},
    cell: ({ row: { original: item } }) => (
        <div className="min-w-24">
            <div className="text-center">
                <TCell.Primary>{item.totalProducts}</TCell.Primary>
                <TCell.Secondary>
                    {item.standardProducts || 0} standard •{" "}
                    {item.customProducts || 0} custom
                </TCell.Secondary>
            </div>
        </div>
    ),
};
const importedCountColumn = {
    header: "Imported Rows",
    accessorKey: "importedRows",
    meta: {},
    cell: ({ row: { original: item } }) => (
        <div className="min-w-24">
            <div className="text-center">
                <TCell.Primary>
                    {(item.importedStandardCount || 0) +
                        (item.importedCustomCount || 0)}
                </TCell.Primary>
                <TCell.Secondary>
                    {item.importedStandardCount || 0} standard •{" "}
                    {item.importedCustomCount || 0} custom
                </TCell.Secondary>
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
                    <Icons.CheckCircle className="size-3" />
                ) : (
                    <Icons.Clock className="size-3" />
                )}
                {item.categoryUid ? "Imported" : "Pending"}
            </Badge>
            {item.isDependencyOnly ? (
                <Badge variant="outline" className="ml-2">
                    Dependency
                </Badge>
            ) : null}
        </>
    ),
};
const scopeColumn = {
    header: "Scope",
    accessorKey: "scope",
    meta: {},
    cell: ({ row: { original: item } }) => (
        <div className="flex flex-wrap gap-2">
            <Badge variant={item.inScope ? "secondary" : "outline"}>
                {item.inScope ? "Active" : "Excluded"}
            </Badge>
            {item.isStaleImported ? (
                <Badge variant="destructive">Stale Import</Badge>
            ) : null}
        </div>
    ),
};
export const columns: ColumnDef<Item>[] = [
    categoryColumn,
    scopeColumn,
    statucColumn,
    productCount,
    importedCountColumn,
];
export const mobileColumn: ColumnDef<Item>[] = [
    {
        header: "",
        accessorKey: "row",
        meta: {
            className: "flex-1 p-0",
        },
        cell: ({ row: { original: item } }) => {
            return <ItemCard item={item} />;
        },
    },
];
function ItemCard({ item }: ItemProps) {
    return (
        <div className="flex flex-col space-y-2 p-3 border-b">
            <div className="flex items-center justify-between">
                <TCell.Primary>{item.title}</TCell.Primary>
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
                        <Icons.CheckCircle className="size-3" />
                    ) : (
                        <Icons.Clock className="size-3" />
                    )}
                    {item.categoryUid ? "Imported" : "Pending"}
                </Badge>
            </div>
            <Progress>
                <Progress.Status noDot>{item.subCategory}</Progress.Status>
            </Progress>
            <div className="flex flex-wrap gap-2">
                <Badge variant={item.inScope ? "secondary" : "outline"}>
                    {item.inScope ? "Active" : "Excluded"}
                </Badge>
                {item.isDependencyOnly ? (
                    <Badge variant="outline">Dependency</Badge>
                ) : null}
                {item.isStaleImported ? (
                    <Badge variant="destructive">Stale Import</Badge>
                ) : null}
            </div>
            {item.scopeReason ? (
                <TCell.Secondary>{item.scopeReason}</TCell.Secondary>
            ) : null}
            <TCell.Secondary>
                {item.totalProducts} products • {item.standardProducts || 0}{" "}
                standard • {item.customProducts || 0} custom
            </TCell.Secondary>
            <TCell.Secondary>
                Imported: {item.importedStandardCount || 0} standard •{" "}
                {item.importedCustomCount || 0} custom
            </TCell.Secondary>
        </div>
    );
}
