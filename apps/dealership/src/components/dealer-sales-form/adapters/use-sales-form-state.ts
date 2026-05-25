"use client";

import {
  composeDealerSalesFormQuoteRecord,
  createInitialSalesFormState,
  hydrateSalesFormState,
  setSalesFormMeta,
  setSalesFormTaxRate,
  type DealerSalesFormQuoteSource,
  type SalesFormEditorState,
} from "@gnd/sales/sales-form";
import { useCallback, useMemo, useState } from "react";
import type { DealerSalesFormRecord, DealerSalesFormState } from "../types";

export function useDealerSalesFormState(initialCustomerId?: number | null) {
  const [state, setState] = useState<DealerSalesFormState>(() => ({
    ...(createInitialSalesFormState() as DealerSalesFormState),
    record: composeDealerSalesFormQuoteRecord(null, initialCustomerId),
  }));

  const hydrateQuote = useCallback(
    (source?: DealerSalesFormQuoteSource | null) => {
      const record = composeDealerSalesFormQuoteRecord(
        source,
        initialCustomerId,
      );
      setState(
        (current) =>
          hydrateSalesFormState(current, record) as DealerSalesFormState,
      );
    },
    [initialCustomerId],
  );

  const reset = useCallback(() => {
    hydrateQuote(null);
  }, [hydrateQuote]);

  const setCustomer = useCallback(
    (customerId: number | null, customerProfileId?: number | null) => {
      setState(
        (current) =>
          setSalesFormMeta(current, {
            customerId,
            customerProfileId:
              customerProfileId ??
              current.record?.form.customerProfileId ??
              null,
          }) as DealerSalesFormState,
      );
    },
    [],
  );

  const setCustomerProfile = useCallback((customerProfileId: number | null) => {
    setState(
      (current) =>
        setSalesFormMeta(current, {
          customerProfileId,
        }) as DealerSalesFormState,
    );
  }, []);

  const setTaxRate = useCallback((taxRate: number) => {
    setState(
      (current) =>
        setSalesFormTaxRate(current, taxRate) as DealerSalesFormState,
    );
  }, []);

  const setMeta = useCallback(
    (patch: Partial<DealerSalesFormRecord["form"]>) => {
      setState(
        (current) => setSalesFormMeta(current, patch) as DealerSalesFormState,
      );
    },
    [],
  );

  const setEditor = useCallback((patch: Partial<SalesFormEditorState>) => {
    setState((current) => ({
      ...current,
      editor: {
        ...current.editor,
        ...patch,
      },
    }));
  }, []);

  return useMemo(
    () => ({
      state,
      record: state.record,
      hydrateQuote,
      reset,
      setState,
      setCustomer,
      setCustomerProfile,
      setEditor,
      setMeta,
      setTaxRate,
    }),
    [
      hydrateQuote,
      reset,
      setCustomer,
      setCustomerProfile,
      setEditor,
      setMeta,
      setTaxRate,
      state,
    ],
  );
}
