import { cn } from "@gnd/ui/cn";
import { Env } from "./env";
import { useTRPC } from "@/trpc/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@gnd/ui/button";
import { toast } from "@gnd/ui/use-toast";

export function InventoryShelfCategory({ categoryId }) {
    const trpc = useTRPC();
    const { data: inventoryType } = useQuery(
        trpc.inventories.getInventoryTypeByShelfId.queryOptions(
            {
                categoryId,
            },
            {
                enabled: !!categoryId,
            },
        ),
    );
    const qc = useQueryClient();
    const mut = useMutation(
        trpc.inventories.upsertShelfProducts.mutationOptions({
            onSuccess(data, variables, context) {
                console.log({ data });
                toast({
                    variant: "success",
                    title: "Indexed",
                });
                qc.invalidateQueries({
                    queryKey:
                        trpc.inventories.getInventoryTypeByShelfId.queryKey(),
                });
            },
            onError(error, variables, context) {
                console.log({ error });
                toast({
                    variant: "error",
                    title: "Error",
                });
            },
        }),
    );
    if (!categoryId) return null;
    return (
        <Env isDev>
            {inventoryType?.id ? (
                <div
                    className={cn(
                        "text-center text-xs uppercase",
                        inventoryType?.id ? "bg-green-200" : "bg-red-200",
                    )}
                >
                    {inventoryType?.id ? "indexed" : "not indexed"}
                </div>
            ) : (
                <Button
                    disabled={mut.isPending}
                    onClick={(e) => {
                        mut.mutate({
                            categoryId,
                        });
                    }}
                    className="w-full p-1 h-5"
                >
                    Create Index
                </Button>
            )}
        </Env>
    );
}

