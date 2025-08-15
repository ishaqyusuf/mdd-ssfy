import { useDebugConsole } from "@/hooks/use-debug-console";
import { useTRPC } from "@/trpc/client";
import { useQuery } from "@tanstack/react-query";

export function ProductVariants({ inventoryId }) {
    const trpc = useTRPC();
    const { data, error } = useQuery(
        trpc.inventories.inventoryVariants.queryOptions(
            {
                id: inventoryId,
            },
            {
                enabled: !!inventoryId,
            },
        ),
    );
    useDebugConsole({ data, error });
    return <div></div>;
}

