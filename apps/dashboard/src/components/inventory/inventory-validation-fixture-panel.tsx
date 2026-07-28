"use client";

import { useTRPC } from "@/trpc/client";
import type { RouterOutputs } from "@api/trpc/routers/_app";
import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import { Card } from "@gnd/ui/card";
import { Icons } from "@gnd/ui/icons";
import { Skeleton } from "@gnd/ui/skeleton";
import { useQuery } from "@gnd/ui/tanstack";
import Link from "next/link";

type FixtureReport =
	RouterOutputs["inventories"]["inventoryBrowserValidationFixtureReport"];
type FixtureRow = FixtureReport["fixtures"][number];
type WorkflowRow = FixtureReport["workflowMatrix"][number];

function formatNumber(value?: number | null) {
	return Number(value || 0).toLocaleString("en-US", {
		maximumFractionDigits: 2,
	});
}

function formatFixtureLabel(value: string) {
	return value.replaceAll("_", " ");
}

function formatCountDiagnostic(fixture: FixtureRow) {
	const diagnostic = fixture.countDiagnostic;
	const parts = [
		diagnostic.scanLimit != null
			? `scan ${formatNumber(diagnostic.scanLimit)}`
			: null,
		diagnostic.scannedCount != null
			? `checked ${formatNumber(diagnostic.scannedCount)}`
			: null,
		diagnostic.candidateCount != null
			? `candidates ${formatNumber(diagnostic.candidateCount)}`
			: null,
	].filter(Boolean);

	if (parts.length) return parts.join(" / ");
	return formatFixtureLabel(diagnostic.countSource);
}

function formatSampleSummary(
	sample: FixtureRow["samples"][number] & { fixtureKey?: string },
) {
	return [
		sample.fixtureKey ? formatFixtureLabel(sample.fixtureKey) : null,
		sample.id ? `Row #${sample.id}` : null,
		sample.orderId ? `Order ${sample.orderId}` : null,
		sample.saleId ? `Sale #${sample.saleId}` : null,
		sample.lineItemId ? `Line ${sample.lineItemId}` : null,
		sample.inventoryVariantId ? `Variant #${sample.inventoryVariantId}` : null,
		sample.inventoryName,
		sample.variantSku,
		sample.status ? formatFixtureLabel(sample.status) : null,
		sample.qty != null ? `Qty ${formatNumber(sample.qty)}` : null,
		sample.qtyReceived != null
			? `Received ${formatNumber(sample.qtyReceived)}`
			: null,
		sample.stockQty != null ? `Stock ${formatNumber(sample.stockQty)}` : null,
	]
		.filter(Boolean)
		.join(" / ");
}

function FixturePanelSkeleton() {
	return (
		<Card className="p-4">
			<div className="flex flex-col gap-4">
				<div className="flex items-start justify-between gap-3">
					<div className="space-y-2">
						<Skeleton className="h-5 w-52" />
						<Skeleton className="h-4 w-72" />
					</div>
					<Skeleton className="h-6 w-20" />
				</div>
				<div className="grid gap-2 md:grid-cols-3">
					<Skeleton className="h-16" />
					<Skeleton className="h-16" />
					<Skeleton className="h-16" />
				</div>
				<div className="space-y-2">
					<Skeleton className="h-14" />
					<Skeleton className="h-14" />
					<Skeleton className="h-14" />
				</div>
			</div>
		</Card>
	);
}

function SummaryMetric({
	label,
	value,
}: {
	label: string;
	value: string | number;
}) {
	return (
		<div className="rounded-lg border bg-muted/30 p-3">
			<div className="text-xs font-medium uppercase text-muted-foreground">
				{label}
			</div>
			<div className="mt-1 text-xl font-semibold">{value}</div>
		</div>
	);
}

function FixtureStatusIcon({ ready }: { ready: boolean }) {
	if (ready) {
		return <Icons.CheckCircle className="size-4 text-emerald-600" />;
	}
	return <Icons.AlertTriangle className="size-4 text-amber-600" />;
}

