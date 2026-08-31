"use client";

import { useOnlineStatus } from "@/hooks/use-online-status";
import { Button } from "@gnd/ui/button";
import { Map as MapIcon, RefreshCcw } from "lucide-react";
import { useEffect, useState } from "react";
import type { DriverStop } from "./model";
import {
	formatDriverSyncAge,
	getDriverFirstName,
	getDriverGreeting,
	getDriverStopAddress,
} from "./model";

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
	driverName,
	initialNow,
	lastSyncedAt,
	stops,
	isFetching,
	onRefresh,
}: {
	driverName?: string | null;
	initialNow: number;
	lastSyncedAt: number;
	stops: readonly DriverStop[];
	isFetching: boolean;
	onRefresh: () => void;
}) {
	const online = useOnlineStatus();
	const mapUrl = routeMapUrl(stops);
	const [now, setNow] = useState(initialNow);

	useEffect(() => {
		setNow(Date.now());
		const timer = window.setInterval(() => setNow(Date.now()), 30_000);
		return () => window.clearInterval(timer);
	}, []);

	const syncLabel = formatDriverSyncAge(lastSyncedAt, now);

	return (
		<header className="flex flex-col gap-4 border-b pb-4 sm:pb-5 lg:flex-row lg:items-end lg:justify-between">
			<div className="min-w-0">
				<h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
					{getDriverGreeting(now)}, {getDriverFirstName(driverName)}
				</h2>
				<p className="mt-1 max-w-2xl text-sm text-muted-foreground">
					Run today&apos;s route, clear blockers, and finish every stop with
					proof.
				</p>
			</div>
			<div className="flex flex-wrap items-center gap-2">
				<div
					className="flex h-9 items-center gap-2 px-1 text-sm text-muted-foreground"
					aria-live="polite"
				>
					<span
						className={`size-2 rounded-full ${online ? "bg-emerald-500" : "bg-destructive"}`}
					/>
					{isFetching
						? "Syncing…"
						: online
							? syncLabel
							: `Offline · ${syncLabel}`}
				</div>
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
