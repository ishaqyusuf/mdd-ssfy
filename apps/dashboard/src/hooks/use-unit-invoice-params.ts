import { parseAsInteger, useQueryStates } from "nuqs";

export function useUnitInvoiceParams(options?: { shallow: boolean }) {
  const [params, setParams] = useQueryStates(
    {
      editUnitInvoiceId: parseAsInteger,
    },
    options,
  );

  return {
    ...params,
    setParams,
    opened: !!params.editUnitInvoiceId,
  };
}
