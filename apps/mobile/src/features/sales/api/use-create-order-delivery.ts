import { _qc, _trpc } from "@/components/static-trpc";
import { useMutation } from "@tanstack/react-query";

export function useCreateOrderDelivery(onSuccess?: (dispatchId: number) => void) {
  return useMutation(
    _trpc.dispatch.createDispatch.mutationOptions({
      async onSuccess(data) {
        await _qc.invalidateQueries({
          queryKey: _trpc.dispatch.orderDispatchOverview.queryKey(),
        });
        await _qc.invalidateQueries({
          queryKey: _trpc.sales.getSaleOverview.queryKey(),
        });
        onSuccess?.(data.id);
      },
    }),
  );
}
