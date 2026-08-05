"use client";

import { SalesFinanceMigrationDialog } from "@/components/onboarding/sales-finance-migration-dialog";
import { useAuth } from "@/hooks/use-auth";
import { useTRPC } from "@/trpc/client";
import type { RouterInputs } from "@api/trpc/routers/_app";
import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import { Icons } from "@gnd/ui/icons";
import { Popover, PopoverContent, PopoverTrigger } from "@gnd/ui/popover";
import { useMutation, useQuery } from "@gnd/ui/tanstack";
import { CheckCircle2, CircleDashed } from "lucide-react";
import { useEffect, useState } from "react";

type AdoptionPingInput = Extract<
	RouterInputs["salesFinance"]["adoptionPing"],
	{ surface: unknown }
>;
type AdoptionSurface = AdoptionPingInput["surface"];

const recordedSurfaces = new Set<AdoptionSurface>();

function formatDate(value: string | Date | null | undefined) {
	if (!value) return "No activity yet";
	const date = new Date(value);
	return Number.isNaN(date.getTime())
		? "No activity yet"
		: date.toLocaleString("en-US", {
				month: "short",
				day: "numeric",
				hour: "numeric",
				minute: "2-digit",
			});
}

export function SalesFinanceAdoptionTracker({
	surface,
}: {
	surface: AdoptionSurface;
}) {
	const auth = useAuth();
	const trpc = useTRPC();
	const [showMigrationDialog, setShowMigrationDialog] = useState(false);
	const canUseLegacyAccounting = Boolean(
		auth.can?.viewOrderPayment ||
			auth.can?.editOrderPayment ||
			auth.can?.editSales,
	);
	const ping = useMutation(
		trpc.salesFinance.adoptionPing.mutationOptions({
			retry: false,
		}),
	);

	useEffect(() => {
		if (recordedSurfaces.has(surface)) return;
		recordedSurfaces.add(surface);
		ping.mutate(
			{ surface },
			{
				onSuccess: (data) => {
					if (data.isFirstFinanceVisit && canUseLegacyAccounting) {
						setShowMigrationDialog(true);
					}
				},
			},
		);
	}, [canUseLegacyAccounting, ping.mutate, surface]);

	return (
		<SalesFinanceMigrationDialog
			open={showMigrationDialog}
			onOpenChange={setShowMigrationDialog}
		/>
	);
}

export function SalesFinanceAdoptionStatus() {
	const auth = useAuth();
	const trpc = useTRPC();
	const canInspect = Boolean(auth.can?.editOrderPayment);
	const query = useQuery(
		trpc.salesFinance.adoptionReadiness.queryOptions(undefined, {
			enabled: canInspect,
			staleTime: 5 * 60 * 1_000,
		}),
	);

	if (!canInspect) return null;

	return (
		<Popover>
			<PopoverTrigger asChild>
				<Button
					type="button"
					variant="outline"
					size="icon"
					aria-label="View Finance adoption status"
				>
					<Icons.Activity className="size-4" />
				</Button>
			</PopoverTrigger>
			<PopoverContent className="w-[340px] p-0" align="end" sideOffset={8}>
				<div className="border-b p-4">
					<div className="flex items-center justify-between gap-3">
						<div>
							<h3 className="font-semibold">Adoption readiness</h3>
							<p className="mt-1 text-xs text-muted-foreground">
								Rolling 30-day Finance and legacy usage.
							</p>
						</div>
						<Badge variant="outline">Legacy retained</Badge>
					</div>
				</div>
				{query.isPending ? (
					<div className="space-y-3 p-4">
						<div className="h-20 animate-pulse rounded-lg bg-muted" />
						<div className="h-32 animate-pulse rounded-lg bg-muted" />
					</div>
				) : query.error ? (
					<p className="p-4 text-sm text-destructive">{query.error.message}</p>
				) : query.data ? (
					<div className="space-y-4 p-4">
						<div className="grid grid-cols-2 gap-3">
							<ActivityTile
								label="Sales Finance"
								views={query.data.finance.views}
								users={query.data.finance.uniqueUsers}
								lastViewedAt={query.data.finance.lastViewedAt}
							/>
							<ActivityTile
								label="Legacy Accounting"
								views={query.data.legacy.views}
								users={query.data.legacy.uniqueUsers}
								lastViewedAt={query.data.legacy.lastViewedAt}
							/>
						</div>
						<div className="rounded-lg border">
							{query.data.gates.map((gate) => (
								<div
									key={gate.key}
									className="flex items-center gap-3 border-b px-3 py-2.5 last:border-b-0"
								>
									{gate.status === "ready" ? (
										<CheckCircle2 className="size-4 shrink-0 text-emerald-700" />
									) : (
										<CircleDashed className="size-4 shrink-0 text-amber-700" />
									)}
									<span className="text-sm">{gate.label}</span>
								</div>
							))}
						</div>
						<p className="text-xs leading-relaxed text-muted-foreground">
							{query.data.retirementReason}
						</p>
					</div>
				) : null}
			</PopoverContent>
		</Popover>
	);
}

function ActivityTile({
	label,
	views,
	users,
	lastViewedAt,
}: {
	label: string;
	views: number;
	users: number;
	lastViewedAt: string | Date | null;
}) {
	return (
		<div className="rounded-lg border bg-muted/20 p-3">
			<p className="text-xs font-medium text-muted-foreground">{label}</p>
			<p className="mt-2 font-mono text-lg font-semibold">{views}</p>
			<p className="text-[11px] text-muted-foreground">
				{users} {users === 1 ? "user" : "users"} · {formatDate(lastViewedAt)}
			</p>
		</div>
	);
}
