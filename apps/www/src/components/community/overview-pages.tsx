"use client";

import ProjectModal from "@/app-deps/(v1)/(loggedIn)/community/projects/project-modal";
import { useHomeModal } from "@/app-deps/(v1)/(loggedIn)/community/units/home-modal";
import { markProjectProductionCompletedAction } from "@/actions/community/project-actions";
import { useModal } from "@/components/common/modal/provider";
import { useTRPC } from "@/trpc/client";
import { formatCurrency } from "@/lib/utils";
import type { RouterOutputs } from "@api/trpc/routers/_app";
import { ProjectOverviewWidget } from "@/components/widgets/project-overview";
import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@gnd/ui/card";
import { Item } from "@gnd/ui/namespace";
import { useSuspenseQuery } from "@gnd/ui/tanstack";
import { formatDate } from "@gnd/utils/dayjs";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import {
  ArrowUpRight,
  BriefcaseBusiness,
  CheckCheck,
  FileText,
  Hammer,
  Home,
  Pencil,
  Receipt,
} from "lucide-react";

function MetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
}: {
  title: string;
  value: string | number;
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

function SectionCard({
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
      <CardContent>{children}</CardContent>
    </Card>
  );
}

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

function SimpleList({
  items,
  render,
}: {
  items: any[];
  render: (item: any) => React.ReactNode;
}) {
  if (!items.length) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 px-4 py-6 text-sm text-slate-500">
        Nothing to show yet.
      </div>
    );
  }

  return <div className="space-y-2">{items.map(render)}</div>;
}

