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
