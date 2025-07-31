import { usePacking, usePackingItem } from "@/hooks/use-sales-packing";
import { Button } from "@gnd/ui/button";
import { Card } from "@gnd/ui/card";
import { cn } from "@gnd/ui/cn";
import { qtyHasHandle } from "@gnd/utils/sales";
import { Package } from "lucide-react";
import { QtyLabel } from "./qty-label";

export function PackingItem({}) {
    const packing = usePacking();
    const { item } = usePackingItem();

    const pendingQty = item?.nonDeliverableQty?.qty || 0;
    const availableQty = item?.deliverableQty;
    return (
        <div className="p-4 cursor-pointer hover:bg-muted bg-muted/10">
            <div
                onClick={(e) => {
                    if (item.uid === packing.packItemUid)
                        packing.setPackItemUid(null);
                    else packing.setPackItemUid(item.uid);
                }}
                className="flex  items-center justify-between mb-3"
            >
                <div className="flex-1">
                    <div className="flex items-start gap-2 mb-2">
                        <div className="flex-1">
                            <h4 className="font-medium text-sm leading-tight">
                                {item.title}
                            </h4>
                            <p className="text-xs text-muted-foreground mt-1 font-semibold uppercase">
                                {item.subtitle}
                            </p>
                        </div>
                    </div>

                    {/* Quantity Breakdown */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                        <div>
                            <span className="text-muted-foreground">
                                Available:{" "}
                            </span>
                            <span className="font-medium">
                                <QtyLabel {...availableQty} />
                            </span>
                        </div>
                        <div>
                            <span className="text-muted-foreground">
                                Listed:{" "}
                            </span>
                            <span className="text-green-600 font-medium">
                                <QtyLabel {...item.listedQty} />
                            </span>
                        </div>
                        <div>
                            <span className="text-muted-foreground">
                                Pending:{" "}
                            </span>
                            <span
                                className={
                                    item?.nonDeliverableQty?.qty > 0
                                        ? "text-amber-600 font-medium"
                                        : "text-muted-foreground"
                                }
                            >
                                <QtyLabel {...item.nonDeliverableQty} />
                            </span>
                        </div>
                        {/* <div>
                                <span className="text-muted-foreground">
                                    Total:{" "}
                                </span>
                                <span className="font-medium">
                                    {item?.totalQty?.qty}
                                </span>
                            </div> */}
                    </div>
                </div>

                <div className="flex items-center gap-2 ml-4">
                    {pendingQty > 0 && (
                        // !packingData &&
                        <Button
                            onClick={(e) => {
                                packing.setPackItemUid(item.uid);
                            }}
                            variant="outline"
                            size="sm"
                            disabled={packing.packItemUid == item.uid}
                            className={cn(
                                "flex items-center gap-1 bg-transparent",
                            )}
                            // onClick={onInitializePacking}
                        >
                            <Package className="h-4 w-4" />
                            <span>Pack</span>
                        </Button>
                    )}
                    <Button
                        variant="ghost"
                        size="sm"
                        // onClick={onToggleExpansion}
                    >
                        {/* {isExpanded ? (
                                <ChevronUp className="h-4 w-4" />
                            ) : (
                                <ChevronDown className="h-4 w-4" />
                            )} */}
                    </Button>
                </div>
            </div>

            {/* Item Progress Bar */}
            {/* {availableQty > 0 && (
                    <PackingProgressBar
                        totalItems={availableQty}
                        packedItems={listedQty}
                        showPercentage={false}
                        className="mt-2"
                    />
                )} */}
        </div>
    );
}

