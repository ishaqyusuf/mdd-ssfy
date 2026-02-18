// prisma database additional data for meta json field.
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
export type CustomerMeta = {
  netTerm?: string;
};
export type CustomerProfileMeta = {
  net: string;
  goodUntil: number;
  taxCode?: string;
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
export type ProjectMeta = {
  supervisor: {
    name;
    email;
  };
  media?: string[];
  addon?; 
  installCosts: InstallCost[];
};
export interface ICostChartMeta {
    totalCost;
    syncCompletedTasks: Boolean;
    totalTax;
    grandTotal;
    totalTask;
    tax: { [uid in string]: number };
    costs: { [uid in string]: number };
    sumCosts: { [k in string]: number };
    totalUnits: { [k in string]: number };
    lastSync: {
        date;
        tasks: any;
        units;
    };
}
export interface HousePackageToolMeta {
  priceTags?: {
    moulding?: {
      salesPrice?: number | undefined;
      price?: number | undefined;
      basePrice?: number | undefined;
      addon?: number | undefined;
      overridePrice?: number | undefined;
      unitLabor?: number;
      laborQty?: number;
    };
    components?: number | undefined;
    doorSizePriceTag?: { [size in string]: number };
  };
}
export interface SalesPaymentMeta {
  ccc;
  ccc_percentage;
  sub_total;
  total_due;
  payment_option;
  paymentOption;
  checkNo;
}
export interface ICostChartMeta {
  totalCost;
  syncCompletedTasks: Boolean;
  totalTax;
  grandTotal;
  totalTask;
  tax: { [uid in string]: number };
  costs: { [uid in string]: number };
  sumCosts: { [k in string]: number };
  totalUnits: { [k in string]: number };
  lastSync: {
    date;
    tasks: any;
    units;
  };
}
export interface CommunityBuilderMeta {
  address;
  upgraded: boolean;
  tasks: IBuilderTasks[];
}
export interface IBuilderTasks {
  billable: boolean;
  name: string;
  produceable: boolean;
  addon: boolean;
  installable: boolean;
  punchout: boolean;
  deco: boolean;
  uid: string;
  invoice_search;
}

export interface DykeStepMeta {
  priceDepencies?: { [itemId: string]: boolean };
  stateDeps?: { [itemId: string]: boolean };
  custom?: boolean;
  allowCustom?: boolean;
  allowAdd?: boolean;
  enableSearch?: boolean;
  doorSizeConfig: {
    [uid in string]: {
      title: string;
      sizes: { [height in string]: boolean };
      productRules: {
        [uid in string]: boolean;
      };
    };
  };
}