"use client";

import { useDriverDashboardParams } from "@/hooks/use-driver-dashboard-params";
import { useTRPC } from "@/trpc/client";
import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import { Separator } from "@gnd/ui/separator";
import {
	useSuspenseInfiniteQuery,
	useSuspenseQuery,
} from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2, PackageOpen } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { DriverActiveTrip } from "./active-trip";
import { DriverDashboardEmptyState } from "./empty-states";
import { GoogleRouteMap } from "./google-route-map";
import { DriverCommandHeader } from "./header";
import {
	type DriverStop,
	buildDriverStopSections,
	getDriverFirstName,
	getDriverManifestInput,
	getDriverNextCursor,
	getDriverRouteListTitle,
	getDriverStopCustomer,
	isDriverStopBlocked,
	isDriverStopReady,
} from "./model";
import { DriverReadyPanel } from "./ready-panel";
import { DriverRouteListTabs } from "./route-list-tabs";
import { DriverStopCard } from "./stop-card";
import { DriverDashboardSummary } from "./summary";

function DriverAttention({ stops }: { stops: readonly DriverStop[] }) {
	const attention = stops.filter(
		(stop) => isDriverStopBlocked(stop) || stop.dueBucket === "overdue",
	);
	return (
		<article className="rounded-xl border bg-card p-4 shadow-sm">
			<div className="flex items-start justify-between gap-3 border-b pb-3">
				<div>
					<h2 className="font-semibold">Needs attention</h2>
					<p className="mt-1 text-xs text-muted-foreground">
						Only blockers that can stop your route.
					</p>
				</div>
				<Badge variant={attention.length ? "destructive" : "secondary"}>
					{attention.length}
				</Badge>
			</div>
			<div className="mt-3 space-y-2">
				{attention.length ? (
					attention.slice(0, 4).map((stop) => (
						<Link
							key={stop.id}
							href={`/sales-book/dispatch-task/${stop.id}`}
							className="flex w-full gap-3 rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-left transition-colors hover:bg-destructive/10"
						>
							<AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive" />
							<span className="min-w-0">
								<strong className="block truncate text-sm">
									{getDriverStopCustomer(stop)} ·{" "}
									{stop.order?.orderId || stop.id}
								</strong>
								<span className="mt-1 block text-xs text-muted-foreground">
									{stop.workspace?.risks?.join(" · ").replaceAll("_", " ") ||
										stop.dueStatusLabel}
								</span>
							</span>
						</Link>
					))
				) : (
					<div className="flex items-center gap-3 py-3 text-sm text-muted-foreground">
						<CheckCircle2 className="size-4 text-emerald-600" /> No active
						blockers
					</div>
				)}
			</div>
		</article>
	);
}

function DriverActivity({
	stops,
	driverName,
	readyCount,
	totalStops,
}: {
	stops: readonly DriverStop[];
	driverName?: string | null;
	readyCount: number;
	totalStops: number;
}) {
	const completed = stops.filter((stop) => stop.status === "completed").length;
	const active = stops.find((stop) => stop.status === "in progress");
	const events: Array<{ label: string; note: string; meta: string }> = [
		{
			label: "Manifest synchronized",
			note: `${stops.length} stops on this view`,
			meta: "Latest",
		},
	];
	if (active) {
		events.push({
			label: "Trip in progress",
			note: `${getDriverStopCustomer(active)} · ${active.order?.orderId || active.id}`,
			meta: "Live",
		});
	}
	if (completed > 0) {
		events.push({
			label: `${completed} ${completed === 1 ? "stop" : "stops"} completed`,
			note: "Signature and delivery proof recorded",
			meta: "Done",
		});
	}
	if (readyCount > 0) {
		events.push({
			label: "Vehicle load ready",
			note: `${readyCount} ${readyCount === 1 ? "stop is" : "stops are"} cleared for departure`,
			meta: "Ready",
		});
	}
	events.push({
		label: "Route assigned",
		note: `${totalStops} stops · ${getDriverFirstName(driverName)}`,
		meta: "Current",
	});
	const visibleEvents = events.slice(0, 3);

	return (
		<article className="rounded-xl border bg-card shadow-sm">
			<header className="border-b px-4 py-4">
				<h2 className="font-semibold">Route activity</h2>
				<p className="mt-1 text-xs text-muted-foreground">
					Recent driver and warehouse events.
				</p>
			</header>
			<ol className="px-4 py-2">
				{visibleEvents.map((event, index) => (
					<li
						key={event.label}
						className="grid grid-cols-[14px_minmax(0,1fr)_auto] gap-2.5 py-3"
					>
						<span className="relative flex justify-center" aria-hidden="true">
							<span className="mt-1 size-3 rounded-full border-[3px] border-primary/20 bg-primary" />
							{index < visibleEvents.length - 1 ? (
								<Separator
									orientation="vertical"
									className="absolute top-5 h-[calc(100%+0.5rem)]"
								/>
							) : null}
						</span>
						<div className="min-w-0">
							<p className="text-sm font-medium">{event.label}</p>
							<p className="mt-1 text-xs text-muted-foreground">{event.note}</p>
						</div>
						<span className="text-xs text-muted-foreground">{event.meta}</span>
					</li>
				))}
			</ol>
		</article>
	);
}

