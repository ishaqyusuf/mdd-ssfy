"use client";

import { AuthGuard } from "@/components/auth-guard";
import { _perm } from "@/components/sidebar-links";
import { useEmployeeParams } from "@/hooks/use-employee-params";
import { useTRPC } from "@/trpc/client";
import { Badge } from "@gnd/ui/badge";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@gnd/ui/card";
import {
	Empty,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from "@gnd/ui/empty";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Plus, Truck, UsersRound } from "lucide-react";

export function DispatchDriversView() {
	const trpc = useTRPC();
	const { setParams } = useEmployeeParams();
	const { data } = useSuspenseQuery(
		trpc.dispatch.driverWorkload.queryOptions(undefined, {
			staleTime: 30_000,
		}),
	);
	return (
		<div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
			<AuthGuard rules={[_perm.is("editEmployee")]}>
				<button
					type="button"
					className="flex min-h-40 flex-col items-center justify-center gap-3 rounded-xl border border-dashed bg-muted/20 p-6 text-center transition-colors hover:border-primary/50 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
					onClick={() =>
						setParams({
							createEmployee: true,
							employeeRole: "Driver",
						})
					}
				>
					<span className="flex size-11 items-center justify-center rounded-full bg-primary text-primary-foreground">
						<Plus className="size-5" />
					</span>
					<span>
						<span className="block font-medium">Add driver</span>
						<span className="mt-1 block text-xs text-muted-foreground">
							Create an employee with the driver role selected.
						</span>
					</span>
				</button>
			</AuthGuard>
			{data.map((driver) => (
				<Card key={driver.driverId}>
					<CardHeader>
						<div className="flex items-start justify-between gap-3">
							<div>
								<CardTitle>{driver.driverName}</CardTitle>
								<CardDescription>{driver.active} active stops</CardDescription>
							</div>
							<Truck className="size-5 text-muted-foreground" />
						</div>
					</CardHeader>
					<CardContent className="flex flex-wrap gap-2">
						<Badge variant="outline">{driver.readyToLoad} ready</Badge>
						<Badge variant="outline">{driver.inTransit} in transit</Badge>
						{driver.openExceptions ? (
							<Badge variant="destructive">
								{driver.openExceptions} exceptions
							</Badge>
						) : null}
					</CardContent>
				</Card>
			))}
			{!data.length ? (
				<Empty className="min-h-40 border md:col-span-1 xl:col-span-2">
					<EmptyHeader>
						<EmptyMedia variant="icon">
							<UsersRound />
						</EmptyMedia>
						<EmptyTitle>No active driver workload</EmptyTitle>
						<EmptyDescription>
							Assigned trips appear here as dispatches become active.
						</EmptyDescription>
					</EmptyHeader>
				</Empty>
			) : null}
		</div>
	);
}
