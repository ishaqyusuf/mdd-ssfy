export function getPivotModel(model) {
  if (!model) return "";
  const pivotM = model
    .toLowerCase()
    .split(" ")
    .flatMap((part) => part.split("/"))
    .filter(Boolean)
    .filter((v) => !["lh", "rh", "l", "r"].includes(v))
    .join(" ");
  return pivotM;
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
