import { parseAsStringLiteral } from "nuqs/server";
import { useQueryStates } from "nuqs";

export const unitInvoiceReportTypes = ["invoice-aging"] as const;

export function useUnitInvoiceReportParams() {
  const [params, setParams] = useQueryStates({
    report: parseAsStringLiteral(unitInvoiceReportTypes),
  });

  return {
    ...params,
    setParams,
    opened: !!params.report,
  };
}
