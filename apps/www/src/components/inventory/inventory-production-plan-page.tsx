"use client";

import type { RouterInputs, RouterOutputs } from "@api/trpc/routers/_app";
import { buildSalesInventoryPrintViewerUrl } from "@/modules/sales-print/application/inventory-print-request";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useTRPC } from "@/trpc/client";
import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import { Card } from "@gnd/ui/card";
import { Icons } from "@gnd/ui/icons";
import { useQuery } from "@gnd/ui/tanstack";

type ProductionPlanInput =
	RouterInputs["inventories"]["salesProductionPlan"];
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

const readinessToneClassName: Record<Exclude<ProductionReadiness, "all">, string> =
	{
		ready_for_production: "border-emerald-200 bg-emerald-50 text-emerald-700",
		fulfilled: "border-blue-200 bg-blue-50 text-blue-700",
		awaiting_inbound: "border-amber-200 bg-amber-50 text-amber-700",
		allocation_review: "border-violet-200 bg-violet-50 text-violet-700",
		blocked: "border-rose-200 bg-rose-50 text-rose-700",
	};

function getProductionPlanInput(readiness: ProductionReadiness): ProductionPlanInput {
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

function getSalesOverviewUrl(orderId: string | null) {
	if (!orderId) return null;
	const params = new URLSearchParams({
		overviewId: orderId,
		overviewType: "sales",
		overviewMode: "sales-production",
		overviewTab: "production",
	});
	return `/sales-book/orders/overview-v2?${params.toString()}`;
}

export function InventoryProductionPlanPage() {
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
	const components = plan?.components ?? [];
	const supplierGroups = plan?.groups.bySupplier ?? [];
	const stockStatusGroups = plan?.groups.byStockStatus ?? [];
	const printUrl = useMemo(
		() =>
			buildSalesInventoryPrintViewerUrl({
				salesIds: components.map((component) => component.salesOrderId),
				mode: "production",
			}),
		[components],
	);
	const canPrint = components.some((component) => component.salesOrderId);

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

			<div className="grid gap-3">
				{components.map((component) => {
					const overviewUrl = getSalesOverviewUrl(component.orderId);

					return (
						<Card
							key={`${component.lineItemId}-${component.componentId}-${component.inventoryVariantId}`}
							className="p-4"
						>
							<div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
								<div className="min-w-0 space-y-2">
									<div className="flex flex-wrap items-center gap-2">
										<div className="font-medium">
											{component.componentName || "Unknown component"}
										</div>
										<Badge
											variant="outline"
											className={`capitalize ${readinessToneClassName[component.readiness]}`}
										>
											{formatLabel(component.readiness)}
										</Badge>
										<Badge variant="outline" className="capitalize">
											{formatLabel(component.stockStatus)}
										</Badge>
									</div>
									<div className="text-sm text-muted-foreground">
										Order {component.orderId || component.salesOrderId || "N/A"} -{" "}
										{component.customerName || "Unknown customer"} -{" "}
										{component.lineTitle || "Untitled line item"}
									</div>
									<div className="text-sm text-muted-foreground">
										{component.inventoryVariantSku
											? `${component.inventoryVariantSku} - `
											: ""}
										{component.supplierName || "Unassigned supplier"}
									</div>
									<div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
										<span>Need {formatQty(component.remainingQty)}</span>
										<span>Allocated {formatQty(component.allocatedQty)}</span>
										<span>
											Review {formatQty(component.pendingReviewQty)}
										</span>
										<span>Inbound {formatQty(component.inboundQty)}</span>
										<span>Short {formatQty(component.backorderedQty)}</span>
									</div>
								</div>
								{overviewUrl ? (
									<Button asChild size="sm" variant="outline">
										<Link href={overviewUrl}>
											<Icons.ExternalLink className="mr-2 size-4" />
											Open Production
										</Link>
									</Button>
								) : null}
							</div>
						</Card>
					);
				})}

				{!components.length ? (
					<Card className="p-8 text-center">
						<div className="font-medium">No production components found</div>
						<div className="mt-1 text-sm text-muted-foreground">
							{planQuery.isLoading
								? "Loading production plan..."
								: "Inventory-backed sale components will appear here once synced."}
						</div>
					</Card>
				) : null}
			</div>
		</div>
	);
}
