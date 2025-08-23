import { useTRPC } from "@/trpc/client";
import { toast } from "@gnd/ui/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

interface Props {
    enableCategoryList?: boolean;
}
export function useInventoryTrpc(props: Props = {}) {
    const trpc = useTRPC();
    const qc = useQueryClient();
    const { mutate: mutateDeleteCategory } = useMutation(
        trpc.inventories.deleteInventoryCategory.mutationOptions({
            onSuccess(data, variables, context) {
                toast({
                    title: "Deleted",
                    variant: "destructive",
                });
                ctx.refreshCategories();
                ctx.refreshInventories();
            },
            onError(error, variables, context) {
                toast({
                    title: "Unable to complete",
                });
            },
        }),
    );
    const { mutate: mutateUpdateVariantStatus } = useMutation(
        trpc.inventories.updateVariantStatus.mutationOptions({
            onSuccess(data, variables, context) {
                toast({
                    title: "Updated",
                    variant: "success",
                });
                ctx.refreshCategories();
                ctx.refreshInventories();
                ctx.refreshKeys("inventoryVariantStockForm");
            },
            onError(error, variables, context) {
                toast({
                    title: "Unable to complete",
                });
            },
        }),
    );
    const deleteInventories = useMutation(
        trpc.inventories.deleteInventories.mutationOptions({
            onSuccess(data, variables, context) {
                toast({
                    title: "Deleted",
                    variant: "destructive",
                });
                ctx.refreshCategories();
                ctx.refreshInventories();
            },
            onError(error, variables, context) {
                toast({
                    title: "Unable to complete",
                });
            },
        }),
    );
    const { mutate: mutateDeleteInventories } = deleteInventories;
    const {
        data: categoryList,
        isPending,
        error,
    } = useQuery(
        trpc.inventories.getInventoryCategories.queryOptions(
            {},
            {
                enabled: props.enableCategoryList,
            },
        ),
    );
    const updateCategoryVariantAttribute =
        // {
        //     mutate: mutateUpdateCatVariantattr,
        //     isPending: isPendingUpdateCategoryVariantAttribute,
        // }
        useMutation(
            trpc.inventories.updateCategoryVariantAttribute.mutationOptions({
                onSuccess(data, variables, context) {
                    toast({
                        title: "",
                        variant: "success",
                        description: "",
                    });
                },
                onError(error, variables, context) {
                    toast({
                        title: "",
                        variant: "error",
                        description: "",
                    });
                },
            }),
        );
    const ctx = {
        categoryList,
        updateCategoryVariantAttribute,
        mutateUpdateVariantStatus,
        mutateDeleteInventories,
        deleteInventories,
        refreshKeysInfinite(...keys: (keyof typeof trpc.inventories)[]) {
            for (const k of keys) {
                qc.invalidateQueries({
                    queryKey: (trpc.inventories[k] as any).infiniteQueryKey(),
                });
            }
        },
        refreshKeys(...keys: (keyof typeof trpc.inventories)[]) {
            for (const k of keys) {
                qc.invalidateQueries({
                    queryKey: (trpc.inventories[k] as any).queryKey(),
                });
            }
        },
        refreshCategories: () => {
            ctx.refreshKeys("getInventoryCategories");
            ctx.refreshKeysInfinite("inventoryCategories");
        },
        refreshInventories: () => {
            ctx.refreshKeysInfinite("inventoryProducts");
            ctx.refreshKeys("inventorySummary");
        },
        // qc.invalidateQueries({
        // queryKey: trpc.inventories.inventoryProducts.queryKey(),
        // }),
        deleteCategory: (id) => mutateDeleteCategory({ id }),
        deleteInventory: (id) => mutateDeleteInventories({ ids: [id] }),
    };
    return ctx;
}

