"use client";

import { useTRPC } from "@/trpc/client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@gnd/ui/button";
import { Skeleton } from "@gnd/ui/skeleton";
import { formatDriverRouteAddress } from "@gnd/sales/dispatch-manifest/driver-destination";

export function FulfillmentRoute({
	salesId,
	fulfillmentId,
}: { salesId: number; fulfillmentId: number }) {
	const trpc = useTRPC();
	const query = useQuery(
		trpc.dispatch.fulfillmentRoute.queryOptions({ salesId, fulfillmentId }),
	);
	if (query.isPending) return <Skeleton className="h-48" />;
	if (query.isError)
		return (
			<div role="alert">
				<p>{query.error.message}</p>
				<Button variant="outline" onClick={() => query.refetch()}>
					Try again
				</Button>
			</div>
		);
	const { destination, deliveryMode } = query.data;
	const address = formatDriverRouteAddress(destination.route);
	return (
		<section aria-label="Fulfillment route" className="space-y-4 text-sm">
			<h3 className="font-semibold">Route destination</h3>
			{deliveryMode === "pickup" ? (
				<p>Customer pickup — no delivery route required.</p>
			) : (
				<>
					<p>{address || "No route destination recorded."}</p>
					<p className="text-muted-foreground">
						{destination.source === "driver_confirmed"
							? "Destination confirmed by the driver."
							: "Using the order shipping address."}
					</p>
					{destination.requiresNormalization && (
						<p className="rounded-md border border-amber-500/40 p-3">
							The destination needs confirmation before navigation.
						</p>
					)}
					{destination.displaySecondary && (
						<div>
							<h4 className="font-medium">Original order address</h4>
							<p>{formatDriverRouteAddress(destination.primary)}</p>
						</div>
					)}
				</>
			)}
		</section>
	);
}
