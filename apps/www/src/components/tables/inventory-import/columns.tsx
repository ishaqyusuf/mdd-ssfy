"use client";

import { TCell } from "@/components/(clean-code)/data-table/table-cells";
import { Progress } from "@/components/(clean-code)/progress";
import { useTRPC } from "@/trpc/client";

import { ColumnDef } from "@/types/type";
import { RouterOutputs } from "@api/trpc/routers/_app";
import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import { cn } from "@gnd/ui/cn";
import { toast } from "@gnd/ui/use-toast";
import { colorsObject, hexToRgba } from "@gnd/utils/colors";
import { useMutation, useQueryClient } from "@tanstack/react-query";
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
        const trpc = useTRPC();
        const qc = useQueryClient();
        const mutationOptions = {
            onSuccess(data) {
                console.log({ SUCCESS: data });
                qc.invalidateQueries({
                    queryKey: trpc.inventories.inventoryImports.queryKey(),
                });
                qc.invalidateQueries({
                    queryKey: trpc.inventories.inventoryProducts.queryKey(),
                });
                toast({
                    title: "Import Successful",
                });
            },
            onError(error, variables, context) {
                console.log({ error, variables, context });
                toast({
                    title: "Import Failed",
                    variant: "destructive",
                });
            },
        };
        const importShelf = useMutation(
            trpc.inventories.upsertShelfProducts.mutationOptions(
                mutationOptions,
            ),
        );
        const importComponent = useMutation(
            trpc.inventories.upsertComponents.mutationOptions(mutationOptions),
        );
        const isPending = importComponent?.isPending || importShelf?.isPending;
        const startImport = () => {
            // if(item.subCategory === 'component')
            (item.subCategory === "component"
                ? importComponent
                : importShelf
            ).mutate({
                categoryId: item?.importCategoryId,
            });
        };

        return (
            <div className="gap-4 flex justify-end">
                <Button
                    disabled={!!item?.categoryUid || isPending}
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

