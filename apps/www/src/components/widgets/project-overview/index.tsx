"use client";

import { Suspense } from "react";
import type { RouterOutputs } from "@api/trpc/routers/_app";
import { Button } from "@gnd/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@gnd/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@gnd/ui/tabs";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { formatDate } from "@gnd/utils/dayjs";
import {
    BriefcaseBusiness,
    ExternalLink,
    FileText,
    Hammer,
    Home,
    Receipt,
} from "lucide-react";
import { DocumentUploader } from "@/components/common/document-uploader";
import { DataTable as ContractorJobsDataTable } from "@/components/tables/contractor-jobs/data-table";
import { projectTabColumns as projectJobsColumns } from "@/components/tables/contractor-jobs/columns";
import { DataTable as ProjectUnitsDataTable } from "@/components/tables/project-units/data-table";
import { projectTabColumns as projectUnitsColumns } from "@/components/tables/project-units/columns";
import { DataTable as UnitInvoicesDataTable } from "@/components/tables/unit-invoices/data-table";
import { projectTabColumns as projectInvoicesColumns } from "@/components/tables/unit-invoices/columns";
import { DataTable as UnitProductionsDataTable } from "@/components/tables/unit-productions/data-table";
import { projectTabColumns as projectProductionColumns } from "@/components/tables/unit-productions/columns";
import { useTRPC } from "@/trpc/client";

type ProjectOverviewData =
    RouterOutputs["community"]["communityProjectOverview"];

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

function TabFallback({ label }: { label: string }) {
    return (
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-10 text-sm text-slate-500 shadow-sm">
            Loading {label.toLowerCase()}...
        </div>
    );
}

