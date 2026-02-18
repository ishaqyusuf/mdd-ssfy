import { useTRPC } from "@/trpc/client";
import { RouterOutputs } from "@api/trpc/routers/_app";
import { useMutation } from "@tanstack/react-query";

interface Props {
    onSuccess?: (data: RouterOutputs["dispatch"]["createDispatch"]) => void;
    onError?: (error: any) => void;
}
export function useSalesCreateDispatch({ onSuccess, onError }: Props = {}) {
    const {
        mutate: createDispatch,
        data,
        isPending: isCreating,
    } = useMutation(
        useTRPC().dispatch.createDispatch.mutationOptions({
            onSuccess(data) {
                console.log("created dispatch", data);
                onSuccess?.(data);
            },
            onError(error) {
                onError?.(error);
            },
        }),
    );
    return {
        createDispatch,
        data,
        isCreating,
    };
}

