"use client";

import { TCell } from "@/components/(clean-code)/data-table/table-cells";
import { Progress } from "@/components/(clean-code)/progress";
import ConfirmBtn from "@/components/confirm-button";
import { StockModeStatus } from "@/components/stock-mode-status";
import { useInventoryParams } from "@/hooks/use-inventory-params";
import { useInventoryTrpc } from "@/hooks/use-inventory-trpc";
import { cn } from "@/lib/utils";
import { ColumnDef } from "@/types/type";
import { RouterOutputs } from "@api/trpc/routers/_app";

import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import { Icons } from "@gnd/ui/icons";
import { imageUrl } from "@gnd/utils";
import { Eye, Package } from "lucide-react";

export type Item =
    RouterOutputs["inventories"]["inventoryProducts"]["data"][number];
export const columns: ColumnDef<Item>[] = [
    {
        header: "Product",
        accessorKey: "product",
        meta: {},
        cell: ({ row: { original: item } }) => <ProductCell item={item} />,
    },
    {
        header: "Status",
        accessorKey: "Status",
        cell: ({ row: { original: item } }) => (
            <>
                <Progress>
                    <Progress.Status>{item.status}</Progress.Status>
                </Progress>
            </>
        ),
    },
    {
        header: "Stock Mode",
        accessorKey: "Stock Mode",
        cell: ({ row: { original: item } }) => (
            <>
                <StockModeStatus status={item.stockMode} />
            </>
        ),
    },
    {
        header: "Variants",
        accessorKey: "Variants",
        meta: {
            className: "text-center",
        },
        cell: ({ row: { original: item } }) => (
            <>
                <TCell.Primary>{item.variantCount}</TCell.Primary>
            </>
        ),
    },
    {
        header: "Total Stock",
        accessorKey: "TotalStock",
        meta: {
            className: "text-center",
        },
        cell: ({ row: { original: item } }) => (
            <>
                <TCell.Secondary>{"N/A"}</TCell.Secondary>
            </>
        ),
    },
    {
        header: "Stock Value",
        accessorKey: "Stock Value",
        meta: {
            className: "text-end",
        },
        cell: ({ row: { original: item } }) => (
            <div className="flex justify-end gap-4">
                <TCell.Primary>
                    <TCell.Money>{item.stockValue}</TCell.Money>
                </TCell.Primary>
            </div>
        ),
    },
    {
        header: "",
        accessorKey: "action",
        meta: {
            actionCell: true,
            preventDefault: true,
        },
        cell: ({ row: { original: item } }) => {
            const { setParams } = useInventoryParams();
            const handleEditProduct = () => {
                setParams({
                    productId: item.id,
                });
            };
            const n = useInventoryTrpc();
            const handleDeleteProduct = () => {
                n.deleteInventory(item.id);
            };
            return (
                <div className="flex gap-2">
                    <Button variant="ghost" size="sm">
                        <Eye className="w-4 h-4" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleEditProduct}
                    >
                        <Icons.Edit className="w-4 h-4" />
                    </Button>
                    <ConfirmBtn trash onClick={handleDeleteProduct} />
                </div>
            );
        },
    },
];

function ProductCell({ item: product }: { item: Item }) {
    const handleEditProduct = () => {};
    return (
        <div className="flex items-center gap-3">
            <div
                className="w-12 h-12 rounded-md overflow-hidden bg-gray-100 flex-shrink-0 cursor-pointer hover:ring-2 hover:ring-blue-500 transition-all"
                onClick={handleEditProduct}
            >
                {product.img?.path ? (
                    <img
                        // src={`${product.img?.path}`}
                        src={imageUrl({
                            bucket: product.img.bucket,
                            path: product.img.path,
                            provider: product.img.provider,
                        })}
                        alt={product.title}
                        className="w-full h-full object-cover"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center">
                        <Package className="w-6 h-6 text-gray-400" />
                    </div>
                )}
            </div>
            <div>
                <div className="font-medium">{product.title}</div>
                <div className="flex gap-4">
                    <div className="text-sm text-gray-500">
                        {product.category}
                    </div>
                    {!product.stockStatus || (
                        <Badge
                            className="whitespace-nowrap"
                            variant="destructive"
                        >
                            {product.stockStatus}
                        </Badge>
                    )}
                </div>
                {product.images.length > 1 && (
                    <Badge variant="outline" className="text-xs mt-1">
                        +{product.images.length - 1} more
                    </Badge>
                )}
            </div>
        </div>
    );
}

