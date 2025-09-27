"use client";
import Button from "@/components/common/button";
import { useTRPC } from "@/trpc/client";
import { Icons } from "@gnd/ui/icons";
import { useQuery } from "@tanstack/react-query";

export function NewBlockAction() {
    const trpc = useTRPC();
    const { data: blockInventories } = useQuery(
        trpc.inventories.inventoryProducts.queryOptions({}),
    );
    return (
        <Button>
            <Icons.Add className="size-4" />
            <span>Add Section</span>
        </Button>
    );
}

