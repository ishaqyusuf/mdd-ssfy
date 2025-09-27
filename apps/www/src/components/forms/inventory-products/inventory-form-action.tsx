import { useInventoryParams } from "@/hooks/use-inventory-params";

import { Button } from "@gnd/ui/button";
import { SubmitButton } from "@/components/submit-button";
import { useTRPC } from "@/trpc/client";
import { useMutation } from "@tanstack/react-query";
import { toast } from "@gnd/ui/use-toast";
import { useInventoryForm } from "./form-context";
import { useInventoryTrpc } from "@/hooks/use-inventory-trpc";

export function InventoryFormAction({ onCancel }) {
    const { productId, mode, setParams } = useInventoryParams();
    const form = useInventoryForm();
    const isEditing = productId > 0;
    const trpc = useTRPC();
    const iTrpc = useInventoryTrpc();
    const {
        isPending: isSubmitting,
        mutate,
        error,
    } = useMutation(
        trpc.inventories.saveInventory.mutationOptions({
            onSuccess(data) {
                iTrpc.refreshInventories();
                toast({
                    title: "Saved",
                    variant: "success",
                });
                if (mode) {
                    setParams(null);
                    return;
                }
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
            mode,
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
                    onClick={(e) => {
                        setParams({
                            productId: -1,
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
                        {isEditing ? "Update Product" : "Create Product"}
                    </SubmitButton>
                </form>
            </div>
        </div>
    );
}

