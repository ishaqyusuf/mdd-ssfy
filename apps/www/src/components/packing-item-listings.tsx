import { usePacking, usePackingItem } from "@/hooks/use-sales-packing";

export function PackingItemListings({}) {
    const packing = usePacking();
    const { item } = usePackingItem();
    if (!item?.packingHistory?.length)
        return (
            <div className="border-t flex justify-center p-4">
                <span className="text-sm text-muted-foreground  ">
                    No packing history found. Please add a packing item
                </span>
            </div>
        );
    return <div className="border-t p-4"></div>;
}

