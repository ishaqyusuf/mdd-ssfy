"use client";

import { useSalesOverviewQuery } from "@/hooks/use-sales-overview-query";
import { Button } from "@gnd/ui/button";
import { Icons } from "@gnd/ui/icons";

import { useProduction } from "./context";

const bannerCopy = {
	not_configured: {
		title: "Inventory setup incomplete",
		description:
			"Production assignment and submission remain available. A submitted job will be saved for admin verification until the required material records are configured.",
	},
} as const;

export function ProductionReadinessBanner() {
	const production = useProduction();
	const readiness = production.readiness;
	const query = useSalesOverviewQuery();
	const workerMode = Boolean(query.assignedTo);
	const reviewInventory = () => query.setParams({ salesTab: "inventory" });
	if (workerMode) {
		if (production.readinessLoading) return null;
		if (production.readinessUnavailable) {
			return (
				<section
					id="production-readiness"
					className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-950"
				>
					<div className="flex items-start gap-3">
						<Icons.AlertTriangle className="mt-0.5 size-5 shrink-0 text-amber-700" />
						<div>
							<h3 className="font-semibold">
								Material availability could not be verified
							</h3>
							<p className="mt-1 text-sm text-amber-900">
								You can report completed work now. It will remain awaiting admin
								approval until material availability can be verified.
							</p>
						</div>
					</div>
				</section>
			);
		}
		if (
			!readiness ||
			readiness.state === "ready" ||
			readiness.state === "not_configured" ||
			readiness.state === "read_only"
		) {
			return null;
		}
		const assignedItemIds = new Set(
			(production.data?.items || [])
				.filter(
					(item) =>
						Number(item?.analytics?.stats?.prodAssigned?.qty || 0) > 0,
				)
				.map((item) => item.itemId),
		);
		const relevantBlockers = readiness.blockers.filter(
			(blocker) =>
				blocker.salesItemId == null || assignedItemIds.has(blocker.salesItemId),
		);
		if (!relevantBlockers.length) return null;
		const blockerPreview = relevantBlockers.slice(0, 3);
		return (
			<section
				id="production-readiness"
				className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-950"
			>
				<div className="flex min-w-0 items-start gap-3">
					<Icons.AlertTriangle className="mt-0.5 size-5 shrink-0 text-amber-700" />
					<div className="min-w-0">
						<h3 className="font-semibold">Materials need verification</h3>
						<p className="mt-1 text-sm text-amber-900">
							You can report completed work for affected items. It will remain
							awaiting admin approval until the material record is resolved.
						</p>
						{blockerPreview.length ? (
							<ul className="mt-2 space-y-1 text-xs text-amber-800">
								{blockerPreview.map((blocker, index) => (
									<li key={`${blocker.componentId}-${index}`}>
										{blocker.lineTitle || "Production item"}
										{blocker.componentName
											? ` — ${blocker.componentName}`
											: ""}
									</li>
								))}
							</ul>
						) : null}
					</div>
				</div>
			</section>
		);
	}

	if (production.readinessLoading) {
		return (
			<div
				id="production-readiness"
				className="h-24 animate-pulse rounded-lg border bg-muted/40"
			/>
		);
	}
	if (production.readinessUnavailable) {
		return (
			<section
				id="production-readiness"
				className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-950"
			>
				<div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
					<div className="flex items-start gap-3">
						<Icons.AlertTriangle className="mt-0.5 size-5 text-amber-700" />
						<div>
							<h3 className="font-semibold">
								Inventory status is temporarily unavailable
							</h3>
							<p className="mt-1 text-sm text-amber-900">
								Production assignment and submission remain available. A
								submitted job will be saved for admin verification while the
								material status is unavailable.
							</p>
						</div>
					</div>
					<Button variant="outline" size="sm" onClick={reviewInventory}>
						Review inventory
					</Button>
				</div>
			</section>
		);
	}
	if (!readiness) return null;

	if (readiness.state === "ready") {
		return (
			<section
				id="production-readiness"
				className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-emerald-950"
			>
				<div className="flex items-start gap-3">
					<Icons.ShieldCheck className="mt-0.5 size-5 text-emerald-700" />
					<div>
						<h3 className="font-semibold">Inventory ready</h3>
						<p className="mt-1 text-sm text-emerald-800">
							Production assignment is available and required inventory is
							recorded as ready for work to begin.
						</p>
					</div>
				</div>
			</section>
		);
	}

	if (readiness.state === "read_only") {
		return (
			<section
				id="production-readiness"
				className="rounded-lg border bg-muted/40 p-4"
			>
				<div className="flex items-start gap-3">
					<Icons.Lock className="mt-0.5 size-5 text-muted-foreground" />
					<div>
						<h3 className="font-semibold">Production is read-only</h3>
						<p className="mt-1 text-sm text-muted-foreground">
							This order is complete or cancelled, so production can no longer
							be assigned.
						</p>
					</div>
				</div>
			</section>
		);
	}
	if (readiness.state === "blocked") {
		return (
			<section
				id="production-readiness"
				className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-amber-950"
			>
				<div className="flex items-center justify-between gap-3">
					<h3 className="text-sm font-semibold">Material Pending</h3>
					<Button variant="outline" size="sm" onClick={reviewInventory}>
						Review Inventory
					</Button>
				</div>
			</section>
		);
	}

	const copy = bannerCopy.not_configured;
	const blockerPreview = readiness.blockers.slice(0, 3);
	return (
		<section
			id="production-readiness"
			className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-950"
		>
			<div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
				<div className="flex min-w-0 items-start gap-3">
					<Icons.AlertTriangle className="mt-0.5 size-5 shrink-0 text-amber-700" />
					<div className="min-w-0">
						<h3 className="font-semibold">{copy.title}</h3>
						<p className="mt-1 text-sm text-amber-900">{copy.description}</p>
						{blockerPreview.length ? (
							<ul className="mt-2 space-y-1 text-xs text-amber-800">
								{blockerPreview.map((blocker, index) => (
									<li key={`${blocker.componentId}-${index}`}>
										{blocker.lineTitle || "Order item"}
										{blocker.componentName ? ` — ${blocker.componentName}` : ""}
									</li>
								))}
							</ul>
						) : null}
					</div>
				</div>
				<div className="flex shrink-0 flex-wrap gap-2">
					<Button variant="outline" size="sm" onClick={reviewInventory}>
						Review inventory
					</Button>
				</div>
			</div>
		</section>
	);
}
