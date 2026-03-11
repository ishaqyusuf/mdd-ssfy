"use client";

import { _trpc } from "@/components/static-trpc";
import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import { useQuery } from "@gnd/ui/tanstack";
import Link from "next/link";

export function TaskEventsDashboard() {
	const { data, isPending } = useQuery(_trpc.taskEvents.list.queryOptions());

	if (isPending) {
		return <div className="text-sm text-muted-foreground">Loading...</div>;
	}

	const events = data?.events || [];

	return (
		<div className="grid gap-4">
			{events.map((event) => {
				const latest = event.latestHistory;
				const latestMeta = parseHistoryMeta(latest?.meta);
				return (
					<div
						key={event.eventName}
						className="rounded-lg border bg-card p-4 flex flex-col gap-3"
					>
						<div className="flex items-center justify-between gap-2">
							<div className="flex flex-col gap-1">
								<h3 className="text-base font-semibold">{event.title}</h3>
								<p className="text-sm text-muted-foreground">
									{event.description}
								</p>
							</div>
							<Badge
								variant={
									event.config.status === "active" ? "default" : "secondary"
								}
							>
								{event.config.status}
							</Badge>
						</div>

						<div className="text-sm text-muted-foreground">
							<div>Event: {event.eventName}</div>
							<div>Last Records Sent: {latest?.value ?? 0}</div>
							<div>
								Last Run:{" "}
								{latest?.createdAt ? formatDate(latest.createdAt) : "-"}
							</div>
							{latestMeta ? (
								<div className="mt-2 grid gap-1 text-xs">
									<div>
										Trigger: {latestMeta.triggerType || "-"} | Status:{" "}
										{latestMeta.statusUsed || "-"}
									</div>
									<div>
										Found: {latestMeta.found ?? 0} | Sent:{" "}
										{latestMeta.sent ?? 0} | Failed: {latestMeta.failed ?? 0} |
										Skipped: {latestMeta.skipped ?? 0}
									</div>
								</div>
							) : null}
						</div>

						<div>
							<Link href={`/task-events/${event.eventName}`}>
								<Button variant="outline" size="sm">
									Open Event
								</Button>
							</Link>
						</div>
					</div>
				);
			})}

			{!events.length ? (
				<div className="rounded-lg border bg-card p-4 text-sm text-muted-foreground">
					No task events configured yet.
				</div>
			) : null}
		</div>
	);
}

type DashboardHistoryMeta = {
	triggerType?: string;
	statusUsed?: string;
	found?: number;
	sent?: number;
	failed?: number;
	skipped?: number;
};

function parseHistoryMeta(value: unknown): DashboardHistoryMeta | null {
	if (!value || typeof value !== "object") return null;
	return value as DashboardHistoryMeta;
}

function formatDate(value: Date | string) {
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return "-";
	return date.toLocaleString();
}
