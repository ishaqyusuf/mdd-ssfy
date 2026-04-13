"use client";

import { Button } from "@gnd/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@gnd/ui/dropdown-menu";
import { Icons } from "@gnd/ui/icons";
import { InventorySearchFilter } from "./inventory-search-filter";
import { useInventoryParams } from "@/hooks/use-inventory-params";
import { useInventoryFilterParams } from "@/hooks/use-inventory-filter-params";
import { useTRPC } from "@/trpc/client";
import { useMutation } from "@gnd/ui/tanstack";
import { toast } from "@gnd/ui/use-toast";

export function InventoryHeader({}) {
    const { setParams } = useInventoryParams();
    const { filters, setFilters } = useInventoryFilterParams();
    const trpc = useTRPC();
    const backfillKinds = useMutation(
        trpc.inventories.backfillInventoryProductKinds.mutationOptions({
            onSuccess(data) {
                toast({
                    title: "Product types updated",
                    description: `${data.inventoryCount} inventory items, ${data.componentCount} components, ${data.unchangedCount} unchanged.`,
                    variant: "success",
                });
            },
        }),
    );
    const backfillImportSources = useMutation(
        trpc.inventories.backfillInventoryImportSources.mutationOptions({
            onSuccess(data) {
                toast({
                    title: "Import source labels updated",
                    description: `${data.updated} inventories updated from ${data.matched} Dyke component matches.`,
                    variant: "success",
                });
            },
        }),
    );
    const productKind = filters.productKind || "inventory";
    return (
        <div className="flex justify-between gap-4">
            <div className="flex items-center gap-3">
                <InventorySearchFilter />
                <div className="flex items-center gap-2 rounded-lg border p-1">
                    <Button
                        type="button"
                        size="sm"
                        variant={!filters.productKind ? "secondary" : "ghost"}
                        onClick={() => setFilters({ productKind: null })}
                    >
                        All
                    </Button>
                    <Button
                        type="button"
                        size="sm"
                        variant={
                            productKind === "inventory" ? "default" : "ghost"
                        }
                        onClick={() => setFilters({ productKind: "inventory" })}
                    >
                        Inventories
                    </Button>
                    <Button
                        type="button"
                        size="sm"
                        variant={
                            productKind === "component" ? "default" : "ghost"
                        }
                        onClick={() => setFilters({ productKind: "component" })}
                    >
                        Components
                    </Button>
                    <Button
                        type="button"
                        size="sm"
                        variant={filters.showCustom ? "default" : "ghost"}
                        onClick={() =>
                            setFilters({
                                showCustom: filters.showCustom ? null : true,
                            })
                        }
                    >
                        {filters.showCustom ? "Custom Visible" : "Show Custom"}
                    </Button>
                </div>
            </div>
            <div className="flex-1"></div>
            <div className="flex items-center gap-2">
                <Button
                    onClick={(e) => {
                        setParams({
                            productId: -1,
                            defaultValues: {
                                product: {
                                    productKind,
                                },
                            } as any,
                        });
                    }}
                >
                    <Icons.Add className="size-4 mr-2" />
                    <span>
                        {productKind === "component"
                            ? "Add Component"
                            : "Add Inventory"}
                    </span>
                </Button>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button type="button" variant="outline" size="icon">
                            <Icons.MoreHorizontal className="size-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem
                            disabled={backfillImportSources.isPending}
                            onClick={() => backfillImportSources.mutate()}
                        >
                            <Icons.Refresh className="size-4 mr-2" />
                            <span>Backfill Import Labels</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            disabled={backfillKinds.isPending}
                            onClick={() => backfillKinds.mutate()}
                        >
                            <Icons.Refresh className="size-4 mr-2" />
                            <span>Backfill Types</span>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </div>
    );
}
