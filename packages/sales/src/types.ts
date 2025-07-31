import type { db, Prisma } from "@gnd/db";
import { getItemStatConfig } from "./utils/utils";
import { composeSalesItemControl, getSaleInformation } from "./exports";
import { RenturnTypeAsync } from "@gnd/utils";
import { DISPATCH_ITEM_PACKING_STATUS } from "./utils/constants";
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
export type SalesType = "order" | "quote";
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

export type SalesInformation = RenturnTypeAsync<typeof getSaleInformation>;
export type SalesInfoItem = SalesInformation["items"][number];
