import { parseAsInteger, useQueryStates } from "nuqs";

export function useUnitProductionParams(options?: { shallow: boolean }) {
  const [params, setParams] = useQueryStates(
    {
      openUnitProductionId: parseAsInteger,
    },
    options,
  );

  return {
    ...params,
    setParams,
    opened: !!params.openUnitProductionId,
  };
}