export function CommunityProjectOverviewPage({ slug }: { slug: string }) {
  const trpc = useTRPC();
  const modal = useModal();
  const homeModal = useHomeModal();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const { data } = useSuspenseQuery(
    trpc.community.communityProjectOverview.queryOptions({
      slug,
    }),
  );

  return (
    <div className="space-y-6">
      <Card className="border-slate-200 shadow-sm">
        <CardContent className="flex flex-col gap-4 p-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                variant="outline"
                className={
                  data.project.archived
                    ? "border-amber-200 bg-amber-50 text-amber-700"
                    : "border-emerald-200 bg-emerald-50 text-emerald-700"
                }
              >
                {data.project.archived ? "Archived" : "Active"}
              </Badge>
              <Badge variant="outline" className="border-slate-200 bg-slate-50 text-slate-700">
                {data.project.refNo || "No ref"}
              </Badge>
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-slate-950">
                {data.project.title}
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                {data.project.builder?.name || "No builder"} •{" "}
                {data.project.address || "No project address"}
              </p>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="rounded-xl bg-slate-50 px-3 py-2">
                <p className="text-[11px] uppercase tracking-[0.16em] text-slate-400">
                  Supervisor
                </p>
                <p className="mt-1 text-sm font-medium text-slate-900">
                  {data.project.meta?.supervisor?.name || "Unassigned"}
                </p>
                <p className="text-xs text-slate-500">
                  {data.project.meta?.supervisor?.email || "No email set"}
                </p>
              </div>
              <div className="rounded-xl bg-slate-50 px-3 py-2">
                <p className="text-[11px] uppercase tracking-[0.16em] text-slate-400">
                  Activity
                </p>
                <p className="mt-1 text-sm font-medium text-slate-900">
                  Created {formatDate(data.project.createdAt)}
                </p>
                <p className="text-xs text-slate-500">
                  Updated {formatDate(data.project.updatedAt)}
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 lg:justify-end">
            <Button variant="outline" onClick={() => homeModal.open(null)}>
              <Home className="mr-2 size-4" />
              Add unit
            </Button>
            <Button
              variant="outline"
              onClick={() => modal.openModal(<ProjectModal data={data.project as any} />)}
            >
              <Pencil className="mr-2 size-4" />
              Edit project
            </Button>
            <Button asChild variant="outline">
              <Link href={`/community/unit-invoices?projectSlug=${slug}`}>
                <Receipt className="mr-2 size-4" />
                Update invoice
              </Link>
            </Button>
            <Button
              onClick={() => {
                startTransition(async () => {
                  await markProjectProductionCompletedAction({
                    projectId: data.project.id,
                  });
                  router.refresh();
                });
              }}
              disabled={isPending}
            >
              <CheckCheck className="mr-2 size-4" />
              Mark all production completed
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Units"
          value={data.summary.units}
          subtitle="Homes inside this project"
          icon={Home}
        />
        <MetricCard
          title="Production"
          value={`${data.summary.completedProductionTasks}/${data.summary.productionTasks}`}
          subtitle="Completed production tasks"
          icon={Hammer}
        />
        <MetricCard
          title="Invoices"
          value={formatCurrency.format(data.summary.invoiceDueAmount)}
          subtitle={`${data.summary.invoices} invoice records in scope`}
          icon={Receipt}
        />
        <MetricCard
          title="Jobs"
          value={data.summary.jobs}
          subtitle="Submitted community jobs"
          icon={BriefcaseBusiness}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.1fr_1fr]">
        <SectionCard
          title="Analytics snapshot"
          description="This area captures the most important project signals: production pace, invoice exposure, unit activity, and open job workload."
        >
          <div className="grid gap-3 md:grid-cols-2">
            {data.productionStatus.map((item) => (
              <div key={item.label} className="rounded-xl border border-slate-200 px-3 py-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-medium text-slate-700">{item.label}</span>
                  <StatusBadge value={item.label} />
                </div>
                <p className="mt-2 text-2xl font-semibold text-slate-950">{item.value}</p>
                <p className="text-xs text-slate-500">{item.percent}% of production items</p>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard
          title="Financial position"
          description="Quick read on due, paid, and outstanding invoice values for this project."
        >
          <div className="space-y-3">
            <div className="rounded-xl bg-slate-50 px-4 py-3">
              <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Due</p>
              <p className="mt-1 text-2xl font-semibold text-slate-950">
                {formatCurrency.format(data.summary.invoiceDueAmount)}
              </p>
            </div>
            <div className="rounded-xl bg-slate-50 px-4 py-3">
              <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Paid</p>
              <p className="mt-1 text-2xl font-semibold text-slate-950">
                {formatCurrency.format(data.summary.invoicePaidAmount)}
              </p>
            </div>
            <div className="rounded-xl bg-slate-50 px-4 py-3">
              <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Outstanding</p>
              <p className="mt-1 text-2xl font-semibold text-slate-950">
                {formatCurrency.format(data.summary.outstandingInvoiceAmount)}
              </p>
            </div>
          </div>
        </SectionCard>
      </div>

      <ProjectOverviewWidget data={data} />
    </div>
  );
}

export function CommunityProjectUnitOverviewPage({ slug }: { slug: string }) {
  const trpc = useTRPC();
  const homeModal = useHomeModal();
  const { data } = useSuspenseQuery(
    trpc.community.communityProjectUnitOverview.queryOptions({
      slug,
    }),
  );

  const templatePath =
    data.unit.communityTemplate?.version === "v2"
      ? `/community/model-template/${data.unit.communityTemplate.slug}`
      : data.unit.communityTemplate?.slug
        ? `/community/community-template/${data.unit.communityTemplate.slug}`
        : null;

  return (
    <div className="space-y-6">
      <Card className="border-slate-200 shadow-sm">
        <CardContent className="flex flex-col gap-4 p-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge value={data.unit.production?.status} />
              <Badge variant="outline" className="border-slate-200 bg-slate-50 text-slate-700">
                {data.unit.project?.refNo || "No ref"}
              </Badge>
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-slate-950">
                {data.unit.lotBlock || "Unit overview"}
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                {data.unit.modelName || "No model"} • {data.unit.project?.title || "No project"}
              </p>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="rounded-xl bg-slate-50 px-3 py-2">
                <p className="text-[11px] uppercase tracking-[0.16em] text-slate-400">
                  Project
                </p>
                <p className="mt-1 text-sm font-medium text-slate-900">
                  {data.unit.project?.title || "Unknown project"}
                </p>
                <p className="text-xs text-slate-500">
                  {data.unit.project?.builder?.name || "Unknown builder"}
                </p>
              </div>
              <div className="rounded-xl bg-slate-50 px-3 py-2">
                <p className="text-[11px] uppercase tracking-[0.16em] text-slate-400">
                  Template
                </p>
                <p className="mt-1 text-sm font-medium text-slate-900">
                  {data.unit.communityTemplate?.modelName || "No template"}
                </p>
                <p className="text-xs text-slate-500">
                  {data.unit.communityTemplate?.version || "No version"}
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 lg:justify-end">
            <Button variant="outline" onClick={() => homeModal.open(data.unit as any)}>
              <Pencil className="mr-2 size-4" />
              Edit unit
            </Button>
            <Button asChild variant="outline">
              <Link href={`/community/projects/${data.unit.project?.slug}`}>
                <ArrowUpRight className="mr-2 size-4" />
                Open project
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href={`/community/unit-invoices?projectSlug=${data.unit.project?.slug}`}>
                <Receipt className="mr-2 size-4" />
                Manage invoices
              </Link>
            </Button>
            {templatePath ? (
              <Button asChild>
                <Link href={templatePath}>
                  <FileText className="mr-2 size-4" />
                  Open template
                </Link>
              </Button>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Production"
          value={`${data.summary.completedProductionTasks}/${data.summary.productionTasks}`}
          subtitle="Completed production tasks"
          icon={Hammer}
        />
        <MetricCard
          title="Jobs"
          value={data.summary.jobs}
          subtitle="Jobs submitted for this unit"
          icon={BriefcaseBusiness}
        />
        <MetricCard
          title="Invoice due"
          value={formatCurrency.format(data.summary.invoiceDueAmount)}
          subtitle="Total invoice value on unit tasks"
          icon={Receipt}
        />
        <MetricCard
          title="Outstanding"
          value={formatCurrency.format(data.summary.outstandingInvoiceAmount)}
          subtitle="Unpaid amount remaining"
          icon={Home}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
        <SectionCard
          title="Production history"
          description="Recent production steps, due dates, and completion state."
        >
          <SimpleList
            items={data.recentProduction}
            render={(item) => (
              <div key={item.id} className="rounded-xl border border-slate-200 px-3 py-2">
                <Item>
                  <Item.Title className="flex items-center justify-between gap-3">
                    <span>{item.taskName || "Production task"}</span>
                    <StatusBadge value={item.status} />
                  </Item.Title>
                  <Item.Description className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500">
                    <span>Created {formatDate(item.createdAt)}</span>
                    <span>
                      Due {item.dueDate ? formatDate(item.dueDate) : "not set"}
                    </span>
                  </Item.Description>
                </Item>
              </div>
            )}
          />
        </SectionCard>

        <SectionCard
          title="Invoice tasks"
          description="Latest invoice records and payment progress attached to the unit."
        >
          <SimpleList
            items={data.recentInvoices}
            render={(item) => (
              <div key={item.id} className="rounded-xl border border-slate-200 px-3 py-2">
                <Item>
                  <Item.Title className="flex items-center justify-between gap-3">
                    <span>{item.taskName || "Invoice task"}</span>
                    <span className="text-sm font-semibold text-slate-950">
                      {formatCurrency.format(item.amountDue)}
                    </span>
                  </Item.Title>
                  <Item.Description className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500">
                    <span>Paid {formatCurrency.format(item.amountPaid)}</span>
                    <span>{formatDate(item.createdAt)}</span>
                  </Item.Description>
                </Item>
              </div>
            )}
          />
        </SectionCard>

        <SectionCard
          title="Recent jobs"
          description="Work submitted for this unit and the current status of each job."
        >
          <SimpleList
            items={data.recentJobs}
            render={(item) => (
              <div key={item.id} className="rounded-xl border border-slate-200 px-3 py-2">
                <Item>
                  <Item.Title className="flex items-center justify-between gap-3">
                    <span>{item.title || "Untitled job"}</span>
                    <StatusBadge value={item.status} />
                  </Item.Title>
                  <Item.Description className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500">
                    <span>{item.type || "No type"}</span>
                    <span>{formatCurrency.format(item.amount)}</span>
                    <span>{formatDate(item.createdAt)}</span>
                  </Item.Description>
                </Item>
              </div>
            )}
          />
        </SectionCard>

        <SectionCard
          title="Unit analytics"
          description="What matters most for this unit: production momentum, invoice balance, and how much work is still routed through jobs."
        >
          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-xl border border-slate-200 px-3 py-3">
              <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Production state</p>
              <p className="mt-1 text-lg font-semibold text-slate-950">
                {data.unit.production?.status || "Idle"}
              </p>
              <p className="text-xs text-slate-500">
                {data.unit.production?.date || "No completion date yet"}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 px-3 py-3">
              <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Invoice paid</p>
              <p className="mt-1 text-lg font-semibold text-slate-950">
                {formatCurrency.format(data.summary.invoicePaidAmount)}
              </p>
              <p className="text-xs text-slate-500">
                Against {formatCurrency.format(data.summary.invoiceDueAmount)} due
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 px-3 py-3">
              <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Jobs submitted</p>
              <p className="mt-1 text-lg font-semibold text-slate-950">{data.summary.jobs}</p>
              <p className="text-xs text-slate-500">Operational work logged on this unit</p>
            </div>
            <div className="rounded-xl border border-slate-200 px-3 py-3">
              <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Created</p>
              <p className="mt-1 text-lg font-semibold text-slate-950">
                {formatDate(data.unit.createdAt)}
              </p>
              <p className="text-xs text-slate-500">Unit entered the community workflow</p>
            </div>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
