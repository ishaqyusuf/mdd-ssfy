import { _trpc } from "@/components/static-trpc";
import { RouterInputs } from "@api/trpc/routers/_app";
import { useQuery } from "@tanstack/react-query";

type DispatchOverviewInput = RouterInputs["dispatch"]["dispatchOverviewV2"];

type UseDispatchOverviewOptions = {
  enabled?: boolean;
};

export function useDispatchOverview(
  input: DispatchOverviewInput,
  options?: UseDispatchOverviewOptions,
) {
  const enabled = (options?.enabled ?? true) && !!input?.dispatchId;

  return useQuery(
    _trpc.dispatch.dispatchOverviewV2.queryOptions(input, {
      enabled,
    }),
  );
}
