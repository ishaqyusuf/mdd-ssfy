"use client";

import { Icons } from "@gnd/ui/icons";

import { Suspense } from "react";
import type { RouterOutputs } from "@api/trpc/routers/_app";
import { Button } from "@gnd/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@gnd/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@gnd/ui/tabs";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { formatDate } from "@gnd/utils/dayjs";
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

function isImageDocument(document: {
    mimeType?: string | null;
    extension?: string | null;
}) {
    if (document.mimeType?.startsWith("image/")) return true;
    return ["jpg", "jpeg", "png", "gif", "webp", "avif"].includes(
        String(document.extension || "").toLowerCase(),
    );
}

function DocumentAttachment({
    document,
}: {
    document: ProjectOverviewData["recentDocuments"][number];
}) {
    const imageDocument = isImageDocument(document);

    const content = (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white transition-colors hover:border-emerald-300">
            <div className="flex aspect-[4/3] items-center justify-center overflow-hidden bg-slate-50">
                {imageDocument && document.url ? (
                    <img
                        src={document.url}
                        alt={document.title}
                        className="h-full w-full object-cover"
                    />
                ) : (
                    <div className="flex flex-col items-center gap-2 text-slate-500">
                        {imageDocument ? (
                            <Icons.FileImage className="size-7" />
                        ) : (
                            <Icons.FileText className="size-7" />
                        )}
                    </div>
                )}
            </div>
            <div className="space-y-1 px-3 py-2">
                <p className="truncate text-sm font-medium text-slate-900">
                    {document.title}
                </p>
                <p className="text-[11px] text-slate-500">
                    {document.uploadedByName || "Unknown"} •{" "}
                    {formatDate(document.createdAt)}
                </p>
            </div>
        </div>
    );

    if (!document.url) return content;

    return (
        <a href={document.url} target="_blank" rel="noreferrer">
            {content}
        </a>
    );
}

function ActivityHistory({ data }: { data: ProjectOverviewData }) {
    if (!data.recentDocumentActivity.length) {
        return <EmptyState label="Activity history" />;
    }

    return (
        <div className="space-y-3">
            {data.recentDocumentActivity.map((activity) => (
                <div
                    key={activity.id}
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm"
                >
                    <div className="flex items-start gap-3">
                        <span className="mt-0.5 flex size-8 items-center justify-center rounded-full bg-slate-100 text-slate-600">
                            <Icons.FileText className="size-4" />
                        </span>
                        <div className="min-w-0 flex-1 space-y-2">
                            <div>
                                <p className="text-sm font-medium text-slate-900">
                                    {activity.headline || activity.subject}
                                </p>
                                <p className="text-[11px] text-slate-400">
                                    {activity.authorName} •{" "}
                                    {formatDate(activity.createdAt)}
                                </p>
                            </div>
                            {activity.note ? (
                                <p className="text-sm text-slate-600">
                                    {activity.note}
                                </p>
                            ) : null}
                            {activity.documents.length ? (
                                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                                    {activity.documents.map((document) => (
                                        <DocumentAttachment
                                            key={document.id}
                                            document={document}
                                        />
                                    ))}
                                </div>
                            ) : null}
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}

function ProjectTimelinePanel({ data }: { data: ProjectOverviewData }) {
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
        <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
            <Card className="border-slate-200 shadow-sm">
                <CardHeader className="pb-3">
                    <CardTitle className="text-base font-semibold text-slate-900">
                        Add project update
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
                {data.recentDocuments.length ? (
                    <CardContent className="space-y-3 pt-0">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                                Recent documents
                            </p>
                            <div className="mt-3 grid gap-3 sm:grid-cols-2">
                                {data.recentDocuments.map((document) => (
                                    <DocumentAttachment
                                        key={document.id}
                                        document={document}
                                    />
                                ))}
                            </div>
                        </div>
                    </CardContent>
                ) : null}
            </Card>

            <Card className="border-slate-200 shadow-sm">
                <CardHeader className="pb-3">
                    <CardTitle className="text-base font-semibold text-slate-900">
                        Activity history
                    </CardTitle>
                    <p className="text-sm text-slate-500">
                        Timeline of project updates, notes, and attached
                        documents.
                    </p>
                </CardHeader>
                <CardContent>
                    <ActivityHistory data={data} />
                </CardContent>
            </Card>
        </div>
    );
}

export function ProjectOverviewWidget({ data }: { data: ProjectOverviewData }) {
    return (
        <WidgetShell
            title="Project activity"
            description="A tabbed operational widget for units, production activity, invoice activity, jobs, and timeline updates on this project."
        >
            <Tabs defaultValue="units" className="space-y-4">
                <TabsList className="grid h-auto w-full grid-cols-2 gap-2 rounded-2xl bg-slate-100 p-1.5 md:grid-cols-5">
                    <TabsTrigger
                        value="units"
                        className="gap-2 rounded-xl py-2.5"
                    >
                        <Icons.Home className="size-4" />
                        Units
                    </TabsTrigger>
                    <TabsTrigger
                        value="production"
                        className="gap-2 rounded-xl py-2.5"
                    >
                        <Icons.Hammer className="size-4" />
                        Production
                    </TabsTrigger>
                    <TabsTrigger
                        value="invoices"
                        className="gap-2 rounded-xl py-2.5"
                    >
                        <Icons.Receipt className="size-4" />
                        Invoices
                    </TabsTrigger>
                    <TabsTrigger
                        value="jobs"
                        className="gap-2 rounded-xl py-2.5"
                    >
                        <Icons.BriefcaseBusiness className="size-4" />
                        Jobs
                    </TabsTrigger>
                    <TabsTrigger
                        value="documents"
                        className="gap-2 rounded-xl py-2.5"
                    >
                        <Icons.FileText className="size-4" />
                        Project Timeline
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
                    <ProjectTimelinePanel data={data} />
                </TabsContent>
            </Tabs>
        </WidgetShell>
    );
}
