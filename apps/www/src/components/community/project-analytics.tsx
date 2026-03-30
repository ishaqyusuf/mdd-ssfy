"use client";

import { useCommunityProjectFilterParams } from "@/hooks/use-community-project-filter-params";
import { useProjectUnitFilterParams } from "@/hooks/use-project-units-filter-params";
import { useTRPC } from "@/trpc/client";
import type { RouterOutputs } from "@api/trpc/routers/_app";
import { Badge } from "@gnd/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@gnd/ui/card";
import { Item } from "@gnd/ui/namespace";
import { useSuspenseQuery } from "@gnd/ui/tanstack";
import { formatDate } from "@gnd/utils/dayjs";
import { Building2, BriefcaseBusiness, Home, Receipt } from "lucide-react";
import Link from "next/link";
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
} from "recharts";

type ProjectsOverview =
  RouterOutputs["community"]["communityProjectsOverview"];

function SummaryMetric({
  title,
  value,
  subtitle,
  icon: Icon,
}: {
  title: string;
  value: number;
  subtitle: string;
  icon: any;
}) {
  return (
    <Card className="border-slate-200 shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-slate-700">
          {title}
        </CardTitle>
        <span className="flex size-8 items-center justify-center rounded-full bg-slate-100 text-slate-700">
          <Icon className="size-4" />
        </span>
      </CardHeader>
      <CardContent className="space-y-1">
        <div className="text-2xl font-semibold text-slate-950">{value}</div>
        <p className="text-xs text-slate-500">{subtitle}</p>
      </CardContent>
    </Card>
  );
}

function DashboardSection({
  title,
  description,
  children,
  className = "",
}: {
  title: string;
  description: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Card className={`border-slate-200 bg-white/90 shadow-sm ${className}`}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold text-slate-900">
          {title}
        </CardTitle>
        <p className="text-sm text-slate-500">{description}</p>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function StatusBadge({ archived }: { archived?: boolean }) {
  return (
    <Badge
      variant="outline"
      className={
        archived
          ? "border-amber-200 bg-amber-50 text-amber-700"
          : "border-emerald-200 bg-emerald-50 text-emerald-700"
      }
    >
      {archived ? "Archived" : "Active"}
    </Badge>
  );
}

function useProjectsOverviewData() {
  const trpc = useTRPC();
  const { filters } = useCommunityProjectFilterParams();

  return useSuspenseQuery(
    trpc.community.communityProjectsOverview.queryOptions({
      builderId: filters.builderId ?? undefined,
      refNo: filters.refNo ?? undefined,
      status: (filters.status as "active" | "archived" | null) ?? undefined,
    }),
  );
}

function useProjectUnitsOverviewData() {
  const trpc = useTRPC();
  const { filters } = useProjectUnitFilterParams();

  return useSuspenseQuery(
    trpc.community.communityProjectUnitsOverview.queryOptions({
      builderSlug: filters.builderSlug ?? undefined,
      projectSlug: filters.projectSlug ?? undefined,
      production: (filters.production as
        | "idle"
        | "queued"
        | "started"
        | "completed"
        | null) ?? undefined,
      installation: (filters.installation as
        | "with jobs"
        | "without jobs"
        | null) ?? undefined,
    }),
  );
}

export function CommunityProjectUnitsAnalytics() {
  const { data } = useProjectUnitsOverviewData();

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <SummaryMetric
        title="Units"
        value={data.summary.total}
        subtitle="Units in the current filtered workspace"
        icon={Home}
      />
      <SummaryMetric
        title="Completed"
        value={data.summary.completed}
        subtitle="Units already completed in production"
        icon={Receipt}
      />
      <SummaryMetric
        title="Active"
        value={data.summary.active}
        subtitle="Units still moving through production"
        icon={Building2}
      />
      <SummaryMetric
        title="Jobs"
        value={data.summary.jobs}
        subtitle="Installation jobs attached to these units"
        icon={BriefcaseBusiness}
      />
    </div>
  );
}

export function CommunityProjectsAnalyticsCards() {
  const { data } = useProjectsOverviewData();

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <SummaryMetric
        title="Projects"
        value={data.summary.total}
        subtitle="Projects in the current filtered workspace"
        icon={Building2}
      />
      <SummaryMetric
        title="Active"
        value={data.summary.active}
        subtitle="Projects currently in active operations"
        icon={Home}
      />
      <SummaryMetric
        title="Archived"
        value={data.summary.archived}
        subtitle="Projects already archived from daily work"
        icon={Receipt}
      />
      <SummaryMetric
        title="Units"
        value={data.summary.units}
        subtitle="Homes attached to the filtered project set"
        icon={BriefcaseBusiness}
      />
    </div>
  );
}

