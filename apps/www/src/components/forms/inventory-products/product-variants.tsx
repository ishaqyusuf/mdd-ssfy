import { useTRPC } from "@/trpc/client";
import { useQuery } from "@tanstack/react-query";

export function ProductVariants({ inventoryId }) {
    const trpc = useTRPC();
    const { data } = useQuery(
        trpc.inventories.inventoryVariants.queryOptions(
            {
                id: inventoryId,
            },
            {
                enabled: !!inventoryId,
            },
        ),
    );

    return <div></div>;
}

