"use client";

import { useDriverDispatchActions } from "@/hooks/use-driver-dispatch-actions";
import { useOnlineStatus } from "@/hooks/use-online-status";
import { Alert, AlertDescription, AlertTitle } from "@gnd/ui/alert";
import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@gnd/ui/card";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@gnd/ui/dialog";
import { Spinner } from "@gnd/ui/spinner";
import {
	AlertTriangle,
	ArrowRight,
	CheckCircle2,
	MapPin,
	Route,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import {
	type DestinationReviewStop,
	DriverDestinationReviewDialog,
} from "./driver-destination-review-dialog";
import type { DriverStop } from "./model";
import { getDriverStopAddress, getDriverStopCustomer } from "./model";

type StartResult = {
	startedCount: number;
	alreadyStartedCount: number;
	blockedCount: number;
	results: Array<{
		dispatchId: number;
		outcome: "started" | "already_started" | "blocked";
		reason?: string;
	}>;
};

export function DriverReadyPanel({
	readyStops,
	blockedCount,
	onOpenActiveTrip,
}: {
	readyStops: readonly DriverStop[];
	blockedCount: number;
	onOpenActiveTrip: () => void;
}) {
	const online = useOnlineStatus();
	const actions = useDriverDispatchActions();
	const [open, setOpen] = useState(false);
	const [result, setResult] = useState<StartResult | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [destinationOpen, setDestinationOpen] = useState(false);
	const isStarting = actions.startReadyRoute.isPending;
	const stopById = new Map(readyStops.map((stop) => [stop.id, stop]));
	const destinationReviewStops = readyStops
		.filter((stop) => stop.routeDestination?.requiresNormalization)
		.map(
			(stop): DestinationReviewStop => ({
				dispatchId: stop.id,
				orderNo: stop.order?.orderId || String(stop.id),
				customer: getDriverStopCustomer(stop),
				primaryAddress: getDriverStopAddress(stop),
			}),
		);

	const reviewOrConfirm = () => {
		setResult(null);
		setError(null);
		if (destinationReviewStops.length) {
			setDestinationOpen(true);
			return;
		}
		setOpen(true);
	};

	const startRoute = async () => {
		setResult(null);
		setError(null);
		try {
			const response = await actions.startReadyRoute.mutateAsync({
				dispatchIds: readyStops.map((stop) => stop.id),
				requestId: crypto.randomUUID(),
			});
			setResult(response as StartResult);
		} catch (cause) {
			setError(
				cause instanceof Error
					? cause.message
					: "The trip could not be started. Please try again.",
			);
		}
	};

	return (
		<>
			<DriverDestinationReviewDialog
				open={destinationOpen}
				stops={destinationReviewStops}
				onOpenChange={setDestinationOpen}
				onComplete={() => {
					setDestinationOpen(false);
					setOpen(true);
				}}
			/>
			<Card className="overflow-hidden rounded-xl border-emerald-600/30 bg-emerald-50/40 shadow-sm dark:bg-emerald-950/15">
				<CardHeader className="space-y-0 border-b border-emerald-600/20 p-4">
					<div className="flex items-start justify-between gap-3">
						<div>
							<CardTitle className="mb-0 flex items-center gap-2 text-base">
								<Route
									data-icon="inline-start"
									className="text-emerald-700 dark:text-emerald-300"
								/>
								Ready
							</CardTitle>
							<CardDescription className="mt-1 text-xs text-muted-foreground">
								Packed stops ready for departure checks.
							</CardDescription>
						</div>
						<Badge className="bg-emerald-700 text-white hover:bg-emerald-700">
							{readyStops.length}
						</Badge>
					</div>
				</CardHeader>

				<CardContent className="space-y-2 p-3">
					{readyStops.length ? (
						readyStops.slice(0, 4).map((stop, index) => (
							<Link
								key={stop.id}
								href={`/sales-book/dispatch-task/${stop.id}`}
								className="grid grid-cols-[28px_minmax(0,1fr)_auto] items-center gap-2 rounded-lg border bg-background p-2.5 transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
							>
								<span className="flex size-7 items-center justify-center rounded-full bg-emerald-700 text-xs font-semibold text-white">
									{index + 1}
								</span>
								<span className="min-w-0">
									<strong className="block truncate text-sm">
										{getDriverStopCustomer(stop)}
									</strong>
									<small className="mt-0.5 flex items-center gap-1 truncate text-xs text-muted-foreground">
										<MapPin data-icon="inline-start" />
										{getDriverStopAddress(stop) || "Pickup stop"}
									</small>
								</span>
								<ArrowRight
									data-icon="inline-end"
									className="text-muted-foreground"
								/>
							</Link>
						))
					) : (
						<p className="px-2 py-3 text-sm text-muted-foreground">
							Packed stops will appear here once every departure check passes.
						</p>
					)}
					{readyStops.length > 4 ? (
						<p className="px-2 text-xs text-muted-foreground">
							+{readyStops.length - 4} more ready stops
						</p>
					) : null}
				</CardContent>

				<CardFooter className="block space-y-2 border-emerald-600/20 p-3">
					<Button
						type="button"
						className="min-h-12 w-full bg-emerald-700 text-white hover:bg-emerald-800"
						disabled={!online || readyStops.length === 0}
						onClick={reviewOrConfirm}
					>
						<Route data-icon="inline-start" />
						Start trip · {readyStops.length}{" "}
						{readyStops.length === 1 ? "stop" : "stops"}
					</Button>
					<p className="text-center text-xs text-muted-foreground">
						{!online
							? "Reconnect to start a trip."
							: blockedCount > 0
								? `${blockedCount} packed ${blockedCount === 1 ? "stop needs" : "stops need"} review and will not be started.`
								: "Only the ready stops shown above will start."}
					</p>
				</CardFooter>
			</Card>

			<Dialog open={open} onOpenChange={(next) => !isStarting && setOpen(next)}>
				<DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-xl">
					<DialogHeader>
						<DialogTitle>Start this route?</DialogTitle>
						<DialogDescription>
							This starts {readyStops.length} ready{" "}
							{readyStops.length === 1 ? "stop" : "stops"}. Each stop is checked
							again before its status changes.
						</DialogDescription>
					</DialogHeader>

					<div className="max-h-64 space-y-2 overflow-y-auto rounded-lg border p-2">
						{readyStops.map((stop, index) => (
							<div
								key={stop.id}
								className="flex items-center gap-3 rounded-md p-2"
							>
								<span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold">
									{index + 1}
								</span>
								<span className="min-w-0 flex-1">
									<strong className="block truncate text-sm">
										{getDriverStopCustomer(stop)}
									</strong>
									<small className="text-xs text-muted-foreground">
										Order {stop.order?.orderId || stop.id}
									</small>
								</span>
								<Badge variant="outline">Ready</Badge>
							</div>
						))}
					</div>

					{blockedCount > 0 ? (
						<Alert variant="warning">
							<AlertTriangle />
							<AlertTitle>Some packed stops are excluded</AlertTitle>
							<AlertDescription>
								{blockedCount} {blockedCount === 1 ? "stop has" : "stops have"}{" "}
								an unresolved departure check.
							</AlertDescription>
						</Alert>
					) : null}

					{result ? (
						<Alert variant={result.blockedCount ? "warning" : "default"}>
							<CheckCircle2 />
							<AlertTitle>
								{result.startedCount} started
								{result.alreadyStartedCount
									? ` · ${result.alreadyStartedCount} already active`
									: ""}
							</AlertTitle>
							<AlertDescription>
								{result.blockedCount
									? result.results
											.filter((item) => item.outcome === "blocked")
											.map(
												(item) =>
													`${stopById.get(item.dispatchId)?.order?.orderId || item.dispatchId}: ${item.reason || "Needs review"}`,
											)
											.join(" · ")
									: "The route is now in progress."}
							</AlertDescription>
						</Alert>
					) : null}

					{error ? (
						<Alert variant="destructive">
							<AlertTriangle />
							<AlertTitle>Trip not started</AlertTitle>
							<AlertDescription>{error}</AlertDescription>
						</Alert>
					) : null}

					<DialogFooter>
						<Button
							type="button"
							variant="outline"
							disabled={isStarting}
							onClick={() => {
								setOpen(false);
								if (result) onOpenActiveTrip();
							}}
						>
							{result ? "Open active trip" : "Not yet"}
						</Button>
						{!result ? (
							<Button
								type="button"
								disabled={isStarting || !online || readyStops.length === 0}
								onClick={() => void startRoute()}
							>
								{isStarting ? <Spinner /> : <Route data-icon="inline-start" />}
								{isStarting
									? "Starting route…"
									: `Start ${readyStops.length} ${readyStops.length === 1 ? "stop" : "stops"}`}
							</Button>
						) : null}
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</>
	);
}
