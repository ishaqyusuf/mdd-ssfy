"use client";

import type { RouterOutputs } from "@api/trpc/routers/_app";
import { Badge } from "@gnd/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@gnd/ui/card";
import { Item } from "@gnd/ui/namespace";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@gnd/ui/tabs";
import { formatDate } from "@gnd/utils/dayjs";
import { BriefcaseBusiness, Hammer, Home, Receipt } from "lucide-react";
import Link from "next/link";
import { formatCurrency } from "@/lib/utils";

type ProjectOverviewData =
  RouterOutputs["community"]["communityProjectOverview"];

function StatusBadge({ value }: { value?: string | null }) {
  const normalized = (value || "").toLowerCase();
  const classes =
    normalized === "completed"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : normalized === "started"
        ? "border-amber-200 bg-amber-50 text-amber-700"
        : normalized === "queued"
          ? "border-sky-200 bg-sky-50 text-sky-700"
          : "border-slate-200 bg-slate-50 text-slate-700";

  return (
    <Badge variant="outline" className={classes}>
      {value || "Idle"}
    </Badge>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-200 px-4 py-8 text-sm text-slate-500">
      No {label.toLowerCase()} yet.
    </div>
  );
}

function WidgetShell({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="border-slate-200 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold text-slate-900">
          {title}
        </CardTitle>
        <p className="text-sm text-slate-500">{description}</p>
      </CardHeader>
      <CardContent className="space-y-4">{children}</CardContent>
    </Card>
  );
}

function UnitsTab({ items }: { items: ProjectOverviewData["recentUnits"] }) {
  if (!items.length) return <EmptyState label="Units" />;

  return (
    <div className="space-y-2">
      {items.map((item) => (
        <Link
          key={item.id}
          href={`/community/project-units/${item.slug}`}
          className="block rounded-xl border border-slate-200 px-3 py-2 transition-colors hover:border-emerald-300 hover:bg-emerald-50/50"
        >
          <Item>
            <Item.Title className="flex items-center justify-between gap-3">
              <span>{item.lotBlock || "No lot/block"}</span>
              <StatusBadge value={item.production?.status} />
            </Item.Title>
            <Item.Description className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500">
              <span>{item.modelName || "No model"}</span>
              <span>{item.jobs} jobs</span>
              <span>{formatDate(item.createdAt)}</span>
            </Item.Description>
          </Item>
        </Link>
      ))}
    </div>
  );
}

function ProductionTab({
  items,
}: {
  items: ProjectOverviewData["recentProduction"];
}) {
  if (!items.length) return <EmptyState label="Production activities" />;

  return (
    <div className="space-y-2">
      {items.map((item) => (
        <div key={item.id} className="rounded-xl border border-slate-200 px-3 py-2">
          <Item>
            <Item.Title className="flex items-center justify-between gap-3">
              <span>{item.taskName || "Production task"}</span>
              <StatusBadge value={item.status} />
            </Item.Title>
            <Item.Description className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500">
              <span>{item.home?.lotBlock || "No lot/block"}</span>
              <span>{item.home?.modelName || "No model"}</span>
              <span>{formatDate(item.createdAt)}</span>
            </Item.Description>
          </Item>
        </div>
      ))}
    </div>
  );
}

function InvoicesTab({
  items,
}: {
  items: ProjectOverviewData["recentInvoices"];
}) {
  if (!items.length) return <EmptyState label="Invoice activity" />;

  return (
    <div className="space-y-2">
      {items.map((item) => (
        <div key={item.id} className="rounded-xl border border-slate-200 px-3 py-2">
          <Item>
            <Item.Title className="flex items-center justify-between gap-3">
              <span>{item.title}</span>
              <span className="text-sm font-semibold text-slate-950">
                {formatCurrency.format(item.amountDue)}
              </span>
            </Item.Title>
            <Item.Description className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500">
              <span>{item.home?.lotBlock || "No lot/block"}</span>
              <span>Paid {formatCurrency.format(item.amountPaid)}</span>
              <span>{formatDate(item.createdAt)}</span>
            </Item.Description>
          </Item>
        </div>
      ))}
    </div>
  );
}

function JobsTab({ items }: { items: ProjectOverviewData["recentJobs"] }) {
  if (!items.length) return <EmptyState label="Jobs" />;

  return (
    <div className="space-y-2">
      {items.map((item) => (
        <div key={item.id} className="rounded-xl border border-slate-200 px-3 py-2">
          <Item>
            <Item.Title className="flex items-center justify-between gap-3">
              <span>{item.title || "Untitled job"}</span>
              <StatusBadge value={item.status} />
            </Item.Title>
            <Item.Description className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500">
              <span>{item.type || "No type"}</span>
              <span>{item.home?.lotBlock || "No lot/block"}</span>
              <span>{formatCurrency.format(item.amount)}</span>
              <span>{formatDate(item.createdAt)}</span>
            </Item.Description>
          </Item>
        </div>
      ))}
    </div>
  );
}

export function ProjectOverviewWidget({ data }: { data: ProjectOverviewData }) {
  return (
    <WidgetShell
      title="Project activity"
      description="A tabbed operational widget for the latest units, production activity, invoice activity, and recent jobs on this project."
    >
      <Tabs defaultValue="units" className="space-y-4">
        <TabsList className="grid h-auto w-full grid-cols-2 gap-2 rounded-2xl bg-slate-100 p-1.5 md:grid-cols-4">
          <TabsTrigger value="units" className="gap-2 rounded-xl py-2.5">
            <Home className="size-4" />
            Units
          </TabsTrigger>
          <TabsTrigger value="production" className="gap-2 rounded-xl py-2.5">
            <Hammer className="size-4" />
            Production
          </TabsTrigger>
          <TabsTrigger value="invoices" className="gap-2 rounded-xl py-2.5">
            <Receipt className="size-4" />
            Invoices
          </TabsTrigger>
          <TabsTrigger value="jobs" className="gap-2 rounded-xl py-2.5">
            <BriefcaseBusiness className="size-4" />
            Jobs
          </TabsTrigger>
        </TabsList>

        <TabsContent value="units" className="mt-0">
          <UnitsTab items={data.recentUnits} />
        </TabsContent>
        <TabsContent value="production" className="mt-0">
          <ProductionTab items={data.recentProduction} />
        </TabsContent>
        <TabsContent value="invoices" className="mt-0">
          <InvoicesTab items={data.recentInvoices} />
        </TabsContent>
        <TabsContent value="jobs" className="mt-0">
          <JobsTab items={data.recentJobs} />
        </TabsContent>
      </Tabs>
    </WidgetShell>
  );
}
