"use client";

import { InventoryProductionPlanColumnVisibility } from "@/components/tables-2/inventory-production-plan/column-visibility";
import { DataTable } from "@/components/tables-2/inventory-production-plan/data-table";
import { buildSalesInventoryPrintViewerUrl } from "@/modules/sales-print/application/inventory-print-request";
import { useTRPC } from "@/trpc/client";
import type { TableSettings } from "@/utils/table-settings";
import type { RouterInputs, RouterOutputs } from "@api/trpc/routers/_app";
import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import { Card } from "@gnd/ui/card";
import { Icons } from "@gnd/ui/icons";
import { useQuery } from "@gnd/ui/tanstack";
import { useMemo, useState } from "react";

type ProductionPlanInput = RouterInputs["inventories"]["salesProductionPlan"];
type ProductionPlan = RouterOutputs["inventories"]["salesProductionPlan"];
type ProductionComponent = ProductionPlan["components"][number];
type ProductionReadiness = ProductionComponent["readiness"] | "all";

const readinessFilters: Array<{
	label: string;
	value: ProductionReadiness;
}> = [
	{ label: "All", value: "all" },
	{ label: "Ready", value: "ready_for_production" },
	{ label: "Awaiting Inbound", value: "awaiting_inbound" },
	{ label: "Review", value: "allocation_review" },
	{ label: "Blocked", value: "blocked" },
	{ label: "Fulfilled", value: "fulfilled" },
];

function getProductionPlanInput(
	readiness: ProductionReadiness,
): ProductionPlanInput {
	return {
		limit: 150,
		readinesses: readiness === "all" ? null : [readiness],
	};
}

function formatQty(value: number | null | undefined) {
	return Number(value || 0).toLocaleString(undefined, {
		maximumFractionDigits: 2,
	});
}

function formatLabel(value: string | null | undefined) {
	return value ? value.replaceAll("_", " ") : "unknown";
}

type Props = {
	initialSettings?: Partial<TableSettings>;
};

export function InventoryProductionPlanPage({ initialSettings }: Props) {
	const trpc = useTRPC();
	const [readiness, setReadiness] = useState<ProductionReadiness>("all");
	const input = useMemo(() => getProductionPlanInput(readiness), [readiness]);
	const planQuery = useQuery(
		trpc.inventories.salesProductionPlan.queryOptions(input, {
			refetchOnWindowFocus: false,
			staleTime: 60 * 1000,
		}),
	);
	const plan = planQuery.data;
	const summary = plan?.summary;
	const productionComponents = plan?.components ?? [];
	const supplierGroups = plan?.groups.bySupplier ?? [];
	const stockStatusGroups = plan?.groups.byStockStatus ?? [];
	const printUrl = useMemo(
		() =>
			buildSalesInventoryPrintViewerUrl({
				salesIds: productionComponents.map(
					(component) => component.salesOrderId,
				),
				mode: "production",
			}),
		[productionComponents],
	);
	const canPrint = productionComponents.some(
		(component) => component.salesOrderId,
	);

	return (
		<div className="flex flex-col gap-6">
			<div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
				<div className="space-y-1">
					<h2 className="text-lg font-semibold">Production Plan</h2>
					<p className="max-w-3xl text-sm text-muted-foreground">
						Group inventory-backed sale components by readiness, supplier, and
						stock status before production starts.
					</p>
				</div>
				<div className="flex flex-wrap gap-2">
					<InventoryProductionPlanColumnVisibility />
					<Button
						type="button"
						variant="outline"
						disabled={!canPrint}
						onClick={() => {
							window.open(printUrl, "_blank", "noopener,noreferrer");
						}}
					>
						<Icons.FileText className="mr-2 size-4" />
						Print Production
					</Button>
				</div>
			</div>

			<div className="grid gap-4 md:grid-cols-5">
				<Card className="p-4">
					<div className="text-xs uppercase text-muted-foreground">
						Readiness
					</div>
					<div className="text-lg font-semibold capitalize">
						{formatLabel(summary?.readiness)}
					</div>
				</Card>
				<Card className="p-4">
					<div className="text-xs uppercase text-muted-foreground">
						Ready Lines
					</div>
					<div className="text-2xl font-semibold">
						{formatQty(summary?.readyLineCount)}
					</div>
				</Card>
				<Card className="p-4">
					<div className="text-xs uppercase text-muted-foreground">
						Blocked Lines
					</div>
					<div className="text-2xl font-semibold">
						{formatQty(summary?.blockedLineCount)}
					</div>
				</Card>
				<Card className="p-4">
					<div className="text-xs uppercase text-muted-foreground">
						Components
					</div>
					<div className="text-2xl font-semibold">
						{formatQty(summary?.componentCount)}
					</div>
				</Card>
				<Card className="p-4">
					<div className="text-xs uppercase text-muted-foreground">
						Inbound / Short
					</div>
					<div className="text-2xl font-semibold">
						{formatQty(summary?.inboundQty)} /{" "}
						{formatQty(summary?.backorderedQty)}
					</div>
				</Card>
			</div>

			<div className="flex flex-wrap items-center gap-2">
				{readinessFilters.map((filter) => (
					<Button
						key={filter.value}
						type="button"
						size="sm"
						variant={readiness === filter.value ? "default" : "outline"}
						onClick={() => setReadiness(filter.value)}
					>
						{filter.label}
					</Button>
				))}
			</div>

			<div className="grid gap-4 lg:grid-cols-2">
				<Card className="p-4">
					<div className="mb-3 text-sm font-medium">Supplier Load</div>
					<div className="grid gap-2">
						{supplierGroups.slice(0, 8).map((group) => (
							<div
								key={group.key}
								className="flex items-center justify-between gap-3 rounded-md border p-3 text-sm"
							>
								<div className="min-w-0">
									<div className="truncate font-medium">{group.label}</div>
									<div className="text-muted-foreground">
										{group.componentCount} components / {group.lineCount} lines
									</div>
								</div>
								<div className="text-right text-muted-foreground">
									<div>Inbound {formatQty(group.inboundQty)}</div>
									<div>Short {formatQty(group.backorderedQty)}</div>
								</div>
							</div>
						))}
						{!supplierGroups.length ? (
							<div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
								No supplier load yet.
							</div>
						) : null}
					</div>
				</Card>

				<Card className="p-4">
					<div className="mb-3 text-sm font-medium">Stock Status</div>
					<div className="grid gap-2">
						{stockStatusGroups.map((group) => (
							<div
								key={group.key}
								className="flex items-center justify-between gap-3 rounded-md border p-3 text-sm"
							>
								<div className="min-w-0">
									<div className="truncate font-medium capitalize">
										{group.label}
									</div>
									<div className="text-muted-foreground">
										{group.componentCount} components / {group.lineCount} lines
									</div>
								</div>
								<Badge variant="outline" className="capitalize">
									{formatLabel(group.readiness)}
								</Badge>
							</div>
						))}
						{!stockStatusGroups.length ? (
							<div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
								No stock status groups yet.
							</div>
						) : null}
					</div>
				</Card>
			</div>

			<DataTable
				data={productionComponents}
				initialSettings={initialSettings}
				isLoading={planQuery.isLoading}
			/>
		</div>
	);
}
