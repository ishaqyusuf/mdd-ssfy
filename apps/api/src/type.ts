import type { Prisma } from "@gnd/db";

// import type { IconKeys } from "@ui/components/custom/icons";
export type PageDataMeta = {
  count?;
  page?;
  next?: {
    size?;
    start?;
  };
  cursor?;
  hasPreviousePage?;
  hasNextPage?;
};

export type PageFilterData<TValue = string> = {
  value?: TValue;
  icon?;
  type: "checkbox" | "input" | "date" | "date-range";
  label?: string;
  options?: {
    label: string;
    subLabel?: string;
    value: string;
  }[];
};
export type StepMeta = {
  custom: boolean;
  priceStepDeps: string[];
  doorSizeVariation?: {
    rules: {
      stepUid: string;
      operator: "is" | "isNot";
      componentsUid: string[];
    }[];
    widthList?: string[];
  }[];
};
export type SalesPriority = "Low" | "High" | "Medium" | "Non";
export type QtyControlType =
  | "qty"
  | "prodAssigned"
  | "prodCompleted"
  | "dispatchAssigned"
  | "dispatchInProgress"
  | "dispatchCompleted"
  | "dispatchCancelled";
export type QtyControlByType = {
  [type in QtyControlType]: Omit<Prisma.QtyControlCreateManyInput, "type"> & {
    type: QtyControlType;
  };
};
export type SalesDispatchStatus =
  | "queue"
  | "in progress"
  | "completed"
  | "cancelled";
export type SalesStatStatus =
  | "pending"
  | "in progress"
  | "completed"
  | "unknown"
  | "N/A";
export interface AddressBookMeta {
  zip_code;
  placeId?: string;
  placeSearchText?: string;
}
export type CustomerMeta = {
  netTerm?: string;
};
export type SalesMeta = {
  qb;
  profileEstimate: Boolean;
  ccc;
  priority: SalesPriority;
  ccc_percentage;
  labor_cost;
  laborConfig?: {
    id?: number;
    rate?: number;
  };
  discount;
  deliveryCost;
  sales_profile;
  sales_percentage;
  po;
  mockupPercentage: number;
  rep;
  total_prod_qty;
  payment_option: SalesPaymentOptions;
  truckLoadLocation;
  truck;
  tax?: boolean;
  calculatedPriceMode?: boolean;
  takeOff: {
    list: {
      title: string;
      index: number;
      components: {
        itemUid: string;
        qty: {
          rh?: number | undefined;
          lh?: number | undefined;
          total?: number | undefined;
        };
      }[];
    }[];
  };
};
export type SalesPaymentOptions =
  | "Cash"
  | "Credit Card"
  | "Check"
  | "COD"
  | "Zelle";
export type SalesType = "order" | "quote";
