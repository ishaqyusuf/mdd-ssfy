"use client";

import { useTRPC } from "@/trpc/client";
import { useQuery } from "@tanstack/react-query";
import Sheet from "@gnd/ui/custom/sheet-v2";
import { Skeleton } from "@gnd/ui/skeleton";
import { Button } from "@gnd/ui/button";
import { FulfillmentForm } from "./fulfillment-form";

export function FulfillmentEditSheet(props: {
	salesId: number;
	fulfillmentId: number;
}) {
	const trpc = useTRPC();
	const query = useQuery(
		trpc.dispatch.fulfillmentEditOptions.queryOptions(props),
	);
	if (query.isPending)
		return (
			<Sheet.SecondaryContent>
				<Skeleton className="h-64" />
			</Sheet.SecondaryContent>
		);
	if (query.isError)
		return (
			<Sheet.SecondaryContent>
				<div role="alert">
					<p>{query.error.message}</p>
					<Button onClick={() => query.refetch()}>Try again</Button>
				</div>
			</Sheet.SecondaryContent>
		);
	const data = query.data;
	const lines = data.lines.filter(
		(line) => line.capacity.qty + line.capacity.lh + line.capacity.rh > 0,
	);
	return (
		<FulfillmentForm
			key={`${data.fulfillmentId}:${data.revision}`}
			options={{
				salesId: data.salesId,
				orderNo: data.orderNo,
				dueDate: data.dueDate,
				deliveryMode: data.deliveryMode === "pickup" ? "pickup" : "delivery",
				revision: data.revision,
				canAssign: data.canEdit,
				blockedReason: data.blockedReason,
				backlogQty: 0,
				availableQty: lines.reduce(
					(sum, line) =>
						sum + line.capacity.qty + line.capacity.lh + line.capacity.rh,
					0,
				),
				lines: lines.map((line) => ({
					...line,
					size: line.size ?? null,
					quantity: line.capacity,
				})),
			}}
			edit={{
				fulfillmentId: data.fulfillmentId,
				driverId: data.driverId,
				selectionMode: data.scope?.selectionMode ?? "selected",
				lines: lines.map((line) => ({ ...line, size: line.size ?? null })),
			}}
		/>
	);
}
