"use client";

import { useDriverDashboardParams } from "@/hooks/use-driver-dashboard-params";
import { useDriverDispatchActions } from "@/hooks/use-driver-dispatch-actions";
import { useTRPC } from "@/trpc/client";
import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import {
	useSuspenseInfiniteQuery,
	useSuspenseQuery,
} from "@tanstack/react-query";
import {
	AlertTriangle,
	CheckCircle2,
	History,
	PackageOpen,
	Route,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { toast } from "sonner";
import { DriverDashboardEmptyState } from "./empty-states";
import { DriverCommandHeader } from "./header";
import {
	type DriverStop,
	buildDriverStopSections,
	getDriverManifestInput,
	getDriverNextCursor,
	getDriverStopCustomer,
	isDriverStopBlocked,
} from "./model";
import { DriverDashboardSearchFilter } from "./search-filter";
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

function DriverActivity({ stops }: { stops: readonly DriverStop[] }) {
	const completed = stops.filter((stop) => stop.status === "completed").length;
	const active = stops.find((stop) => stop.status === "in progress");
	const events = [
		active && {
			label: `Trip in progress · ${getDriverStopCustomer(active)}`,
			note: active.dueStatusLabel || "Active stop",
			icon: Route,
		},
		completed > 0 && {
			label: `${completed} ${completed === 1 ? "stop" : "stops"} completed`,
			note: "Delivery proof is recorded",
			icon: CheckCircle2,
		},
		{
			label: "Manifest synchronized",
			note: `${stops.length} stops on this view`,
			icon: History,
		},
	].filter(Boolean) as Array<{
		label: string;
		note: string;
		icon: typeof Route;
	}>;

	return (
		<article className="rounded-xl border bg-card shadow-sm">
			<header className="border-b px-4 py-4">
				<h2 className="font-semibold">Route activity</h2>
				<p className="mt-1 text-xs text-muted-foreground">
					Current assignment and device events.
				</p>
			</header>
			<div className="px-4 py-2">
				{events.map((event) => {
					const Icon = event.icon;
					return (
						<div
							key={event.label}
							className="flex gap-3 border-b py-3 last:border-b-0"
						>
							<span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted">
								<Icon className="size-3.5 text-muted-foreground" />
							</span>
							<div>
								<p className="text-sm font-medium">{event.label}</p>
								<p className="mt-1 text-xs text-muted-foreground">
									{event.note}
								</p>
							</div>
						</div>
					);
				})}
			</div>
		</article>
	);
}

export function DriverDashboardWorkspace() {
	const trpc = useTRPC();
	const { params, setParams } = useDriverDashboardParams();
	const router = useRouter();
	const actions = useDriverDispatchActions();
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
		trpc.dispatch.driverWorkQueueSummary.queryOptions(input),
	);
	const stops = useMemo<DriverStop[]>(
		() => query.data.pages.flatMap((page) => page.queue.data) as DriverStop[],
		[query.data.pages],
	);
	const summary = summaryQuery.data;
	const nextStop = query.data.pages[0]?.nextStop as
		| DriverStop
		| null
		| undefined;
	const sections = useMemo(() => buildDriverStopSections(stops), [stops]);

	const openStop = (
		stop: DriverStop,
		mode: "details" | "proof" | "help" = "details",
	) => {
		const query = mode === "details" ? "" : `?mode=${mode}`;
		router.push(`/sales-book/dispatch-task/${stop.id}${query}`);
	};

	const primaryStopAction = async (stop: DriverStop) => {
		if (stop.status === "in progress") {
			openStop(stop, "proof");
			return;
		}
		if (stop.status !== "packed") {
			openStop(stop);
			return;
		}
		try {
			await actions.onStartTrip({
				dispatchId: stop.id,
				salesId: stop.order.id,
			});
			toast.success("Trip started.");
			openStop(stop);
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : "Unable to start this trip.",
			);
		}
	};

	return (
		<div className="min-w-0 space-y-4 pb-20 sm:space-y-5 sm:pb-8">
			<DriverCommandHeader
				stops={stops}
				isFetching={query.isFetching}
				onRefresh={() => void query.refetch()}
			/>
			<DriverDashboardSearchFilter />
			<DriverDashboardSummary summary={summary} />

			{stops.length === 0 ? (
				<DriverDashboardEmptyState
					filtered={Boolean(params.q || params.view !== "today")}
					onClear={() => setParams({ q: null, view: "today" })}
				/>
			) : (
				<div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1.55fr)_minmax(300px,.72fr)]">
					<div className="min-w-0 space-y-4">
						{nextStop && params.view !== "exceptions" ? (
							<DriverStopCard
								stop={nextStop}
								href={`/sales-book/dispatch-task/${nextStop.id}`}
								featured
								sequence={Math.max(
									1,
									stops.findIndex((stop) => stop.id === nextStop.id) + 1,
								)}
								onPrimary={() => void primaryStopAction(nextStop)}
							/>
						) : null}

						<section className="space-y-3">
							<div>
								<h2 className="font-semibold">Your route</h2>
								<p className="mt-1 text-xs text-muted-foreground">
									Sequenced by delivery window and readiness.
								</p>
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
													onPrimary={() => void primaryStopAction(stop)}
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
						<DriverAttention stops={stops} />
						<DriverActivity stops={stops} />
					</aside>
				</div>
			)}
		</div>
	);
}
