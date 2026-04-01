"use client";

import { useSalesOrdersV2FilterParams } from "@/hooks/use-sales-orders-v2-filter-params";
import { useTRPC } from "@/trpc/client";
import { useQuery } from "@gnd/ui/tanstack";
import { Card, CardContent, CardHeader, CardTitle } from "@gnd/ui/card";
import { Skeleton } from "@gnd/ui/skeleton";
import { formatCurrency } from "@/lib/utils";
import {
  CircleDollarSign,
  ClipboardList,
  Receipt,
  ShieldCheck,
  TimerReset,
} from "lucide-react";

const cards = [
  {
    key: "totalOrders",
    title: "Orders",
    subtitle: "Filtered order count.",
    icon: ClipboardList,
    money: false,
  },
  {
    key: "invoiceValue",
    title: "Invoice Value",
    subtitle: "Total invoice amount.",
    icon: CircleDollarSign,
    money: true,
  },
  {
    key: "outstandingBalance",
    title: "Outstanding",
    subtitle: "Open balance remaining.",
    icon: Receipt,
    money: true,
  },
  {
    key: "paidOrders",
    title: "Paid",
    subtitle: "Orders cleared in full.",
    icon: ShieldCheck,
    money: false,
  },
  {
    key: "evaluatingOrders",
    title: "Evaluating",
    subtitle: "Still in review.",
    icon: TimerReset,
    money: false,
  },
] as const;

export function SalesOrdersV2SummaryWidgets() {
  const trpc = useTRPC();
  const { filters } = useSalesOrdersV2FilterParams();
  const summaryQuery = useQuery(
    trpc.sales.getOrdersV2Summary.queryOptions(filters),
  );

  if (summaryQuery.isPending || !summaryQuery.data) {
    return (
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {Array.from({ length: cards.length }).map((_, index) => (
          <Card key={index.toString()} className="rounded-3xl">
            <CardHeader className="px-4 pb-2 pt-4">
              <Skeleton className="h-4 w-24 rounded-full" />
            </CardHeader>
            <CardContent className="space-y-2 px-4 pb-4 pt-0">
              <Skeleton className="h-8 w-20 rounded-md" />
              <Skeleton className="h-4 w-full rounded-md" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
      {cards.map((card) => {
        const Icon = card.icon;
        const value = summaryQuery.data[card.key];

        return (
          <Card
            key={card.key}
            className="rounded-3xl border-slate-200 bg-white/90 shadow-sm"
          >
            <CardHeader className="flex flex-row items-start justify-between gap-3 px-4 pb-2 pt-4">
              <div className="space-y-1">
                <CardTitle className="text-sm font-semibold text-slate-700">
                  {card.title}
                </CardTitle>
              </div>
              <div className="rounded-2xl bg-slate-100 p-2 text-slate-700">
                <Icon className="size-4" />
              </div>
            </CardHeader>
            <CardContent className="space-y-1.5 px-4 pb-4 pt-0">
              <p className="text-3xl font-semibold tracking-tight text-slate-950">
                {card.money ? formatCurrency.format(Number(value || 0)) : value}
              </p>
              <p className="text-sm leading-6 text-muted-foreground">
                {card.subtitle}
              </p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
