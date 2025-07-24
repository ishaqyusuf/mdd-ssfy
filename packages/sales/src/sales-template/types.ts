export type SalesPrintData = {
  isEstimate?: boolean;
  isProd?: boolean;
  isPacking?: boolean;
  isOrder?: boolean;
  paymentDate?: string | null;
  query?: any; // Placeholder for SalesPrintProps["searchParams"]
  order: ViewSaleType;
  lineItems: SalesPrintLineItemData | null;
  headerTitle: string;
  footer: SalesPrintFooterData | null;
  address: SalesPrintAddressData[];
  heading: SalesPrintHeadingData;
  doorsTable: SalesPrintDoorsTableData | null;
  shelfItemsTable: SalesPrintShelfItemsTableData[] | null;
  orderedPrinting: SalesPrintOrderedPrinting[];
  customer?: any; // Placeholder for Customer type
  total?: any; // Placeholder for Total type
};

export interface SalesInvoiceTemplateProps {
  size?: string;
  printData: SalesPrintData;
}

export interface SalesPrintItem {
  title: string;
  value?: string | React.ReactNode;
  style?: any;
  colSpan?: number;
}

export interface SalesPrintSection {
  sectionTitle?: string;
  details?: SalesPrintItem[];
  itemCells?: SalesPrintItem[];
  lines?: SalesPrintItem[][];
  nonShelf?: any; // TODO: Refine this type
  shelf?: any; // TODO: Refine this type
}

export interface SalesPrintHeaderData {
  headerTitle?: string;
  heading?: {
    lines: SalesPrintItem[];
  };
  address?: {
    title: string;
    lines: string[];
  }[];
  isProd?: boolean;
  paymentDate?: string;
  logoUrl?: string;
}

export interface SalesPrintLineItemData {
  heading: SalesPrintItem[];
  lines: {
    id: string;
    total: boolean;
    cells: SalesPrintItem[];
  }[];
}

export interface SalesPrintFooterData {
  lines: SalesPrintItem[];
}

// Placeholders for external types
export type ViewSaleType = {
  id: string;
  amountDue: number;
  payments?: any[];
  createdAt?: string;
  orderId?: string;
  salesRep?: { name: string };
  goodUntil?: string;
  meta?: {
    po?: string;
    labor_cost?: number;
    ccc?: number;
    deliveryCost?: number;
  };
  extraCosts?: { label: string; amount: number }[];
  subTotal?: number;
  taxes?: any[];
  tax?: number;
  taxPercentage?: number;
  grandTotal?: number;
  items: any[]; // Array of sales items
  deliveries?: any[];
  paymentTerm?: string;
};

export type DykeSalesDoors = {
  id?: string;
  swing?: string;
  lhQty?: number;
  rhQty?: number;
  totalQty?: number;
  dimension?: string;
  unitPrice?: number;
  lineTotal?: number;
  stepProduct?: {
    name?: string;
    door?: { title: string };
    product?: { title: string };
  };
};

export type DykeSalesShelfItem = {
  description?: string;
  shelfProduct?: { title: string };
  qty?: number;
  unitPrice?: number;
  totalPrice?: number;
};

export type PrintTextProps = {
  position?: "center" | "left" | "right";
  font?: "bold" | "normal";
  size?: "base" | "lg";
  text?: "uppercase";
  bg?: "shade" | "default";
  colSpan?: string;
};

export type IAddressMeta = {};
export type CustomerMeta = {};
export type SalesTaxes = {
  title: string;
  percentage: number;
};

export type SalesPrintAddressData = {
  title: string;
  lines: string[];
};

export type SalesPrintHeadingData = {
  title: string;
  lines: SalesPrintItem[];
};

export type SalesPrintDoorsTableData = {
  doors: {
    _index: number;
    doorType: string;
    sectionTitle: string;
    details: any[];
    itemCells: SalesPrintItem[];
    lines: any[];
  }[];
};

export type SalesPrintShelfItemsTableData = {
  item: any;
  cells: any[];
  _index: number;
  _shelfItems: any[];
};

export type SalesPrintOrderedPrinting = {
  _index: number;
  shelf?: SalesPrintShelfItemsTableData["shelfItems"];
  nonShelf?: SalesPrintDoorsTableData["doors"][0];
};
