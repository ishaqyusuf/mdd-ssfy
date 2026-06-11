import { _trpc } from "@/components/static-trpc";
import { useQuery } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";
import { invoiceCustomerProfiles } from "../mock-data";
import type { InvoiceCustomerProfile } from "../types";
import { USE_MOCK_INVOICE_FORM } from "./config";

type CustomerProfileRow = Record<string, unknown>;

export function useInvoiceFormProfiles() {
  const realProfiles = useQuery({
    ..._trpc.customers.getCustomerProfiles.queryOptions(),
    enabled: !USE_MOCK_INVOICE_FORM,
  });

  const profiles = useMemo(
    () =>
      USE_MOCK_INVOICE_FORM
        ? invoiceCustomerProfiles
        : listRows<CustomerProfileRow>(realProfiles.data).map(
            mapRealCustomerProfile,
          ),
    [realProfiles.data],
  );

  const getProfileCoefficient = useCallback((profileId?: number | null) => {
    if (!profileId) return null;
    const profile = profiles.find((entry) => Number(entry.id) === Number(profileId));
    const coefficient = Number(profile?.coefficient);
    return Number.isFinite(coefficient) ? coefficient : null;
  }, [profiles]);

  return {
    profiles,
    getProfileCoefficient,
    isLoadingProfiles: USE_MOCK_INVOICE_FORM ? false : realProfiles.isPending,
  };
}

function listRows<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function mapRealCustomerProfile(row: CustomerProfileRow): InvoiceCustomerProfile {
  const coefficient = Number(row.coefficient);
  return {
    id: Number(row.id || 0),
    title: String(row.title || "Profile"),
    coefficient: Number.isFinite(coefficient) ? coefficient : null,
    meta:
      row.meta && typeof row.meta === "object" && !Array.isArray(row.meta)
        ? row.meta
        : null,
  };
}
