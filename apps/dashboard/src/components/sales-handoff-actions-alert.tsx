"use client";

import { useSalesOverviewQuery } from "@/hooks/use-sales-overview-query";
import { useTRPC } from "@/trpc/client";
import type { RouterOutputs } from "@api/trpc/routers/_app";
import { Alert, AlertDescription, AlertTitle } from "@gnd/ui/alert";
import { Button } from "@gnd/ui/button";
import { cn } from "@gnd/ui/cn";
import { Icons } from "@gnd/ui/icons";
import { Skeleton } from "@gnd/ui/skeleton";
import { useQuery } from "@gnd/ui/tanstack";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@gnd/ui/tooltip";
import { useEffect, useRef, useState } from "react";
import {
	SALES_HANDOFF_ACTION_BATCH_SIZE,
	type SalesHandoffFocusState,
	advanceSalesHandoffFocusTracking,
	beginSalesHandoffFocusTracking,
	getSalesHandoffFocusRestoreTarget,
	groupSalesHandoffActionsByRepresentative,
	hiddenSalesHandoffActionCount,
	nextSalesHandoffVisibleCount,
	visibleSalesHandoffActions,
} from "./sales-handoff-actions-alert-model";

type SalesHandoffAction =
	RouterOutputs["sales"]["getSalesHandoffActions"]["actions"][number];

type SalesHandoffActionPillsProps = {
	actions: SalesHandoffAction[];
	onOpen: (action: SalesHandoffAction) => void;
	registerTrigger?: (
		actionId: string,
		element: HTMLButtonElement | null,
	) => void;
	identifyRepresentative?: boolean;
};

export function SalesHandoffActionPills({
	actions,
	onOpen,
	registerTrigger,
	identifyRepresentative = false,
}: SalesHandoffActionPillsProps) {
	const pills = (
		<ul className="flex flex-wrap gap-2">
			{actions.map((action) => {
				const button = (
					<Button
						ref={(element) => registerTrigger?.(action.id, element)}
						type="button"
						variant="outline"
						size="sm"
						className={cn(
							"h-8 max-w-full rounded-full bg-background px-3 text-foreground shadow-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
							action.type === "PRODUCTION"
								? "border-sky-300 bg-sky-50/60"
								: "border-amber-300 bg-amber-50/60",
						)}
						aria-label={`Open order #${action.orderId} ${action.type === "PRODUCTION" ? "Production" : "Material"} action${identifyRepresentative ? ` for ${action.responsibleRepName}` : ""}`}
						onClick={() => onOpen(action)}
					>
						<span className="truncate">
							#{action.orderId} —{" "}
							{action.type === "PRODUCTION" ? "Production" : "Material"}
						</span>
					</Button>
				);
				return (
					<li key={action.id}>
						{identifyRepresentative ? (
							<Tooltip>
								<TooltipTrigger asChild>{button}</TooltipTrigger>
								<TooltipContent>
									Responsible representative: {action.responsibleRepName}
								</TooltipContent>
							</Tooltip>
						) : (
							button
						)}
					</li>
				);
			})}
		</ul>
	);
	return identifyRepresentative ? (
		<TooltipProvider>{pills}</TooltipProvider>
	) : (
		pills
	);
}

export function SalesHandoffActionsAlertSkeleton() {
	return (
		<div
			className="rounded-lg border border-border/70 px-4 py-3"
			aria-hidden="true"
		>
			<Skeleton className="h-4 w-44" />
			<Skeleton className="mt-3 h-7 w-full max-w-lg" />
		</div>
	);
}

