"use client";

import { useAuth } from "@/hooks/use-auth";
import { useTRPC } from "@/trpc/client";

import { Card, CardContent, CardHeader, CardTitle } from "@gnd/ui/card";
import { Progress } from "@gnd/ui/progress";
import { useQuery } from "@gnd/ui/tanstack";

import { useSalesOverviewSystem } from "../provider";
import { formatPercent, getProgressValue } from "../view-model";

export function SalesOverviewProductionTab() {
	const { accessView, data, isAdmin, overviewId } = useSalesOverviewSystem();
	const auth = useAuth();
	const trpc = useTRPC();
	const { data: productionData } = useQuery(
		trpc.sales.productionOverview.queryOptions(
			{
				salesNo: overviewId,
				assignedToId:
					accessView === "production" && !isAdmin ? Number(auth.id || 0) : null,
			},
			{
				enabled: !!overviewId,
			},
		),
	);
	const items =
		productionData?.items?.filter((item) => item?.itemConfig?.production) || [];

	return (
		<div className="space-y-6">
			<section className="grid gap-4 md:grid-cols-3">
				<Card>
					<CardContent className="p-5">
						<p className="text-sm text-muted-foreground">Assigned Coverage</p>
						<p className="mt-2 text-2xl font-semibold">
							{formatPercent(data?.stats?.prodAssigned?.percentage)}
						</p>
					</CardContent>
				</Card>
				<Card>
					<CardContent className="p-5">
						<p className="text-sm text-muted-foreground">Completed</p>
						<p className="mt-2 text-2xl font-semibold">
							{formatPercent(data?.stats?.prodCompleted?.percentage)}
						</p>
					</CardContent>
				</Card>
				<Card>
					<CardContent className="p-5">
						<p className="text-sm text-muted-foreground">Visible Items</p>
						<p className="mt-2 text-2xl font-semibold">{items.length}</p>
					</CardContent>
				</Card>
			</section>

			<section className="space-y-4">
				{items.length ? (
					items.map((item) => (
						<Card key={item.controlUid}>
							<CardHeader>
								<CardTitle className="text-base">{item.title}</CardTitle>
							</CardHeader>
							<CardContent className="space-y-3">
								<p className="text-sm text-muted-foreground">
									{item.subtitle || "Production line item"}
								</p>
								<Progress
									value={getProgressValue(
										item?.analytics?.stats?.qty?.percentage,
									)}
								/>
								<p className="text-sm text-muted-foreground">
									Progress{" "}
									{formatPercent(item?.analytics?.stats?.qty?.percentage)}
								</p>
							</CardContent>
						</Card>
					))
				) : (
					<div className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">
						No production items available for this view.
					</div>
				)}
			</section>
		</div>
	);
}
