"use client";

import { useAuth } from "@/hooks/use-auth";
import { useSalesOverviewQuery } from "@/hooks/use-sales-overview-query";
import { useTRPC } from "@/trpc/client";
import { Button } from "@gnd/ui/button";
import { Icons } from "@gnd/ui/icons";
import { AlertDialog } from "@gnd/ui/namespace";
import { useMutation } from "@gnd/ui/tanstack";
import { toast } from "@gnd/ui/use-toast";
import { useState } from "react";

import { useProduction } from "./context";

const bannerCopy = {
	blocked: {
		title: "Inventory confirmation required",
		description:
			"Production cannot start because required inventory is still awaiting inbound or allocation.",
	},
	not_configured: {
		title: "Inventory setup required",
		description:
			"Required inventory components are not configured for this order. Review the Inventory tab before assigning production.",
	},
	read_only: {
		title: "Production is read-only",
		description:
			"This order is complete or cancelled, so production readiness cannot be changed.",
	},
} as const;

export function ProductionReadinessBanner() {
	const production = useProduction();
	const readiness = production.readiness;
	const auth = useAuth();
	const query = useSalesOverviewQuery();
	const trpc = useTRPC();
	const [confirmOpen, setConfirmOpen] = useState(false);
	const [revokeOpen, setRevokeOpen] = useState(false);
	const mutation = useMutation(
		trpc.sales.setProductionReadinessOverride.mutationOptions({
			onSuccess: async (result) => {
				await production.refetchReadiness();
				setConfirmOpen(false);
				setRevokeOpen(false);
				toast({
					title:
						result.outcome === "confirmed"
							? "Production readiness confirmed"
							: result.outcome === "revoked"
								? "Production readiness override revoked"
								: "Production readiness refreshed",
					description:
						result.outcome === "stale"
							? "Inventory changed while you were reviewing it. Please review the updated status."
							: undefined,
					variant: result.outcome === "stale" ? "destructive" : "success",
				});
			},
			onError: (error) =>
				toast({
					title: "Could not update production readiness",
					description: error.message,
					variant: "destructive",
				}),
		}),
	);

	if (production.readinessLoading || (!readiness && production.data?.orderId)) {
		return (
			<div
				id="production-readiness"
				className="h-24 animate-pulse rounded-lg border bg-muted/40"
			/>
		);
	}
	if (!readiness) return null;

	const reviewInventory = () => query.setParams({ salesTab: "inventory" });
	const mutate = (action: "confirm" | "revoke") => {
		if (!production.data?.orderId || !readiness.revision) return;
		mutation.mutate({
			salesOrderId: production.data.orderId,
			expectedRevision: readiness.revision,
			action,
			affirmation:
				action === "confirm"
					? "all_required_inventory_physically_available"
					: undefined,
		});
	};

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
							Required inventory is recorded as ready. Production can be
							assigned.
						</p>
					</div>
				</div>
			</section>
		);
	}

	if (readiness.state === "overridden") {
		return (
			<section
				id="production-readiness"
				className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-blue-950"
			>
				<div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
					<div className="flex items-start gap-3">
						<Icons.ShieldCheck className="mt-0.5 size-5 text-blue-700" />
						<div>
							<h3 className="font-semibold">
								Materials confirmed for production
							</h3>
							<p className="mt-1 text-sm text-blue-800">
								Production assignments are allowed for this exact inventory
								snapshot. Inbound and stock records remain unresolved until
								reconciled in Inventory.
							</p>
							{readiness.override?.confirmedBy?.name ? (
								<p className="mt-2 text-xs text-blue-700">
									Confirmed by {readiness.override.confirmedBy.name}
								</p>
							) : null}
						</div>
					</div>
					<div className="flex shrink-0 gap-2">
						<Button variant="outline" size="sm" onClick={reviewInventory}>
							Review inventory
						</Button>
						{auth.can?.editProduction ? (
							<Button
								variant="ghost"
								size="sm"
								onClick={() => setRevokeOpen(true)}
							>
								Revoke
							</Button>
						) : null}
					</div>
				</div>
				<AlertDialog open={revokeOpen} onOpenChange={setRevokeOpen}>
					<AlertDialog.Content>
						<AlertDialog.Header>
							<AlertDialog.Title>
								Revoke production readiness confirmation?
							</AlertDialog.Title>
							<AlertDialog.Description>
								New production assignments will be blocked until inventory is
								recorded as ready or an administrator confirms it again.
							</AlertDialog.Description>
						</AlertDialog.Header>
						<AlertDialog.Footer>
							<AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
							<AlertDialog.Action
								disabled={mutation.isPending}
								onClick={() => mutate("revoke")}
							>
								Revoke confirmation
							</AlertDialog.Action>
						</AlertDialog.Footer>
					</AlertDialog.Content>
				</AlertDialog>
			</section>
		);
	}

	const copy = bannerCopy[readiness.state];
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
					{readiness.canOverride && auth.can?.editProduction ? (
						<Button size="sm" onClick={() => setConfirmOpen(true)}>
							Confirm materials available
						</Button>
					) : null}
				</div>
			</div>
			<AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
				<AlertDialog.Content>
					<AlertDialog.Header>
						<AlertDialog.Title>
							Confirm all required materials are available?
						</AlertDialog.Title>
						<AlertDialog.Description>
							Confirm only after physically verifying the materials needed for
							this order. Production assignments will be allowed for the current
							inventory snapshot, but inbound receipts and stock allocations
							will not be changed. Review the Inventory tab for reconciliation.
						</AlertDialog.Description>
					</AlertDialog.Header>
					<AlertDialog.Footer>
						<AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
						<AlertDialog.Action
							disabled={mutation.isPending}
							onClick={() => mutate("confirm")}
						>
							Confirm materials & allow assignment
						</AlertDialog.Action>
					</AlertDialog.Footer>
				</AlertDialog.Content>
			</AlertDialog>
		</section>
	);
}
