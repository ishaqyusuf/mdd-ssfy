import { useInventoryParams } from "@/hooks/use-inventory-params";
import { useProduct } from "./context";
import { Button } from "@gnd/ui/button";
import { SubmitButton } from "@/components/submit-button";
import { useTRPC } from "@/trpc/client";
import { useMutation } from "@tanstack/react-query";
import { toast } from "@gnd/ui/use-toast";

export function InventoryFormAction({ onCancel }) {
    const { productId, setParams } = useInventoryParams();
    const isEditing = productId > 0;
    const trpc = useTRPC();
    const { isPending: isSubmitting } = useMutation(
        trpc.inventories.saveInventory.mutationOptions({
            onSuccess(data) {
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
                <SubmitButton
                    type="submit"
                    form="product-form"
                    isSubmitting={isSubmitting}
                    className="min-w-[120px]"
                >
                    {isEditing ? "Update Product" : "Create Product"}
                </SubmitButton>
            </div>
        </div>
    );
}

