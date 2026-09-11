"use client";
import { useTRPC } from "@/trpc/client";
import { useQuery } from "@tanstack/react-query";
import Sheet from "@gnd/ui/custom/sheet-v2";
import { Button } from "@gnd/ui/button";
import { Skeleton } from "@gnd/ui/skeleton";
import { FulfillmentForm } from "./fulfillment-form";

export function FulfillmentCreateSheet({ salesId }: { salesId: number }) {
	const trpc = useTRPC();
	const query = useQuery(
		trpc.dispatch.fulfillmentAssignmentOptions.queryOptions({ salesId }),
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
	return (
		<FulfillmentForm
			key={`${salesId}:${query.data.revision}`}
			options={query.data}
		/>
	);
}
