import { _trpc } from "@/components/static-trpc";
import {
  normalizeSalesFormTaxOptions,
  resolveSalesFormTaxRateByCode,
} from "@gnd/sales/sales-form-core";
import { useQuery } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";
import { invoiceTaxProfiles } from "../mock-data";
import { USE_MOCK_INVOICE_FORM } from "./config";

export function useInvoiceFormTaxProfiles() {
  const realTaxProfiles = useQuery({
    ..._trpc.customers.getTaxProfiles.queryOptions(),
    enabled: !USE_MOCK_INVOICE_FORM,
  });

  const taxProfiles = useMemo(
    () =>
      normalizeSalesFormTaxOptions(
        USE_MOCK_INVOICE_FORM ? invoiceTaxProfiles : realTaxProfiles.data || [],
      ),
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
    isLoadingTaxProfiles: USE_MOCK_INVOICE_FORM ? false : realTaxProfiles.isPending,
  };
}
