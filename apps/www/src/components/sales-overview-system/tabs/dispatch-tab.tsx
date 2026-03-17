"use client";

import { useTRPC } from "@/trpc/client";

import { Card, CardContent, CardHeader, CardTitle } from "@gnd/ui/card";
import { Progress } from "@gnd/ui/progress";
import { useQuery } from "@gnd/ui/tanstack";

import { useSalesOverviewSystem } from "../provider";
import { formatPercent, getProgressValue, getStatusLabel } from "../view-model";

export function SalesOverviewDispatchTab() {
	const { dispatchId, overviewId } = useSalesOverviewSystem();
	const trpc = useTRPC();
	const { data } = useQuery(
		trpc.dispatch.orderDispatchOverview.queryOptions(
			{
				salesNo: overviewId,
			},
			{
				enabled: !!overviewId,
			},
		),
	);

	const deliveries = dispatchId
		? (data?.deliveries || []).filter(
				(delivery) => String(delivery?.id) === String(dispatchId),
			)
		: data?.deliveries || [];

	return (
		<div className="space-y-6">
			<Card>
				<CardHeader>
					<CardTitle>Dispatch Progress</CardTitle>
				</CardHeader>
				<CardContent className="space-y-3">
					<Progress value={getProgressValue(data?.progress?.percentage)} />
					<p className="text-sm text-muted-foreground">
						Completion {formatPercent(data?.progress?.percentage)}
					</p>
				</CardContent>
			</Card>

			<section className="space-y-4">
				{deliveries.length ? (
					deliveries.map((delivery) => (
						<Card key={delivery.id}>
							<CardHeader>
								<CardTitle className="text-base">
									Dispatch #{delivery.id}
								</CardTitle>
							</CardHeader>
							<CardContent className="grid gap-3 md:grid-cols-3">
								<div>
									<p className="text-sm text-muted-foreground">Status</p>
									<p className="font-medium">
										{getStatusLabel(delivery.status)}
									</p>
								</div>
								<div>
									<p className="text-sm text-muted-foreground">Mode</p>
									<p className="font-medium">
										{delivery.deliveryMode || "Not set"}
									</p>
								</div>
								<div>
									<p className="text-sm text-muted-foreground">Driver</p>
									<p className="font-medium">
										{delivery.driver?.name || "Unassigned"}
									</p>
								</div>
							</CardContent>
						</Card>
					))
				) : (
					<div className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">
						No dispatch data available for this view.
					</div>
				)}
			</section>
		</div>
	);
}
