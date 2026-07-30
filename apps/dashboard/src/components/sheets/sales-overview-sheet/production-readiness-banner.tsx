"use client";

import { useSalesOverviewQuery } from "@/hooks/use-sales-overview-query";
import { Button } from "@gnd/ui/button";
import { Icons } from "@gnd/ui/icons";

import { useProduction } from "./context";

const bannerCopy = {
	blocked: {
		title: "Materials pending",
		description:
			"Production assignment and submission remain available. If completed work is submitted before this is resolved, it will be saved for admin material verification.",
	},
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
	const reviewInventory = () => query.setParams({ salesTab: "inventory" });

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

	const copy =
		readiness.state === "not_configured"
			? bannerCopy.not_configured
			: bannerCopy.blocked;
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
						{readiness.state === "blocked" ? (
							<p className="mt-2 text-sm text-amber-800">
								{readiness.summary.blockedComponentCount} required component
								{readiness.summary.blockedComponentCount === 1 ? "" : "s"}{" "}
								blocked
								{readiness.summary.openInboundQty
									? ` · ${readiness.summary.openInboundQty} open inbound`
									: ""}
							</p>
						) : null}
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
