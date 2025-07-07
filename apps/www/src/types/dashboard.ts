import { BarChartProps } from "@/lib/chart";
import { ISalesOrder } from "./sales";

export interface ISalesDashboard {
  bar: BarChartProps[];
  recentSales: ISalesOrder[];
  salesOrders;
  totalDoors;
  totalOrders;
  pendingDoors;
  totalSales;
  amountDue;
  pendingOrders;
  completedOrders;
  completedDoors;
}
