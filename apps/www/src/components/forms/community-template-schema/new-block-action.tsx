"use client";
import Button from "@/components/common/button";
import { useInventoryParams } from "@/hooks/use-inventory-params";
import { Icons } from "@gnd/ui/icons";

export function NewBlockAction() {
    const { setParams } = useInventoryParams();
    return (
        <Button
            onClick={(e) => {
                setParams({
                    productId: -1,
                    mode: "community-section",
                });
            }}
        >
            <Icons.Add className="size-4" />
            <span>Add Block</span>
        </Button>
    );
}