function FixtureRow({ fixture }: { fixture: FixtureRow }) {
	const sample = fixture.samples[0];
	const countIncomplete = !fixture.countDiagnostic.complete;

	return (
		<div className="flex flex-col gap-3 border-b py-3 last:border-b-0 lg:flex-row lg:items-center lg:justify-between">
			<div className="min-w-0">
				<div className="flex flex-wrap items-center gap-2">
					<FixtureStatusIcon ready={fixture.ready} />
					<div className="text-sm font-medium">{fixture.label}</div>
					<Badge variant={fixture.ready ? "secondary" : "outline"}>
						{fixture.ready ? "Ready" : "Missing"}
					</Badge>
					{countIncomplete ? (
						<Badge
							variant="outline"
							className="border-amber-300 text-amber-700"
						>
							Bounded count
						</Badge>
					) : null}
				</div>
				<div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
					<span>
						{formatNumber(fixture.count)} / {fixture.requiredCount}
					</span>
					<span>{fixture.seedFixtureId}</span>
					{countIncomplete ? (
						<span>{formatCountDiagnostic(fixture)}</span>
					) : null}
					{sample?.orderId ? <span>Order {sample.orderId}</span> : null}
					{sample?.inventoryName ? <span>{sample.inventoryName}</span> : null}
					{sample?.variantSku ? <span>{sample.variantSku}</span> : null}
					{sample?.status ? (
						<span className="capitalize">
							{formatFixtureLabel(sample.status)}
						</span>
					) : null}
				</div>
				{fixture.ready ? null : (
					<div className="mt-1 text-xs text-muted-foreground">
						{fixture.recommendedAction} See {fixture.seedFixtureId} in the seed
						plan.
					</div>
				)}
				{countIncomplete && fixture.countDiagnostic.note ? (
					<div className="mt-1 text-xs text-amber-700">
						{fixture.countDiagnostic.note}
					</div>
				) : null}
			</div>
			<div className="flex shrink-0 flex-wrap items-center gap-2">
				{fixture.samples.length ? (
					<Badge variant="outline">{fixture.samples.length} samples</Badge>
				) : null}
				<Button asChild variant="outline" size="sm">
					<Link href={fixture.workspaceHref}>Open</Link>
				</Button>
			</div>
		</div>
	);
}

function WorkflowMatrixRow({ workflow }: { workflow: WorkflowRow }) {
	return (
		<div className="flex flex-col gap-3 border-b py-3 last:border-b-0 lg:flex-row lg:items-start lg:justify-between">
			<div className="min-w-0">
				<div className="flex flex-wrap items-center gap-2">
					<FixtureStatusIcon ready={workflow.ready} />
					<div className="text-sm font-medium">{workflow.label}</div>
					<Badge variant={workflow.ready ? "secondary" : "outline"}>
						{workflow.ready ? "Runnable" : "Blocked"}
					</Badge>
					<Badge variant="outline">{workflow.phase}</Badge>
					<Badge variant="outline">Run {workflow.runOrder}</Badge>
				</div>
				<div className="mt-1 text-xs leading-5 text-muted-foreground">
					{workflow.operatorAction}
				</div>
				<div className="mt-1 text-xs leading-5 text-muted-foreground">
					Guard: {workflow.operatorGuard}
				</div>
				<div className="mt-1 text-xs leading-5 text-muted-foreground">
					{workflow.expectedEvidence}
				</div>
				{workflow.missingFixtureKeys.length ? (
					<div className="mt-1 text-xs text-amber-700">
						Missing fixtures: {workflow.missingFixtureKeys.join(", ")}
					</div>
				) : null}
				{workflow.primarySample ? (
					<div className="mt-2 text-xs text-muted-foreground">
						Use{" "}
						<Badge
							variant="secondary"
							className="max-w-full truncate align-middle"
							title={formatSampleSummary(workflow.primarySample)}
						>
							{formatSampleSummary(workflow.primarySample)}
						</Badge>
					</div>
				) : null}
				{workflow.candidateSamples.length ? (
					<div className="mt-2 flex flex-wrap gap-2">
						{workflow.candidateSamples.map((sample) => (
							<Badge
								key={`${sample.fixtureKey}-${sample.id}`}
								variant="outline"
								className="max-w-full truncate"
								title={formatSampleSummary(sample)}
							>
								{formatSampleSummary(sample)}
							</Badge>
						))}
					</div>
				) : null}
			</div>
			<div className="shrink-0">
				<Button asChild variant="outline" size="sm">
					<Link href={workflow.workspaceHref}>Open</Link>
				</Button>
			</div>
		</div>
	);
}

