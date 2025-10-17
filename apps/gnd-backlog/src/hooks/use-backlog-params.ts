import {
  parseAsBoolean,
  parseAsInteger,
  parseAsString,
  useQueryStates,
} from "nuqs";

export function useBacklogParams(options?: { shallow: boolean }) {
  const [params, setParams] = useQueryStates(
    {
      openBacklogId: parseAsInteger,
    },
    options
  );
  return {
    ...params,
    setParams,
    opened: !!params.openBacklogId,
  };
}
