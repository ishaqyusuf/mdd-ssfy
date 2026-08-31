"use client";

import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@gnd/ui/card";
import { CheckCircle2, MapPin, Navigation, Phone, Truck } from "lucide-react";
import { GoogleRouteMap } from "./google-route-map";
import type { DriverStop } from "./model";
import {
	getDriverStopAddress,
	getDriverStopCustomer,
	getDriverStopPhone,
} from "./model";

function routeAddress(stop: DriverStop) {
	return (
		(stop.deliveryMode === "pickup" ? stop.routeOrigin : "") ||
		stop.routeDestination?.route.formattedAddress ||
		getDriverStopAddress(stop)
	);
}

export function DriverActiveTrip({
	stops,
	onOpenStop,
}: { stops: readonly DriverStop[]; onOpenStop: (stop: DriverStop) => void }) {
	const active =
		stops.find((stop) => stop.status === "in progress") || stops[0];
	if (!active) return null;
	const phone = getDriverStopPhone(active);
	const destinations = stops.map((stop) => ({
		id: stop.id,
		label: getDriverStopCustomer(stop),
		address: routeAddress(stop),
	}));

	return (
		<div className="grid gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(320px,.72fr)]">
			<div className="grid gap-4">
				<Card className="border-emerald-600/30 bg-emerald-950 text-white shadow-sm">
					<CardHeader>
						<div className="flex flex-wrap items-start justify-between gap-3">
							<div>
								<CardDescription className="text-emerald-200">
									Active trip
								</CardDescription>
								<CardTitle className="mt-1 text-2xl">
									{active.deliveryMode === "pickup"
										? "Heading to pickup"
										: `Heading to ${getDriverStopCustomer(active)}`}
								</CardTitle>
							</div>
							<Badge className="bg-emerald-400 text-emerald-950 hover:bg-emerald-400">
								<Truck data-icon="inline-start" />
								En route
							</Badge>
						</div>
					</CardHeader>
					<CardContent className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
						<div>
							<p className="flex items-start gap-2 text-sm text-emerald-100">
								<MapPin className="mt-0.5 size-4 shrink-0" />
								{routeAddress(active)}
							</p>
							<p className="mt-2 text-xs text-emerald-300">
								Order {active.order.orderId}
							</p>
						</div>
						<div className="flex gap-2">
							<Button
								variant="secondary"
								disabled={!phone}
								onClick={() => window.open(`tel:${phone}`, "_blank")}
							>
								<Phone data-icon="inline-start" />
								Call
							</Button>
							<Button
								className="bg-emerald-400 text-emerald-950 hover:bg-emerald-300"
								onClick={() => onOpenStop(active)}
							>
								<CheckCircle2 data-icon="inline-start" />
								Complete stop
							</Button>
						</div>
					</CardContent>
				</Card>
				<GoogleRouteMap
					title="Active route"
					description="Current stop and remaining route."
					origin={active.routeOrigin}
					destinations={destinations}
				/>
			</div>
			<Card className="h-fit shadow-sm">
				<CardHeader>
					<CardTitle className="flex items-center gap-2 text-base">
						<Navigation data-icon="inline-start" />
						Trip timeline
					</CardTitle>
					<CardDescription>
						{stops.length} active {stops.length === 1 ? "stop" : "stops"}
					</CardDescription>
				</CardHeader>
				<CardContent className="grid gap-1">
					{stops.map((stop, index) => (
						<button
							key={stop.id}
							type="button"
							onClick={() => onOpenStop(stop)}
							className="grid grid-cols-[32px_minmax(0,1fr)_auto] items-center gap-3 rounded-lg p-2 text-left transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
						>
							<span className="flex size-8 items-center justify-center rounded-full bg-emerald-700 text-xs font-semibold text-white">
								{index + 1}
							</span>
							<span className="min-w-0">
								<strong className="block truncate text-sm">
									{getDriverStopCustomer(stop)}
								</strong>
								<small className="block truncate text-xs text-muted-foreground">
									{routeAddress(stop)}
								</small>
							</span>
							<Badge variant={stop.id === active.id ? "default" : "secondary"}>
								{stop.id === active.id ? "Now" : "Next"}
							</Badge>
						</button>
					))}
				</CardContent>
			</Card>
		</div>
	);
}
