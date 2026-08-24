"use client";

import { useOnlineStatus } from "@/hooks/use-online-status";
import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import {
	CheckCircle2,
	CloudOff,
	Map as MapIcon,
	RefreshCcw,
} from "lucide-react";
import type { DriverStop } from "./model";
import { getDriverStopAddress } from "./model";

function routeMapUrl(stops: readonly DriverStop[]) {
	const addresses = stops
		.map(getDriverStopAddress)
		.filter(Boolean)
		.slice(0, 10);
	if (!addresses.length) return null;

	const destination = addresses.at(-1);
	const waypoints = addresses.slice(0, -1).join("|");
	const params = new URLSearchParams({
		api: "1",
		destination: destination || addresses[0] || "",
		travelmode: "driving",
	});
	if (waypoints) params.set("waypoints", waypoints);
	return `https://www.google.com/maps/dir/?${params.toString()}`;
}

export function DriverCommandHeader({
	stops,
	isFetching,
	onRefresh,
}: {
	stops: readonly DriverStop[];
	isFetching: boolean;
	onRefresh: () => void;
}) {
	const online = useOnlineStatus();
	const mapUrl = routeMapUrl(stops);

	return (
		<header className="flex flex-col gap-4 border-b pb-4 sm:pb-5 lg:flex-row lg:items-end lg:justify-between">
			<div className="min-w-0">
				<p className="text-xs font-medium uppercase tracking-[0.16em] text-primary">
					Driver command center
				</p>
				<h2 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
					Dispatch Tasks
				</h2>
				<p className="mt-1 max-w-2xl text-sm text-muted-foreground">
					Run today&apos;s route, clear blockers, and complete every stop with
					proof.
				</p>
			</div>
			<div className="flex flex-wrap items-center gap-2">
				<Badge
					variant={online ? "secondary" : "destructive"}
					className="h-9 gap-2 px-3"
				>
					{online ? (
						<CheckCircle2 className="size-3.5" />
					) : (
						<CloudOff className="size-3.5" />
					)}
					{online ? (isFetching ? "Syncing…" : "Manifest synced") : "Offline"}
				</Badge>
				<Button
					variant="outline"
					size="sm"
					className="h-9"
					onClick={onRefresh}
					disabled={isFetching || !online}
				>
					<RefreshCcw
						className={`mr-2 size-4 ${isFetching ? "animate-spin" : ""}`}
					/>
					Refresh
				</Button>
				<Button
					variant="outline"
					size="sm"
					className="h-9"
					disabled={!mapUrl}
					onClick={() =>
						mapUrl && window.open(mapUrl, "_blank", "noopener,noreferrer")
					}
				>
					<MapIcon className="mr-2 size-4" /> Route map
				</Button>
			</div>
		</header>
	);
}
