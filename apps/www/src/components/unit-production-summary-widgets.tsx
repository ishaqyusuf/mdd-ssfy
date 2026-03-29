"use client";

import { useUnitProductionFilterParams } from "@/hooks/use-unit-productions-filter-params";
import { useTRPC } from "@/trpc/client";
import { useQuery } from "@gnd/ui/tanstack";
import { Card, CardContent, CardHeader, CardTitle } from "@gnd/ui/card";
import { Skeleton } from "@gnd/ui/skeleton";
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Layers3,
  Package2,
  TimerReset,
} from "lucide-react";

const cards = [
  {
    key: "total",
    title: "Production tasks",
    subtitle: "All produceable tasks in the current view.",
    icon: Package2,
  },
  {
    key: "units",
    title: "Units covered",
    subtitle: "Distinct homes represented by these tasks.",
    icon: Layers3,
  },
  {
    key: "queued",
    title: "Queued",
    subtitle: "Already sent to production and waiting to move.",
    icon: Clock3,
  },
  {
    key: "started",
    title: "Started",
    subtitle: "Production has begun and still needs follow-through.",
    icon: TimerReset,
  },
  {
    key: "completed",
    title: "Completed",
    subtitle: "Finished production tasks, including installed units.",
    icon: CheckCircle2,
  },
  {
    key: "pastDue",
    title: "Past due",
    subtitle: "Open work with due dates already behind us.",
    icon: AlertTriangle,
  },
] as const;

export function UnitProductionSummaryWidgets() {
  const trpc = useTRPC();
  const { filters } = useUnitProductionFilterParams();
  const summaryQuery = useQuery(
    trpc.community.getUnitProductionSummary.queryOptions(filters),
  );

  if (summaryQuery.isPending || !summaryQuery.data) {
    return (
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: cards.length }).map((_, index) => (
          <Card key={index.toString()} className="rounded-3xl">
            <CardHeader className="pb-3">
              <Skeleton className="h-4 w-24 rounded-full" />
            </CardHeader>
            <CardContent className="space-y-2">
              <Skeleton className="h-8 w-16 rounded-md" />
              <Skeleton className="h-4 w-full rounded-md" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {cards.map((card) => {
        const Icon = card.icon;
        const value = summaryQuery.data[card.key];

        return (
          <Card
            key={card.key}
            className="rounded-3xl border-slate-200 bg-white/90 shadow-sm"
          >
            <CardHeader className="flex flex-row items-start justify-between gap-3 pb-3">
              <div className="space-y-1">
                <CardTitle className="text-sm font-semibold text-slate-700">
                  {card.title}
                </CardTitle>
              </div>
              <div className="rounded-2xl bg-slate-100 p-2 text-slate-700">
                <Icon className="size-4" />
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-3xl font-semibold tracking-tight text-slate-950">
                {value}
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
