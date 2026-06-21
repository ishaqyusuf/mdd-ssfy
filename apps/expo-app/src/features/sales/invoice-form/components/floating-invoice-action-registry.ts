import type { ReactNode } from "react";

export type FloatingInvoiceActionRegistryEntry = {
  node: ReactNode;
  refreshKey: string;
};

export function shouldUpdateFloatingInvoiceAction(
  current: FloatingInvoiceActionRegistryEntry | undefined,
  next: FloatingInvoiceActionRegistryEntry,
) {
  return !current || current.refreshKey !== next.refreshKey;
}
