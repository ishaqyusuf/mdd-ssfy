import { _trpc } from "@/components/static-trpc";
import { RouterInputs } from "@api/trpc/routers/_app";
import { useQuery } from "@tanstack/react-query";

type DispatchOverviewInput = RouterInputs["dispatch"]["dispatchOverview"];

type UseDispatchOverviewOptions = {
  enabled?: boolean;
};

export function useDispatchOverview(
  input: DispatchOverviewInput,
  options?: UseDispatchOverviewOptions,
) {
  const enabled = (options?.enabled ?? true) && !!input?.dispatchId;

  return useQuery(
    _trpc.dispatch.dispatchOverview.queryOptions(input, {
      enabled,
    }),
  );
}
