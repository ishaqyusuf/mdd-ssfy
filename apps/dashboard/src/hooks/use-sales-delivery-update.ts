import { useTRPC } from "@/trpc/client";
import { UpdateSalesDeliveryOptionSchema } from "@api/schemas/sales";
import { useMutation, useQueryClient } from "@gnd/ui/tanstack";

interface Props {
    salesId;
    deliveryId?;
    defaultOption?;
    onSuccess?: (data?, variables?, context?) => void;
}
export function useSalesDeliveryUpdate(props: Props) {
    const trpc = useTRPC();
    const queryClient = useQueryClient();
    const action = useMutation(
        trpc.dispatch.updateSalesDeliveryOption.mutationOptions({
            onSuccess(data, variables, context) {
                queryClient.invalidateQueries({
                    queryKey: trpc.dispatch.salesDeliveryInfo.pathKey(),
                });
                props?.onSuccess?.(data, variables, context);
            },
        }),
    );
    const handleUpdate = (payload: UpdateSalesDeliveryOptionSchema) => {
        action.mutate({
            ...payload,
            salesId: props?.salesId,
            deliveryId: props?.deliveryId,
            defaultOption: props.defaultOption,
        });
    };
    return {
        update: handleUpdate,
    };
}

