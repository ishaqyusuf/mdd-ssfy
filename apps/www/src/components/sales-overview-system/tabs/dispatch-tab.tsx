"use client";

import { Icons } from "@gnd/ui/icons";

import { useTRPC } from "@/trpc/client";

import { Badge } from "@gnd/ui/badge";
import { useQuery } from "@gnd/ui/tanstack";

import { useSalesOverviewSystem } from "../provider";
import {
	OverviewEmptyState,
	OverviewProgressBar,
	OverviewSectionCard,
	OverviewSectionLabel,
} from "../section-primitives";
import { formatPercent, getStatusLabel } from "../view-model";

type DeliveryAddress = {
	address1?: string | null;
	city?: string | null;
	state?: string | null;
};

type DeliveryWithCompletion = {
	deliveredAt?: string | Date | null;
};

function statusVariant(
	status?: string | null,
): "default" | "secondary" | "destructive" | "outline" {
	switch (status) {
		case "completed":
		case "delivered":
			return "default";
		case "in-progress":
		case "in progress":
			return "secondary";
		case "cancelled":
			return "destructive";
		default:
			return "outline";
	}
}

export function SalesOverviewDispatchTab() {
	const {
		state: { dispatchId, overviewId },
	} = useSalesOverviewSystem();
	const trpc = useTRPC();

	const { data } = useQuery(
		trpc.dispatch.orderDispatchOverview.queryOptions(
			{ salesNo: overviewId },
			{ enabled: !!overviewId },
		),
	);

	const deliveries = dispatchId
		? (data?.deliveries || []).filter(
				(d) => String(d?.id) === String(dispatchId),
			)
		: data?.deliveries || [];

	const progressPct = Number(data?.progress?.percentage || 0);

	return (
		<div className="space-y-5 p-1">
			{/* Overall progress */}
			<OverviewSectionCard>
				<OverviewSectionLabel icon={Icons.Truck} label="Dispatch Overview" />
				<div className="mb-3 space-y-1.5">
					<div className="flex justify-between text-sm">
						<span className="text-muted-foreground">Overall completion</span>
						<span className="font-semibold">{formatPercent(progressPct)}</span>
					</div>
					<OverviewProgressBar
						value={progressPct}
						colorClass={progressPct >= 100 ? "bg-emerald-500" : "bg-blue-500"}
					/>
				</div>
				{deliveries.length > 0 && (
					<p className="text-xs text-muted-foreground">
						{deliveries.length} dispatch{" "}
						{deliveries.length === 1 ? "entry" : "entries"}
					</p>
				)}
			</OverviewSectionCard>

			{/* Delivery entries */}
			{deliveries.length === 0 ? (
				<OverviewEmptyState className="py-10">
					No dispatch data available for this order.
				</OverviewEmptyState>
			) : (
				<div className="space-y-4">
					{deliveries.map((delivery) => {
						const address = (delivery as { address?: DeliveryAddress | null })
							.address;

						return (
							<OverviewSectionCard key={delivery.id}>
								<div className="mb-4 flex items-start justify-between gap-3">
									<div>
										<p className="font-semibold">
											Dispatch #{delivery.id}
											{delivery.dispatchNumber
												? ` · ${delivery.dispatchNumber}`
												: ""}
										</p>
										<div className="mt-1 flex items-center gap-2">
											<Badge variant={statusVariant(delivery.status)}>
												<span className="capitalize">
													{getStatusLabel(delivery.status)}
												</span>
											</Badge>
										</div>
									</div>
								</div>

								<div className="grid gap-3 text-sm md:grid-cols-3">
									<div>
										<p className="text-xs text-muted-foreground">Mode</p>
										<p className="font-medium capitalize">
											{delivery.deliveryMode || "—"}
										</p>
									</div>
									<div>
										<p className="text-xs text-muted-foreground">Driver</p>
										<p className="font-medium">
											{delivery.driver?.name || "Unassigned"}
										</p>
									</div>
									{delivery.dueDate && (
										<div>
											<p className="text-xs text-muted-foreground">Due Date</p>
											<p className="font-medium">
												{new Date(delivery.dueDate).toLocaleDateString("en-US")}
											</p>
										</div>
									)}
									{(delivery as DeliveryWithCompletion).deliveredAt && (
										<div>
											<p className="text-xs text-muted-foreground">
												Date Completed
											</p>
											<p className="font-medium">
												{new Date(
													(delivery as DeliveryWithCompletion).deliveredAt!,
												).toLocaleDateString("en-US")}
											</p>
										</div>
									)}
								</div>

								{/* Delivery address if available */}
								{address && (
									<div className="mt-4 border-t border-border/40 pt-3">
										<div className="flex items-start gap-2">
											<Icons.MapPin className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
											<p className="text-sm text-muted-foreground">
												{[address.address1, address.city, address.state]
													.filter(Boolean)
													.join(", ") || "Address not set"}
											</p>
										</div>
									</div>
								)}
							</OverviewSectionCard>
						);
					})}
				</div>
			)}
		</div>
	);
}
