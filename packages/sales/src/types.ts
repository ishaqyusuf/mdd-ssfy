import type { db, Prisma, SalesStat } from "@gnd/db";
import {
  composeSalesItemControl,
  getSaleInformation,
  PrintInvoice,
} from "./exports";
import { RenturnTypeAsync } from "@gnd/utils";
import { DISPATCH_ITEM_PACKING_STATUS } from "./utils/constants";
import { CSSProperties } from "react";
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
export type DispatchItemPackingStatus =
  (typeof DISPATCH_ITEM_PACKING_STATUS)[number];
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
export interface SalesItemMeta {
  tax?: boolean;

  lineIndex;

  doorType: DykeDoorType;
}
export type DykeDoorType =
  | "Interior"
  | "Exterior"
  | "Shelf Items"
  | "Garage"
  | "Bifold"
  | "Moulding"
  | "Door Slabs Only"
  | "Services";
export type SalesPaymentOptions =
  | "Cash"
  | "Credit Card"
  | "Check"
  | "COD"
  | "Zelle";
export type SalesType = "order" | "quote" | "store-order";
export type SalesSettingsMeta = {
  route: {
    [primaryRouteUid in string]: {
      routeSequence: { uid: string }[];
      externalRouteSequence: { uid: string }[][];
      route?: {
        [stepUid in string]: string;
      };
      externalRoute?: {
        [stepUid in string]: string;
      };
      config: {
        noHandle?: boolean;
        hasSwing?: boolean;
        addonQty?: boolean;
        production?: boolean;
        shipping?: boolean;
      };
    };
  };
};
export interface StepComponentMeta {
  stepSequence?: { id?: number }[];
  deleted?: { [uid in string]: boolean };
  show?: { [uid in string]: boolean };
  variations?: {
    rules: {
      stepUid: string;
      operator: "is" | "isNot";
      componentsUid: string[];
    }[];
  }[];
  sortIndex?;
  sectionOverride?: {
    hasSwing?: boolean;
    noHandle?: boolean;
    overrideMode?: boolean;
  };
}
export type SettingType = "sales-settings" | "install-price-chart";
export type Qty = {
  lh?;
  rh?;
  qty;
  noHandle?: boolean;
};
export type ItemControlData = ReturnType<typeof composeSalesItemControl>;
export interface DykeSalesDoorMeta {
  _doorPrice?: number | null;
  overridePrice?: number | string;
  unitLabor?: number;
  laborQty?: number;
  prodOverride?: {
    production?: boolean;
  };
}
export interface ItemStatConfigProps {
  isDyke?: boolean;
  qty?: Qty;
  formSteps;
  setting: SalesSettingsMeta;
  dykeProduction?: boolean;
  swing?;
  prodOverride?: DykeSalesDoorMeta["prodOverride"];
}

export type ItemControlTypes = "door" | "molding" | "item" | "shelf";
export type ItemControl = {
  type: ItemControlTypes;
  doorId?;
  dim?;
  itemId?;
  hptId?;
  shelfId?;
};
export type Db = typeof db;
export type { Prisma };
export type SalesInformation = RenturnTypeAsync<typeof getSaleInformation>;
export type SalesInfoItem = SalesInformation["items"][number];

export const CUSTOMER_TRANSACTION_TYPES = [
  "wallet",
  "transaction",
  "pay-with-wallet",
] as const;
export type CustomerTransactionType =
  (typeof CUSTOMER_TRANSACTION_TYPES)[number];

export type InvoicePrintModes =
  | "customer"
  | "invoice"
  | "packing slip"
  | "quote";
export interface PrintData {
  id?;
  salesNo?;
  billing: string[];
  shipping: string[];
  meta: {
    title: string;
    details: {
      label: string;
      value: string;
      style?: CSSProperties;
    }[];
  };
  label: InvoicePrintModes;
  type: SalesType;
  date: string;
  salesRep?: string;
  poNo?: string;
  status?: "PAID" | "PENDING";
  total?: string;
  due?: string;
  paid?: string;
  subTotal?: string;
  extraCosts?: {
    label?: string;
    value?: string;
  }[];
  linesSection: {
    title?: string;
    index?: number;
    configurations?: { label: string; value: string }[];
    tableHeader: PrintDataTable[];
    tableRows: {
      [id in TableHeaders]: PrintDataTable;
    }[];
  }[];
  query?: PrintInvoice;
}
export type PrintLineSection = PrintData["linesSection"][number];
export type TableHeaders =
  | "#"
  | "Door"
  | "Size"
  | "Left Hand"
  | "Right Hand"
  | "Rate"
  | "Shipped Qty"
  | "Moulding"
  | "Description"
  | "Qty"
  | "Swing"
  | "Total";
export interface PrintDataTable {
  text: string[];
  align?: "start" | "center" | "end";
  bold?: boolean;
  width?: "xs" | "sm" | "md";
}
export type TypedSalesStat = Omit<SalesStat, "status" | "type" | "id"> & {
  type: QtyControlType;
  id?: number;
  status?: SalesStatStatus;
};
