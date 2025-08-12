import { useInventoryParams } from "@/hooks/use-inventory-params";
import { useProduct } from "./context";
import { Button } from "@gnd/ui/button";
import { SubmitButton } from "@/components/submit-button";
import { useTRPC } from "@/trpc/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@gnd/ui/use-toast";
import { useInventoryForm } from "./form-context";
import { FormDebugBtn } from "@/components/form-debug-btn";
import { useDebugConsole } from "@/hooks/use-debug-console";

export function InventoryFormAction({ onCancel }) {
    const { productId, setParams } = useInventoryParams();
    const form = useInventoryForm();
    const isEditing = productId > 0;
    const trpc = useTRPC();
    const qc = useQueryClient();
    const {
        isPending: isSubmitting,
        mutate,
        error,
    } = useMutation(
        trpc.inventories.saveInventory.mutationOptions({
            onSuccess(data) {
                qc.invalidateQueries({
                    queryKey: trpc.inventories.inventoryProducts.queryKey(),
                });
                toast({
                    title: "Saved",
                    variant: "success",
                });
                if (productId != data.inventoryId)
                    setParams({
                        productId: data.inventoryId,
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
                    ? "Update your product information"
                    : "Create a new product"}
            </div>
            <div className="flex-1"></div>
            <div className="flex gap-3">
                <Button
                    type="button"
                    variant="outline"
                    onClick={onCancel}
                    disabled={isSubmitting}
                >
                    Cancel
                </Button>
                <FormDebugBtn />
                <form onSubmit={form.handleSubmit(onSubmit)}>
                    <SubmitButton
                        isSubmitting={isSubmitting}
                        className="min-w-[120px]"
                    >
                        {isEditing ? "Update Product" : "Create Product"}
                    </SubmitButton>
                </form>
            </div>
        </div>
    );
}

