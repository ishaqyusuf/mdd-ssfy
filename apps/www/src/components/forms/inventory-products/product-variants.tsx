import type {
    InventoryProductFormVariantRow,
    InventoryProductFormVariantStatus,
} from "@/components/tables-2/inventory-product-form-variants/columns";
import { DataTable as InventoryProductFormVariantsTable } from "@/components/tables-2/inventory-product-form-variants/data-table";
import { useInventoryParams } from "@/hooks/use-inventory-params";
import { useInventoryTrpc } from "@/hooks/use-inventory-trpc";
import { Button } from "@gnd/ui/button";
import { cn } from "@gnd/ui/cn";
import { Icons } from "@gnd/ui/icons";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@gnd/ui/tabs";
import { useMemo } from "react";
import {
    VariantProvider,
    useProduct,
    useProductVariants,
    useVariant,
} from "./context";
import { VariantFilters } from "./variant-filters";
import { VariantPricingTab } from "./variant-pricing-tab";

export function ProductVariants() {
    const ctx = useProductVariants();
    const product = useProduct();
    const { editVariantUid, setParams } = useInventoryParams();
    const invTrpc = useInventoryTrpc();
    const selectedVariant = useMemo(
        () => ctx.filteredData.find((row) => row.uid === editVariantUid) || null,
        [ctx.filteredData, editVariantUid],
    );
    const handleToggleVariant = (row: InventoryProductFormVariantRow) => {
        setParams(
            row.uid !== editVariantUid
                ? {
                      editVariantTab: "pricing",
                      editVariantUid: row.uid,
                  }
                : {
                      editVariantTab: null,
                      editVariantUid: null,
                  },
        );
    };
    const handleStatusChange = (
        row: InventoryProductFormVariantRow,
        status: InventoryProductFormVariantStatus,
    ) => {
        invTrpc.mutateUpdateVariantStatus({
            status,
            attributes: row.attributes,
            variantId: row.variantId,
            uid: row.uid,
            inventoryId: row.inventoryId,
        });
    };

    return (
        <div className="relative">
            <VariantFilters />
            {!ctx.hasSearchFilters && !ctx.unfilteredList?.length ? (
                <NoActiveVariants />
            ) : ctx?.hasSearchFilters && !ctx.filteredData?.length ? (
                <EmptyState />
            ) : (
                <>
                    <div className="pb-3 text-sm text-muted-foreground">
                        Showing {ctx.filteredData.length} variants
                    </div>
                    <InventoryProductFormVariantsTable
                        data={ctx.filteredData}
                        stockMonitor={product.stockMonitor}
                        selectedVariantUid={editVariantUid}
                        onToggleVariant={handleToggleVariant}
                        onStatusChange={handleStatusChange}
                    />
                    {!selectedVariant ? null : (
                        <VariantProvider
                            key={selectedVariant.uid}
                            args={[
                                {
                                    data: selectedVariant,
                                },
                            ]}
                        >
                            <VariantDetailPanel
                                onClose={() =>
                                    setParams({
                                        editVariantTab: null,
                                        editVariantUid: null,
                                    })
                                }
                            />
                        </VariantProvider>
                    )}
                </>
            )}
        </div>
    );
}

function VariantDetailPanel({ onClose }: { onClose: () => void }) {
    const { data } = useVariant();

    return (
        <div className="mt-3 overflow-hidden rounded-md border border-border bg-background">
            <div className="flex min-w-0 items-center justify-between gap-3 border-b border-border px-3 py-2">
                <div className="min-w-0">
                    <div className="truncate text-sm font-semibold uppercase">
                        {data?.title || "DEFAULT"}
                    </div>
                    <div className="truncate text-xs text-muted-foreground">
                        {data?.uid || "Variant pricing"}
                    </div>
                </div>
                <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    aria-label={`Close ${data?.title || "variant"} pricing`}
                    onClick={onClose}
                >
                    <Icons.X className="size-3" />
                </Button>
            </div>
            <div className="p-3">
                <Tabs defaultValue="price">
                    <TabsList>
                        <TabsTrigger value="price">
                            <Icons.ChartSpline className="mr-2 size-4" />
                            Pricing
                        </TabsTrigger>
                        <TabsTrigger value="inbound">
                            <Icons.inbound className="mr-2 size-4" />
                            Stock Inbound
                        </TabsTrigger>
                        <TabsTrigger value="movement">
                            <Icons.project className="mr-2 size-4" />
                            Stock Movement
                        </TabsTrigger>
                        <TabsTrigger value="overview">
                            <Icons.project className="mr-2 size-4" />
                            Stock Overview
                        </TabsTrigger>
                    </TabsList>
                    <TabsContent value="price">
                        <VariantPricingTab />
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}

function NoActiveVariants() {
    const ctx = useProductVariants();
    // design a no active variants empty state, with information about drafted variants and inactive variants;
    const inactiveCount = ctx.unfilteredList?.filter(
        (a) => !a.variantId,
    )?.length;
    const draftCount = ctx.unfilteredList?.filter(
        (a) => a.variantId && a.status === "draft",
    )?.length;

    let message = "";
    if (draftCount > 0 && inactiveCount > 0) {
        message = `You have ${draftCount} draft variant(s) and ${inactiveCount} inactive variant(s).`;
    } else if (draftCount > 0) {
        message = `You have ${draftCount} draft variant(s).`;
    } else if (inactiveCount > 0) {
        message = `You have ${inactiveCount} inactive variant(s).`;
    }

    return (
        <div className={cn("flex h-[30vh] items-center justify-center")}>
            <div className="flex flex-col items-center text-center">
                <Icons.products className="mb-4" />
                <div className="mb-6 space-y-2">
                    <h2 className="text-lg font-medium">No active variants</h2>
                    <p className="text-sm text-[#606060]">
                        There are no active variants to display.
                    </p>
                    {message && (
                        <p className="text-sm text-[#606060]">{message}</p>
                    )}
                </div>
            </div>
        </div>
    );
}
function EmptyState() {
    // if (!props.empty) return props.children;

    return (
        <div className={cn("flex h-[30vh] items-center justify-center")}>
            <div className="flex flex-col items-center">
                <Icons.products className="mb-4" />
                <div className="mb-6 space-y-2 text-center">
                    <h2 className="text-lg font-medium">{"No results"}</h2>
                    <p className="text-sm text-[#606060]">
                        {"You have not created any data yet"}
                    </p>
                </div>
            </div>
        </div>
    );
}
