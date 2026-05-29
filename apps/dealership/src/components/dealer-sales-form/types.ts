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
  address?: string | null;
  formattedAddress?: string | null;
  address1?: string | null;
  address2?: string | null;
  city?: string | null;
  state?: string | null;
  zip_code?: string | null;
  country?: string | null;
  customerTypeId?: number | null;
  taxCode?: string | null;
  taxProfileId?: number | null;
  createdAt?: Date | string | null;
  profile?: DealerSalesFormProfile | null;
  ordersCount?: number | null;
  quotesCount?: number | null;
};

export type DealerSalesFormProfile = {
  id: number;
  title?: string | null;
  coefficient?: number | null;
  salesPercentage?: number | null;
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
