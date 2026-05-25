import type {
  DealerSalesFormQuoteRecord,
  SalesFormLineItemUiRecord,
  SalesFormState,
} from "@gnd/sales/sales-form";

export type DealerSalesFormCustomer = {
  id: number;
  name?: string | null;
  businessName?: string | null;
  email?: string | null;
  phoneNo?: string | null;
  customerTypeId?: number | null;
  createdAt?: Date | string | null;
};

export type DealerSalesFormProfile = {
  id: number;
  title?: string | null;
  coefficient?: number | null;
  defaultProfile?: boolean | null;
};

export type DealerInternalSalesFormProfile = {
  id?: number | null;
  title?: string | null;
  coefficient?: number | null;
};

export type DealerSalesFormRecord = DealerSalesFormQuoteRecord & {
  lineItems: SalesFormLineItemUiRecord[];
};

export type DealerSalesFormState = SalesFormState<DealerSalesFormRecord>;