export function SalesHandoffActionsAlert() {
	const trpc = useTRPC();
	const overview = useSalesOverviewQuery();
	const [visibleCount, setVisibleCount] = useState(
		SALES_HANDOFF_ACTION_BATCH_SIZE,
	);
	const triggerRefs = useRef(new Map<string, HTMLButtonElement>());
	const focusFallbackRef = useRef<HTMLSpanElement>(null);
	const focusState = useRef<SalesHandoffFocusState>(null);
	const openOrderId = overview.params["sales-overview-id"];
	const actionsQuery = useQuery(
		trpc.sales.getSalesHandoffActions.queryOptions(
			{ limit: 50 },
			{
				staleTime: 15_000,
				refetchOnWindowFocus: true,
			},
		),
	);

	useEffect(() => {
		const transition = advanceSalesHandoffFocusTracking(
			focusState.current,
			openOrderId,
		);
		focusState.current = transition.state;
		if (transition.restoreActionId) {
			const origin = triggerRefs.current.get(transition.restoreActionId);
			const target =
				getSalesHandoffFocusRestoreTarget(Boolean(origin)) === "origin"
					? origin
					: focusFallbackRef.current;
			window.requestAnimationFrame(() => target?.focus());
		}
	}, [openOrderId]);

	const focusFallback = (
		<span
			key="sales-handoff-focus-fallback"
			ref={focusFallbackRef}
			tabIndex={-1}
			className="sr-only"
		>
			Paid sales actions updated
		</span>
	);

	if (actionsQuery.isPending)
		return (
			<>
				{focusFallback}
				<SalesHandoffActionsAlertSkeleton />
			</>
		);
	if (actionsQuery.isError) {
		return (
			<>
				{focusFallback}
				<Alert variant="destructive">
					<Icons.Info />
					<AlertTitle>Unable to load paid sales actions</AlertTitle>
					<AlertDescription className="mt-2 flex flex-wrap items-center gap-3">
						<span>The current handoff queue could not be loaded.</span>
						<Button
							type="button"
							size="sm"
							variant="outline"
							onClick={() => void actionsQuery.refetch()}
						>
							Retry
						</Button>
					</AlertDescription>
				</Alert>
			</>
		);
	}

	const actions = actionsQuery.data?.actions ?? [];
	if (!actions.length) return focusFallback;
	const visibleActions = visibleSalesHandoffActions(actions, visibleCount);
	const hiddenCount = hiddenSalesHandoffActionCount(actions, visibleCount);
	const isSuperAdmin = actionsQuery.data.scope === "SUPER_ADMIN";
	const groups = isSuperAdmin
		? groupSalesHandoffActionsByRepresentative(visibleActions)
		: [];

	const openAction = (action: SalesHandoffAction) => {
		focusState.current = beginSalesHandoffFocusTracking({
			actionId: action.id,
			orderId: action.orderId,
		});
		if (action.type === "PRODUCTION") {
			overview.openProduction(action.orderId, action.targetControlUid);
		} else {
			overview.openMaterial(action.orderId);
		}
	};

	return (
		<>
			{focusFallback}
			<Alert aria-live="polite" className="border-amber-200 bg-amber-50/50">
				<Icons.Info />
				<AlertTitle>Paid sales need action</AlertTitle>
				<AlertDescription className="mt-3 space-y-3">
					{isSuperAdmin ? (
						<div className="space-y-3">
							{groups.map((group) => (
								<section
									key={group.representativeId}
									aria-labelledby={`handoff-rep-${group.representativeId}`}
								>
									<p
										id={`handoff-rep-${group.representativeId}`}
										className="mb-1.5 text-xs font-medium text-muted-foreground"
									>
										{group.representativeName}
									</p>
									<SalesHandoffActionPills
										actions={group.actions}
										onOpen={openAction}
										identifyRepresentative
										registerTrigger={(actionId, element) => {
											if (element) triggerRefs.current.set(actionId, element);
											else triggerRefs.current.delete(actionId);
										}}
									/>
								</section>
							))}
						</div>
					) : (
						<SalesHandoffActionPills
							actions={visibleActions}
							onOpen={openAction}
							registerTrigger={(actionId, element) => {
								if (element) triggerRefs.current.set(actionId, element);
								else triggerRefs.current.delete(actionId);
							}}
						/>
					)}
					{hiddenCount > 0 ? (
						<Button
							type="button"
							variant="ghost"
							size="sm"
							className="h-8 px-2"
							onClick={() =>
								setVisibleCount((current) =>
									nextSalesHandoffVisibleCount(current, actions.length),
								)
							}
						>
							+{hiddenCount} more
						</Button>
					) : null}
					{actionsQuery.data.truncated ? (
						<p className="text-xs text-muted-foreground">
							Showing the first {actions.length} of {actionsQuery.data.total}{" "}
							actions.
						</p>
					) : null}
				</AlertDescription>
			</Alert>
		</>
	);
}
