import { useTRPC } from "@/trpc/client";
import { useMutation } from "@tanstack/react-query";

export function useSalesCreateDispatch() {
    const {
        mutate: createDispatch,
        data,
        isPending: isCreating,
    } = useMutation(
        useTRPC().dispatch.createDispatch.mutationOptions({
            onSuccess(data) {
                console.log("created dispatch", data);
            },
            onError(error) {
                console.error("failed to create dispatch", error);
            },
        }),
    );
    return {
        createDispatch,
        data,
        isCreating,
    };
}

