"use client";

import { TaskEventsColumnVisibility } from "@/components/tables-2/task-events/column-visibility";
import { DataTable } from "@/components/tables-2/task-events/data-table";
import { useTRPC } from "@/trpc/client";
import type { TableSettings } from "@/utils/table-settings";
import { Button } from "@gnd/ui/button";
import { Icons } from "@gnd/ui/icons";
import { Input } from "@gnd/ui/input";
import { useSuspenseQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useMemo, useState } from "react";

type Props = {
	initialSettings?: Partial<TableSettings>;
};

export function TaskEventsDashboard({ initialSettings }: Props) {
	const trpc = useTRPC();
	const { data, isFetching, refetch } = useSuspenseQuery(
		trpc.taskEvents.list.queryOptions(),
	);
	const [search, setSearch] = useState("");

	const events = data?.events || [];
	const normalizedSearch = search.trim().toLowerCase();
	const filteredEvents = useMemo(
		() =>
			normalizedSearch
				? events.filter((event) =>
						[
							event.title,
							event.description,
							event.eventName,
							event.config.status,
						]
							.join(" ")
							.toLowerCase()
							.includes(normalizedSearch),
					)
				: events,
		[events, normalizedSearch],
	);

	return (
		<div className="grid gap-3">
			<div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
				<div className="relative max-w-md flex-1">
					<Icons.Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
					<Input
						value={search}
						onChange={(event) => setSearch(event.target.value)}
						placeholder="Search task events..."
						className="pl-9"
					/>
				</div>
				<div className="flex shrink-0 items-center gap-2">
					<TaskEventsColumnVisibility />
					<Button
						type="button"
						variant="outline"
						size="sm"
						onClick={() => refetch()}
						disabled={isFetching}
					>
						<Icons.RefreshCw
							className={`mr-2 size-4 ${isFetching ? "animate-spin" : ""}`}
						/>
						Refresh
					</Button>
					<Button variant="outline" size="sm" asChild>
						<Link href="/task-events/diagnostics">Task Diagnostics</Link>
					</Button>
				</div>
			</div>

			<DataTable
				data={filteredEvents}
				initialSettings={initialSettings}
				hasSearch={Boolean(normalizedSearch)}
				onClearSearch={() => setSearch("")}
				onRefresh={() => refetch()}
			/>
		</div>
	);
}
