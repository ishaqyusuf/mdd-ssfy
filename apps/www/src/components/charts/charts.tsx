
"use client";

import { useSalesDashboardParams } from "@/hooks/use-sales-dashboard-params";
import { RevenueChart } from "./revenue-chart";

export function Charts() {
  const { params } = useSalesDashboardParams();

  // This can be extended with a switch statement to show different charts
  // based on params.chart
  switch (params.chart) {
    case "revenue":
    default:
      return <RevenueChart />;
  }
}
