import { useInventoryParams } from "@/hooks/use-inventory-params";
import { Button } from "@gnd/ui/button";
import { SubmitButton } from "@/components/submit-button";
import { useTRPC } from "@/trpc/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@gnd/ui/use-toast";
import { FormDebugBtn } from "@/components/form-debug-btn";
import { useInventoryCategoryForm } from "./form-context";
import { useInventoryCategoryParams } from "@/hooks/use-inventory-category-params";
import { useInventoryTrpc } from "@/hooks/use-inventory-trpc";

export function FormAction({ onCancel }) {
    const { editCategoryId, setParams } = useInventoryCategoryParams();
    const form = useInventoryCategoryForm();
    const isEditing = editCategoryId > 0;
    const trpc = useTRPC();
    // const qc = useQueryClient();
    const iTrpc = useInventoryTrpc();
    const {
        isPending: isSubmitting,
        mutate,
        error,
        data,
    } = useMutation(
        trpc.inventories.saveInventoryCategory.mutationOptions({
            onSuccess(data) {
                if (!isEditing) {
                    setParams({
                        editCategoryId: data.id,
                    });
                }
                iTrpc.refreshKeysInfinite("inventoryCategories");
                iTrpc.refreshKeys("getInventoryCategories");

                toast({
                    title: "Saved",
                    variant: "success",
                });
            },
        }),
    );
    const onSubmit = async (data) => {
        mutate({
            ...data,
        });
    };
    return (
        <div className="flex flex-1 py-4 items-center gap-4">
            <div className="text-sm text-muted-foreground">
                {isEditing
                    ? "Update your category information"
                    : "Create a new category"}
            </div>
            <div className="flex-1"></div>
            <div className="flex gap-3">
                <Button
                    type="button"
                    variant="outline"
                    onClick={(e) => {
                        setParams({
                            editCategoryId: -1,
                        });
                    }}
                    disabled={isSubmitting}
                >
                    New
                </Button>
                <form onSubmit={form.handleSubmit(onSubmit)}>
                    <SubmitButton
                        isSubmitting={isSubmitting}
                        className="min-w-[120px]"
                    >
                        {isEditing ? "Update Category" : "Create Category"}
                    </SubmitButton>
                </form>
            </div>
        </div>
    );
}