function WorkflowMatrix({ report }: { report: FixtureReport }) {
	const blockedWorkflows = report.workflowMatrix.filter(
		(workflow) => !workflow.ready,
	);
	const visibleWorkflows = blockedWorkflows.length
		? blockedWorkflows
		: report.workflowMatrix;

	return (
		<div className="rounded-lg border p-3">
			<div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
				<div>
					<div className="text-sm font-medium">Browser Mutation Matrix</div>
					<div className="mt-1 text-xs leading-5 text-muted-foreground">
						{report.summary.readyWorkflowCount} of{" "}
						{report.summary.requiredWorkflowCount} checks runnable.
					</div>
				</div>
				<Badge variant={blockedWorkflows.length ? "outline" : "secondary"}>
					{blockedWorkflows.length ? "Waiting on fixtures" : "Ready to run"}
				</Badge>
			</div>
			<div className="mt-2">
				{visibleWorkflows.map((workflow) => (
					<WorkflowMatrixRow key={workflow.key} workflow={workflow} />
				))}
			</div>
		</div>
	);
}

function CountDiagnosticsNotice({
	report,
}: {
	report: FixtureReport;
}) {
	const incompleteFixtures = report.diagnostics?.incompleteCountFixtures ?? [];

	if (!incompleteFixtures.length) return null;

	return (
		<div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
			<div className="flex items-start gap-2">
				<Icons.AlertTriangle className="mt-0.5 size-4 shrink-0" />
				<div className="min-w-0">
					<div className="font-medium">Bounded fixture counts</div>
					<div className="mt-1 text-xs leading-5">
						{incompleteFixtures.map((fixture) => fixture.label).join(", ")} may
						be underreported because the readiness check scanned a bounded
						candidate set.
					</div>
				</div>
			</div>
		</div>
	);
}

function SeedFixturesNotice({ report }: { report: FixtureReport }) {
	const seedFixtures = report.diagnostics?.seedFixturesToPrepare ?? [];

	if (!seedFixtures.length) return null;

	return (
		<div className="rounded-lg border bg-muted/30 p-3 text-sm">
			<div className="flex items-start gap-2">
				<Icons.ClipboardList className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
				<div className="min-w-0">
					<div className="font-medium">Fixture seeds to prepare</div>
					<div className="mt-2 flex flex-wrap gap-2">
						{seedFixtures.map((seed) => (
							<Badge key={seed.seedFixtureId} variant="outline">
								{seed.seedFixtureId}: {seed.missingCount}
							</Badge>
						))}
					</div>
					<div className="mt-2 text-xs leading-5 text-muted-foreground">
						Use the seed plan before rerunning the browser mutation matrix.
					</div>
				</div>
			</div>
		</div>
	);
}

export function InventoryValidationFixturePanel() {
	const trpc = useTRPC();
	const fixtureQuery = useQuery(
		trpc.inventories.inventoryBrowserValidationFixtureReport.queryOptions(
			undefined,
			{
				refetchOnWindowFocus: false,
				staleTime: 60 * 1000,
			},
		),
	);
	const report = fixtureQuery.data;

	if (fixtureQuery.isLoading) {
		return <FixturePanelSkeleton />;
	}

	if (!report) {
		return (
			<Card className="p-4 text-sm text-muted-foreground">
				Inventory validation fixture report unavailable.
			</Card>
		);
	}

	const visibleFixtures =
		report.status === "ready"
			? report.fixtures
			: report.fixtures.filter((fixture) => !fixture.ready);

	return (
		<Card className="p-4">
			<div className="flex flex-col gap-4">
				<div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
					<div>
						<div className="flex flex-wrap items-center gap-2">
							<h2 className="text-lg font-semibold">Validation Fixtures</h2>
							<Badge
								variant={report.status === "ready" ? "secondary" : "outline"}
							>
								{report.status === "ready" ? "Ready" : "Blocked"}
							</Badge>
						</div>
						<p className="mt-1 text-sm text-muted-foreground">
							{report.nextAction}
						</p>
					</div>
					<Button asChild variant="outline" size="sm">
						<Link href="/inventory/inbounds">
							<Icons.ClipboardList className="mr-2 size-4" />
							Evidence
						</Link>
					</Button>
				</div>

				<div className="grid gap-2 md:grid-cols-3">
					<SummaryMetric
						label="Ready"
						value={formatNumber(report.summary.readyFixtureCount)}
					/>
					<SummaryMetric
						label="Required"
						value={formatNumber(report.summary.requiredFixtureCount)}
					/>
					<SummaryMetric
						label="Missing"
						value={formatNumber(report.summary.missingFixtureCount)}
					/>
				</div>

				<SeedFixturesNotice report={report} />
				<CountDiagnosticsNotice report={report} />
				<WorkflowMatrix report={report} />

				<div>
					{visibleFixtures.map((fixture) => (
						<FixtureRow key={fixture.key} fixture={fixture} />
					))}
				</div>
			</div>
		</Card>
	);
}