export function DriverDashboardWorkspace({
	driverName,
	initialNow,
}: {
	driverName?: string | null;
	initialNow: number;
}) {
	const trpc = useTRPC();
	const { params, setParams } = useDriverDashboardParams();
	const router = useRouter();
	const input = getDriverManifestInput({
		view: params.view,
		search: params.q,
	});
	const query = useSuspenseInfiniteQuery(
		trpc.dispatch.driverManifest.infiniteQueryOptions(input, {
			getNextPageParam: getDriverNextCursor,
		}),
	);
	const summaryQuery = useSuspenseQuery(
		trpc.dispatch.driverWorkQueueSummary.queryOptions(
			getDriverManifestInput({ view: "all", search: params.q }),
		),
	);
	const todaySummaryQuery = useSuspenseQuery(
		trpc.dispatch.driverWorkQueueSummary.queryOptions(
			getDriverManifestInput({ view: "today", search: params.q }),
		),
	);
	const readyQuery = useSuspenseQuery(
		trpc.dispatch.driverWorkQueue.queryOptions(
			getDriverManifestInput({ view: "packed", search: params.q }),
		),
	);
	const unfilteredStops = useMemo<DriverStop[]>(
		() => query.data.pages.flatMap((page) => page.queue.data) as DriverStop[],
		[query.data.pages],
	);
	const stops = useMemo(
		() =>
			params.view === "attention"
				? unfilteredStops.filter((stop) => stop.routeCapability?.needsAttention)
				: unfilteredStops,
		[params.view, unfilteredStops],
	);
	const packedStops = readyQuery.data.data as DriverStop[];
	const readyStops = packedStops.filter(isDriverStopReady);
	const packedBlockedCount = packedStops.length - readyStops.length;
	const summary = summaryQuery.data;
	const routeTabCounts = {
		today: todaySummaryQuery.data.total,
		all: summary.total,
		completed: summary.byStatus.completed || 0,
	};
	const routeListTitle = getDriverRouteListTitle(params.view);
	const projectedNextStop = query.data.pages[0]?.nextStop as
		| DriverStop
		| null
		| undefined;
	const nextStop = stops.some((stop) => stop.id === projectedNextStop?.id)
		? projectedNextStop
		: null;
	const sections = useMemo(() => buildDriverStopSections(stops), [stops]);
	const mapStops = useMemo(
		() =>
			stops.map((stop) => ({
				id: stop.id,
				label: getDriverStopCustomer(stop),
				address:
					(stop.deliveryMode === "pickup" ? stop.routeOrigin : "") ||
					stop.routeDestination?.route.formattedAddress ||
					String(stop.routeDestination?.route.address1 || "") ||
					String(stop.order?.shippingAddress?.address1 || ""),
			})),
		[stops],
	);

	const openStop = (
		stop: DriverStop,
		mode: "details" | "proof" | "help" = "details",
	) => {
		const query = mode === "details" ? "" : `?mode=${mode}`;
		router.push(`/sales-book/dispatch-task/${stop.id}${query}`);
	};

	const primaryStopAction = (stop: DriverStop) => {
		if (stop.status === "in progress") {
			openStop(stop, "proof");
			return;
		}
		openStop(stop);
	};

	return (
		<div className="min-w-0 space-y-4 pb-20 sm:space-y-5 sm:pb-8">
			<DriverCommandHeader
				driverName={driverName}
				initialNow={initialNow}
				lastSyncedAt={query.dataUpdatedAt}
				stops={stops}
				isFetching={query.isFetching}
				onRefresh={() => void query.refetch()}
			/>
			<DriverDashboardSummary
				summary={summary}
				view={params.view}
				onSelect={(view) => void setParams({ view, q: null })}
			/>

			{stops.length === 0 ? (
				<section className="flex flex-col gap-3">
					<div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
						<h2 className="font-semibold">{routeListTitle}</h2>
						<DriverRouteListTabs counts={routeTabCounts} view={params.view} />
					</div>
					<DriverDashboardEmptyState
						filtered={Boolean(params.q || params.view !== "today")}
						onClear={() => setParams({ q: null, view: "today" })}
					/>
				</section>
			) : params.view === "in_progress" ? (
				<DriverActiveTrip
					stops={stops}
					onOpenStop={(stop) => openStop(stop, "proof")}
				/>
			) : (
				<div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1.55fr)_minmax(300px,.72fr)]">
					<div className="min-w-0 space-y-4">
						{params.view !== "exceptions" && mapStops.length ? (
							<GoogleRouteMap
								title="Today&apos;s route"
								description="Warehouse departure and sequenced delivery stops."
								origin={stops[0]?.routeOrigin}
								destinations={mapStops}
							/>
						) : null}
						{nextStop && params.view !== "exceptions" ? (
							<DriverStopCard
								stop={nextStop}
								href={`/sales-book/dispatch-task/${nextStop.id}`}
								featured
								sequence={Math.max(
									1,
									stops.findIndex((stop) => stop.id === nextStop.id) + 1,
								)}
								onPrimary={() => primaryStopAction(nextStop)}
							/>
						) : null}

						<section className="flex flex-col gap-3">
							<div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
								<h2 className="font-semibold">{routeListTitle}</h2>
								<DriverRouteListTabs
									counts={routeTabCounts}
									view={params.view}
								/>
							</div>

							<div className="overflow-hidden rounded-xl border bg-card shadow-sm">
								{sections.length ? (
									sections.map((section) => (
										<div key={section.title}>
											<div className="border-b bg-muted/35 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
												{section.title}
											</div>
											{section.stops.map((stop) => (
												<DriverStopCard
													key={stop.id}
													stop={stop}
													href={`/sales-book/dispatch-task/${stop.id}`}
													sequence={
														stops.findIndex((item) => item.id === stop.id) + 1
													}
													onPrimary={() => primaryStopAction(stop)}
												/>
											))}
										</div>
									))
								) : (
									<div className="flex min-h-32 items-center justify-center gap-2 p-5 text-sm text-muted-foreground">
										<PackageOpen className="size-4" /> No route groups available
									</div>
								)}
							</div>
							{query.hasNextPage ? (
								<Button
									variant="outline"
									className="w-full"
									disabled={query.isFetchingNextPage}
									onClick={() => void query.fetchNextPage()}
								>
									{query.isFetchingNextPage
										? "Loading more…"
										: "Load more stops"}
								</Button>
							) : null}
						</section>
					</div>

					<aside className="grid gap-4 md:grid-cols-2 xl:sticky xl:top-4 xl:grid-cols-1">
						<DriverReadyPanel
							readyStops={readyStops}
							blockedCount={packedBlockedCount}
							onOpenActiveTrip={() =>
								void setParams({ view: "in_progress", q: null })
							}
						/>
						<DriverAttention stops={stops} />
						<DriverActivity
							stops={stops}
							driverName={driverName}
							readyCount={readyStops.length}
							totalStops={summary.total}
						/>
					</aside>
				</div>
			)}
		</div>
	);
}
