"use client";

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
	ExternalLink,
	LocateFixed,
	Map as MapIcon,
	MapPin,
	Route,
} from "lucide-react";
import { useMemo, useState } from "react";

export type DriverMapStop = {
	id: number;
	label: string;
	address: string;
};

export function buildGoogleDirectionsUrl(input: {
	origin?: string;
	destinations: readonly DriverMapStop[];
}) {
	const destinations = input.destinations.filter((stop) => stop.address);
	const destination = destinations.at(-1)?.address;
	if (!destination) return "";
	const params = new URLSearchParams({
		api: "1",
		destination,
		travelmode: "driving",
	});
	if (input.origin) params.set("origin", input.origin);
	const waypoints = destinations.slice(0, -1).map((stop) => stop.address);
	if (waypoints.length) params.set("waypoints", waypoints.join("|"));
	return `https://www.google.com/maps/dir/?${params.toString()}`;
}

function buildEmbedUrl(input: {
	origin?: string;
	destinations: readonly DriverMapStop[];
}) {
	const directionsUrl = buildGoogleDirectionsUrl(input);
	return directionsUrl ? `${directionsUrl}&output=embed` : "";
}

export function GoogleRouteMap({
	title = "Route map",
	description = "Review the route before opening Google Maps.",
	origin,
	destinations,
	compact = false,
}: {
	title?: string;
	description?: string;
	origin?: string;
	destinations: readonly DriverMapStop[];
	compact?: boolean;
}) {
	const [loaded, setLoaded] = useState(false);
	const [useCurrentLocation, setUseCurrentLocation] = useState(false);
	const routeInput = useMemo(
		() => ({
			origin: useCurrentLocation ? undefined : origin,
			destinations,
		}),
		[destinations, origin, useCurrentLocation],
	);
	const directionsUrl = buildGoogleDirectionsUrl(routeInput);
	const embedUrl = buildEmbedUrl(routeInput);

	return (
		<Card className="overflow-hidden rounded-xl shadow-sm">
			<CardHeader className="border-b">
				<div className="flex items-start justify-between gap-3">
					<div className="min-w-0">
						<CardTitle className="flex items-center gap-2 text-base">
							<MapIcon data-icon="inline-start" />
							{title}
						</CardTitle>
						<CardDescription className="mt-1">{description}</CardDescription>
					</div>
					<Badge variant="secondary">
						{destinations.length} {destinations.length === 1 ? "stop" : "stops"}
					</Badge>
				</div>
			</CardHeader>
			<CardContent className="p-0">
				{loaded && embedUrl ? (
					<iframe
						title={`${title} in Google Maps`}
						src={embedUrl}
						className={
							compact ? "h-60 w-full border-0" : "h-80 w-full border-0"
						}
						loading="lazy"
						referrerPolicy="no-referrer-when-downgrade"
						allowFullScreen
					/>
				) : (
					<div className="relative min-h-64 overflow-hidden bg-[radial-gradient(circle_at_20%_30%,hsl(var(--muted))_0_1px,transparent_1px)] bg-[size:18px_18px] p-5">
						<div className="absolute inset-0 bg-gradient-to-br from-emerald-950/[0.04] via-transparent to-emerald-500/[0.08]" />
						<div className="relative mx-auto flex max-w-md flex-col gap-3">
							{origin && !useCurrentLocation ? (
								<div className="flex items-start gap-3 rounded-lg border bg-background/95 p-3 shadow-sm">
									<span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-white">
										W
									</span>
									<div className="min-w-0">
										<p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
											Warehouse
										</p>
										<p className="truncate text-sm">{origin}</p>
									</div>
								</div>
							) : (
								<div className="flex items-center gap-3 rounded-lg border bg-background/95 p-3 shadow-sm">
									<LocateFixed className="size-5 text-emerald-700" />
									<p className="text-sm font-medium">
										Start from my current location
									</p>
								</div>
							)}
							<div className="ml-3 h-5 border-l-2 border-dashed border-emerald-700/40" />
							{destinations.slice(0, compact ? 2 : 4).map((stop, index) => (
								<div
									key={stop.id}
									className="flex items-start gap-3 rounded-lg border bg-background/95 p-3 shadow-sm"
								>
									<span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-emerald-700 text-xs font-semibold text-white">
										{index + 1}
									</span>
									<div className="min-w-0">
										<p className="truncate text-sm font-semibold">
											{stop.label}
										</p>
										<p className="truncate text-xs text-muted-foreground">
											{stop.address || "Address review required"}
										</p>
									</div>
								</div>
							))}
						</div>
					</div>
				)}
			</CardContent>
			<CardFooter className="flex flex-wrap justify-between gap-2 border-t p-3">
				{origin ? (
					<Button
						type="button"
						variant="ghost"
						onClick={() => {
							setUseCurrentLocation((current) => !current);
							setLoaded(false);
						}}
					>
						<LocateFixed data-icon="inline-start" />
						{useCurrentLocation ? "Use warehouse" : "Use my location"}
					</Button>
				) : (
					<Button type="button" variant="ghost" disabled>
						<LocateFixed data-icon="inline-start" />
						Current location
					</Button>
				)}
				<div className="flex gap-2">
					<Button
						type="button"
						variant="outline"
						disabled={!embedUrl}
						onClick={() => setLoaded(true)}
					>
						<MapPin data-icon="inline-start" />
						{loaded ? "Refresh map" : "Load map"}
					</Button>
					<Button
						type="button"
						disabled={!directionsUrl}
						onClick={() =>
							window.open(directionsUrl, "_blank", "noopener,noreferrer")
						}
					>
						<Route data-icon="inline-start" />
						Directions
						<ExternalLink data-icon="inline-end" />
					</Button>
				</div>
			</CardFooter>
		</Card>
	);
}
