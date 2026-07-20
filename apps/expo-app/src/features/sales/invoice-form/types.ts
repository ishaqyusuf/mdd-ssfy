import type {
  SalesFormLineItemRecord,
  WorkflowLineItemRecord,
  WorkflowStepRecord,
} from "@gnd/sales/sales-form-core";

export type NewSalesFormType = "order" | "quote";

export type NewSalesFormMeta = {
  customerId?: number | null;
  customerProfileId?: number | null;
  billingAddressId?: number | null;
  shippingAddressId?: number | null;
  paymentTerm?: string | null;
  createdAt?: string | null;
  paymentDueDate?: string | null;
  goodUntil?: string | null;
  prodDueDate?: string | null;
  po?: string | null;
  notes?: string | null;
  deliveryOption?: string | null;
  paymentMethod?: string | null;
  taxCode?: string | null;
};

export type NewSalesFormLineItem = SalesFormLineItemRecord & {
  id?: number | null;
  uid: string;
  title: string;
  description?: string | null;
  qty: number;
  unitPrice: number;
  lineTotal: number;
  taxxable?: boolean | null;
  meta?: Record<string, unknown> | null;
  formSteps?: WorkflowStepRecord[];
  shelfItems?: WorkflowLineItemRecord["shelfItems"];
  housePackageTool?: WorkflowLineItemRecord["housePackageTool"];
};

export type NewSalesFormSummary = {
  subTotal: number;
  adjustedSubTotal?: number;
  taxRate: number;
  taxTotal: number;
  grandTotal: number;
  totalWithCcc?: number;
  discount?: number;
  discountPct?: number;
  percentDiscountValue?: number;
  labor?: number;
  delivery?: number;
  otherCosts?: number;
  taxableSubTotal?: number;
  ccc?: number;
};

export type NewSalesFormSettings = {
  cccPercentage?: number | null;
};

export type NewSalesFormExtraCostType =
  | "Discount"
  | "DiscountPercentage"
  | "Labor"
  | "FlatLabor"
  | "CustomTaxxable"
  | "CustomNonTaxxable"
  | "Delivery"
  | "EXT";

export type NewSalesFormExtraCost = {
  id?: number | null;
  label: string;
  type: NewSalesFormExtraCostType;
  amount: number;
  taxxable?: boolean | null;
};

export type SaveDraftNewSalesFormPayload = {
  type: NewSalesFormType;
  slug?: string | null;
  salesId?: number | null;
  inventoryStatus?: string | null;
  version?: string | null;
  autosave: boolean;
  meta: NewSalesFormMeta;
  lineItems: NewSalesFormLineItem[];
  extraCosts: NewSalesFormExtraCost[];
  summary: NewSalesFormSummary;
};

export type DeleteNewSalesFormLineItemPayload = {
  salesId: number;
  lineItemId: number;
};

export type InvoiceFormStep =
  | "customer"
  | "details"
  | "items"
  | "costs"
  | "review";

export type InvoiceSaveStatus = "idle" | "saving" | "saved" | "error" | "stale";

export type InvoiceInventoryStatus =
  | "AVAILABLE"
  | "ORDERED"
  | "PENDING ORDER";

export type InvoiceCustomer = {
  id: number;
  profileId?: number | null;
  name: string;
  businessName?: string | null;
  contact: string;
  phone: string;
  email: string;
  billingAddressId: number;
  shippingAddressId: number;
  billingAddress: string;
  shippingAddress: string;
  paymentTerm?: string | null;
  taxCode?: string | null;
};

export type InvoiceCustomerProfile = {
  id: number;
  title: string;
  coefficient: number | null;
  meta?: Record<string, unknown> | null;
};

export type InvoiceTaxProfile = {
  taxCode: string;
  title: string;
  percentage: number;
};

export type InvoiceResolvedCustomer = {
  customerId?: number | null;
  profileId?: number | null;
  billingId?: number | null;
  shippingId?: number | null;
  netTerm?: string | null;
  taxCode?: string | null;
  customer?: {
    name?: string | null;
    phone?: string | null;
    email?: string | null;
  } | null;
  billing?: {
    id?: number | null;
    lines?: string[] | null;
  } | null;
  shipping?: {
    id?: number | null;
    lines?: string[] | null;
  } | null;
};

export type InvoiceSelectableItem = {
  uid: string;
  source?: "shelf" | "workflow" | "service" | "custom";
  productId?: number | null;
  componentId?: number | null;
  componentUid?: string | null;
  title: string;
  sku: string;
  category:
    | "Components"
    | "Doors"
    | "Moulding"
    | "Labor"
    | "Hardware"
    | "Custom";
  categoryId?: number | null;
  parentCategoryId?: number | null;
  categoryIds?: number[];
  unitPrice: number;
  basePrice?: number | null;
  salesPrice?: number | null;
  taxxable: boolean;
  status: string;
  custom?: boolean;
  _metaData?: {
    custom?: boolean;
  } | null;
};

export type InvoiceFormMode = "create" | "edit";

export type NewSalesFormMobileRecord = {
  type: NewSalesFormType;
  salesId?: number | null;
  slug?: string | null;
  orderId?: string | null;
  inventoryStatus?: string | null;
  status?: string | null;
  version?: string | null;
  updatedAt?: string | null;
  customer?: Record<string, unknown> | null;
  form: NewSalesFormMeta;
  lineItems: NewSalesFormLineItem[];
  extraCosts: NewSalesFormExtraCost[];
  summary: NewSalesFormSummary;
  settings?: NewSalesFormSettings | null;
};

export type InvoiceFormSaveResult = Partial<NewSalesFormMobileRecord> & {
  meta?: NewSalesFormMeta;
};
