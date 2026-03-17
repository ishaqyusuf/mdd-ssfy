"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@gnd/ui/card";
import { Progress } from "@gnd/ui/progress";

import { useSalesOverviewSystem } from "../provider";
import { formatPercent, getProgressValue, getStatusLabel } from "../view-model";

function StatusCard({
	label,
	status,
	progress,
}: {
	label: string;
	status?: string | null;
	progress?: number | null;
}) {
	return (
		<Card>
			<CardContent className="space-y-3 p-5">
				<p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
					{label}
				</p>
				<p className="text-lg font-semibold">{getStatusLabel(status)}</p>
				<Progress value={getProgressValue(progress)} />
				<p className="text-sm text-muted-foreground">
					Progress {formatPercent(progress)}
				</p>
			</CardContent>
		</Card>
	);
}

export function SalesOverviewOperationsTab() {
	const { data } = useSalesOverviewSystem();

	return (
		<div className="space-y-6">
			<section className="grid gap-4 md:grid-cols-3">
				<StatusCard
					label="Assignment"
					status={data?.status?.assignment?.status}
					progress={data?.stats?.prodAssigned?.percentage}
				/>
				<StatusCard
					label="Production"
					status={data?.status?.production?.status}
					progress={data?.stats?.prodCompleted?.percentage}
				/>
				<StatusCard
					label="Delivery"
					status={data?.status?.delivery?.status}
					progress={data?.stats?.prodCompleted?.percentage}
				/>
			</section>

			<Card>
				<CardHeader>
					<CardTitle>Operational Summary</CardTitle>
				</CardHeader>
				<CardContent className="grid gap-4 md:grid-cols-2">
					<div className="rounded-xl border p-4">
						<p className="text-sm text-muted-foreground">Assigned Items</p>
						<p className="mt-2 text-2xl font-semibold">
							{Number(data?.stats?.prodAssigned?.total || 0)}
						</p>
					</div>
					<div className="rounded-xl border p-4">
						<p className="text-sm text-muted-foreground">Completion Rate</p>
						<p className="mt-2 text-2xl font-semibold">
							{formatPercent(data?.stats?.prodCompleted?.percentage)}
						</p>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
