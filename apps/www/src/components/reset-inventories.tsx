import { useTRPC } from "@/trpc/client";
import { Button } from "@gnd/ui/button";
import { toast } from "@gnd/ui/use-toast";
import { useMutation } from "@tanstack/react-query";

export function ResetInventories() {
    const trpc = useTRPC();
    const { mutate, isPending, data, error } = useMutation(
        trpc.inventories.resetInventorySystem.mutationOptions({
            onSuccess(data, variables, context) {
                toast({
                    title: "Reset Complete",
                    variant: "success",
                    description: "",
                });
            },
            onError(error, variables, context) {
                toast({
                    title: "Error resetting",
                    variant: "error",
                    description: "",
                });
            },
        }),
    );

    return (
        <Button
            disabled={isPending}
            onClick={(e) => {
                mutate();
            }}
        >
            Reset
        </Button>
    );
}

