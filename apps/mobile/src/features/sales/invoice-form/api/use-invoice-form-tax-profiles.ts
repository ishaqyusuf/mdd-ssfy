import { _trpc } from "@/components/static-trpc";
import {
  normalizeSalesFormTaxOptions,
  resolveSalesFormTaxRateByCode,
} from "@gnd/sales/sales-form-core";
import { useQuery } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";

export function useInvoiceFormTaxProfiles() {
  const realTaxProfiles = useQuery(_trpc.customers.getTaxProfiles.queryOptions());

  const taxProfiles = useMemo(
    () =>
      normalizeSalesFormTaxOptions(realTaxProfiles.data || []),
    [realTaxProfiles.data],
  );
  const resolveTaxRate = useCallback(
    (taxCode?: string | null) =>
      resolveSalesFormTaxRateByCode(taxProfiles, taxCode),
    [taxProfiles],
  );

  return {
    taxProfiles,
    resolveTaxRate,
    isLoadingTaxProfiles: realTaxProfiles.isPending,
  };
}