function DocumentsPanel({ data }: { data: ProjectOverviewData }) {
    const trpc = useTRPC();
    const queryClient = useQueryClient();
    const uploadDocuments = useMutation(
        trpc.community.uploadCommunityProjectDocuments.mutationOptions({
            onSuccess() {
                queryClient.invalidateQueries({
                    queryKey: trpc.community.communityProjectOverview.queryKey({
                        slug: data.project.slug,
                    }),
                });
            },
        }),
    );

    return (
        <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
            <Card className="border-slate-200 shadow-sm">
                <CardHeader className="pb-3">
                    <CardTitle className="text-base font-semibold text-slate-900">
                        Project documents
                    </CardTitle>
                    <p className="text-sm text-slate-500">
                        Upload one or more files, add context, and send the
                        activity through the shared notification channel.
                    </p>
                </CardHeader>
                <CardContent>
                    <DocumentUploader
                        description="Upload PDFs or images for this project overview. A single note can be attached to the whole batch."
                        submitLabel="Upload to project"
                        onUpload={(input) =>
                            uploadDocuments.mutateAsync({
                                slug: data.project.slug,
                                files: input.files,
                                note: input.note,
                            })
                        }
                    />
                </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-sm">
                <CardHeader className="pb-3">
                    <CardTitle className="text-base font-semibold text-slate-900">
                        Recent uploads
                    </CardTitle>
                    <p className="text-sm text-slate-500">
                        Latest project documents and the related activity notes.
                    </p>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                            Documents
                        </p>
                        {data.recentDocuments.length ? (
                            <div className="space-y-2">
                                {data.recentDocuments.map((document) => (
                                    <div
                                        key={document.id}
                                        className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 px-3 py-2"
                                    >
                                        <div className="min-w-0">
                                            <p className="truncate text-sm font-medium text-slate-900">
                                                {document.title}
                                            </p>
                                            <p className="text-xs text-slate-500">
                                                {document.uploadedByName ||
                                                    "Unknown"}{" "}
                                                •{" "}
                                                {formatDate(document.createdAt)}
                                            </p>
                                        </div>
                                        {document.url ? (
                                            <Button
                                                asChild
                                                variant="ghost"
                                                size="icon"
                                                className="size-8 rounded-full"
                                            >
                                                <a
                                                    href={document.url}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                >
                                                    <ExternalLink className="size-4" />
                                                </a>
                                            </Button>
                                        ) : null}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <EmptyState label="Documents" />
                        )}
                    </div>

                    <div className="space-y-2">
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                            Activity
                        </p>
                        {data.recentDocumentActivity.length ? (
                            <div className="space-y-2">
                                {data.recentDocumentActivity.map((activity) => (
                                    <div
                                        key={activity.id}
                                        className="rounded-xl border border-slate-200 px-3 py-3"
                                    >
                                        <div className="flex items-start gap-3">
                                            <span className="mt-0.5 flex size-8 items-center justify-center rounded-full bg-slate-100 text-slate-600">
                                                <FileText className="size-4" />
                                            </span>
                                            <div className="min-w-0 flex-1 space-y-1">
                                                <p className="text-sm font-medium text-slate-900">
                                                    {activity.headline ||
                                                        activity.subject}
                                                </p>
                                                {activity.note ? (
                                                    <p className="text-xs text-slate-600">
                                                        {activity.note}
                                                    </p>
                                                ) : null}
                                                <p className="text-[11px] text-slate-400">
                                                    {activity.authorName} •{" "}
                                                    {formatDate(
                                                        activity.createdAt,
                                                    )}
                                                </p>
                                                {activity.documents.length ? (
                                                    <div className="flex flex-wrap gap-2 pt-1">
                                                        {activity.documents.map(
                                                            (document) =>
                                                                document?.url ? (
                                                                    <a
                                                                        key={
                                                                            document.id
                                                                        }
                                                                        href={
                                                                            document.url
                                                                        }
                                                                        target="_blank"
                                                                        rel="noreferrer"
                                                                        className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-700 transition-colors hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700"
                                                                    >
                                                                        {
                                                                            document.title
                                                                        }
                                                                    </a>
                                                                ) : (
                                                                    <span
                                                                        key={
                                                                            document.id
                                                                        }
                                                                        className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-700"
                                                                    >
                                                                        {
                                                                            document.title
                                                                        }
                                                                    </span>
                                                                ),
                                                        )}
                                                    </div>
                                                ) : null}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <EmptyState label="Document activity" />
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

export function ProjectOverviewWidget({ data }: { data: ProjectOverviewData }) {
    return (
        <WidgetShell
            title="Project activity"
            description="A tabbed operational widget for units, production activity, invoice activity, jobs, and documents on this project."
        >
            <Tabs defaultValue="units" className="space-y-4">
                <TabsList className="grid h-auto w-full grid-cols-2 gap-2 rounded-2xl bg-slate-100 p-1.5 md:grid-cols-5">
                    <TabsTrigger
                        value="units"
                        className="gap-2 rounded-xl py-2.5"
                    >
                        <Home className="size-4" />
                        Units
                    </TabsTrigger>
                    <TabsTrigger
                        value="production"
                        className="gap-2 rounded-xl py-2.5"
                    >
                        <Hammer className="size-4" />
                        Production
                    </TabsTrigger>
                    <TabsTrigger
                        value="invoices"
                        className="gap-2 rounded-xl py-2.5"
                    >
                        <Receipt className="size-4" />
                        Invoices
                    </TabsTrigger>
                    <TabsTrigger
                        value="jobs"
                        className="gap-2 rounded-xl py-2.5"
                    >
                        <BriefcaseBusiness className="size-4" />
                        Jobs
                    </TabsTrigger>
                    <TabsTrigger
                        value="documents"
                        className="gap-2 rounded-xl py-2.5"
                    >
                        <FileText className="size-4" />
                        Documents
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="units" className="mt-0">
                    <Suspense fallback={<TabFallback label="Units" />}>
                        <ProjectUnitsDataTable
                            embedded
                            columns={projectUnitsColumns}
                            defaultFilters={{
                                projectSlug: data.project.slug,
                            }}
                        />
                    </Suspense>
                </TabsContent>
                <TabsContent value="production" className="mt-0">
                    <Suspense fallback={<TabFallback label="Production" />}>
                        <UnitProductionsDataTable
                            embedded
                            columns={projectProductionColumns}
                            defaultFilters={{
                                projectSlug: data.project.slug,
                            }}
                        />
                    </Suspense>
                </TabsContent>
                <TabsContent value="invoices" className="mt-0">
                    <Suspense fallback={<TabFallback label="Invoices" />}>
                        <UnitInvoicesDataTable
                            embedded
                            columns={projectInvoicesColumns}
                            defaultFilters={{
                                projectSlug: data.project.slug,
                            }}
                        />
                    </Suspense>
                </TabsContent>
                <TabsContent value="jobs" className="mt-0">
                    <Suspense fallback={<TabFallback label="Jobs" />}>
                        <ContractorJobsDataTable
                            embedded
                            columns={projectJobsColumns}
                            emptyStateLabel="Jobs"
                            defaultFilters={{
                                projectId: data.project.id,
                            }}
                        />
                    </Suspense>
                </TabsContent>
                <TabsContent value="documents" className="mt-0">
                    <DocumentsPanel data={data} />
                </TabsContent>
            </Tabs>
        </WidgetShell>
    );
}