export function CommunityProjectsDashboardTab() {
  const { data } = useProjectsOverviewData();

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        <SummaryMetric
          title="Projects"
          value={data.summary.total}
          subtitle={`${data.summary.active} active and ${data.summary.archived} archived`}
          icon={Building2}
        />
        <SummaryMetric
          title="Units"
          value={data.summary.units}
          subtitle="Community homes attached to these projects"
          icon={Home}
        />
        <SummaryMetric
          title="Jobs"
          value={data.summary.jobs}
          subtitle="Submitted work linked to the project portfolio"
          icon={BriefcaseBusiness}
        />
        <SummaryMetric
          title="Invoices"
          value={data.summary.invoices}
          subtitle="Invoice records tied to the project portfolio"
          icon={Receipt}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-4">
        <DashboardSection
          className="lg:col-span-3"
          title="Project intake"
          description="Recent project creation trend across the current community workspace."
        >
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.trend} margin={{ top: 8, right: 8, left: -24, bottom: 0 }}>
                <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} />
                <Tooltip />
                <Bar dataKey="value" radius={[8, 8, 0, 0]} fill="#0f766e" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </DashboardSection>

        <DashboardSection
          className="lg:col-span-1"
          title="Status mix"
          description="Active versus archived projects."
        >
          <div className="grid gap-3 lg:grid-cols-1">
            <div className="h-40">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.status}
                    dataKey="value"
                    nameKey="label"
                    innerRadius={34}
                    outerRadius={54}
                    paddingAngle={4}
                  >
                    {data.status.map((entry, index) => (
                      <Cell
                        key={entry.label}
                        fill={index === 0 ? "#16a34a" : "#f59e0b"}
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="grid gap-1">
              {data.status.map((item, index) => (
                <div key={item.label} className="rounded-lg border border-slate-200 px-2 py-2">
                  <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                    <span
                      className="size-2.5 rounded-full"
                      style={{ backgroundColor: index === 0 ? "#16a34a" : "#f59e0b" }}
                    />
                    {item.label}
                  </div>
                  <div className="mt-1 text-lg font-semibold text-slate-900">{item.value}</div>
                  <p className="text-xs text-slate-500">{item.percent}% share</p>
                </div>
              ))}
            </div>
          </div>
        </DashboardSection>
      </div>

      <DashboardSection
        title="Recent projects"
        description="Newest projects in the current community workspace."
      >
        <div className="space-y-2">
          {data.recent.map((item) => (
            <Link
              key={item.id}
              href={`/community/projects/${item.slug}`}
              className="block rounded-xl border border-slate-200 px-3 py-2 transition-colors hover:border-emerald-300 hover:bg-emerald-50/50"
            >
              <Item>
                <Item.Title className="flex items-center justify-between gap-3 text-sm font-semibold text-slate-900">
                  <span className="truncate">{item.title}</span>
                  <StatusBadge archived={item.archived} />
                </Item.Title>
                <Item.Description className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500">
                  <span>{item.builder}</span>
                  <span>{item.refNo}</span>
                  <span>{item.units} units</span>
                  <span>{item.jobs} jobs</span>
                  <span>{item.invoices} invoices</span>
                  <span>{formatDate(item.updatedAt)}</span>
                </Item.Description>
              </Item>
            </Link>
          ))}
        </div>
      </DashboardSection>
    </div>
  );
}
