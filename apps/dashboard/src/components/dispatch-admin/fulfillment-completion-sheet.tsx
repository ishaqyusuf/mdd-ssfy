"use client";

import { DriverStopFormContext } from "@/components/driver-dashboard/driver-stop/form-context";
import { DriverProofForm } from "@/components/driver-dashboard/driver-stop/proof-form";
import { useFulfillmentParams } from "@/hooks/use-fulfillment-params";
import { useTRPC } from "@/trpc/client";
import { Alert, AlertDescription, AlertTitle } from "@gnd/ui/alert";
import { Button } from "@gnd/ui/button";
import Sheet from "@gnd/ui/custom/sheet-v2";
import { SheetDescription, SheetHeader, SheetTitle } from "@gnd/ui/sheet";
import { Skeleton } from "@gnd/ui/skeleton";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle } from "lucide-react";

const quantityLabel = (quantity: { qty: number; lh: number; rh: number }) =>
	quantity.lh || quantity.rh
		? `${quantity.lh} LH / ${quantity.rh} RH`
		: `${quantity.qty} units`;

export function FulfillmentCompletionSheet({
	salesId,
	fulfillmentId,
}: {
	salesId: number;
	fulfillmentId: number;
}) {
	const trpc = useTRPC();
	const queryClient = useQueryClient();
	const { closeFulfillment, openFulfillment } = useFulfillmentParams();
	const query = useQuery(
		trpc.dispatch.fulfillmentCompletionReview.queryOptions({
			salesId,
			fulfillmentId,
		}),
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
				<div role="alert" className="space-y-3 p-4">
					<p>{query.error.message}</p>
					<Button variant="outline" onClick={() => query.refetch()}>
						Try again
					</Button>
				</div>
			</Sheet.SecondaryContent>
		);
	const review = query.data;
	return (
		<Sheet.SecondaryContent>
			<div className="flex min-h-0 flex-1 flex-col">
				<SheetHeader className="border-b pb-4 pr-8 text-left">
					<SheetDescription>Fulfillment #{fulfillmentId}</SheetDescription>
					<SheetTitle>Mark as completed</SheetTitle>
				</SheetHeader>
				<div className="min-h-0 flex-1 overflow-y-auto">
					<div className="space-y-4 p-4 sm:p-5">
						{review.blockedReason && (
							<Alert variant="destructive">
								<AlertTriangle />
								<AlertTitle>Completion unavailable</AlertTitle>
								<AlertDescription>{review.blockedReason}</AlertDescription>
							</Alert>
						)}
						{review.requiresShortLoadConfirmation && (
							<Alert>
								<AlertTriangle />
								<AlertTitle>Confirm the short load first</AlertTitle>
								<AlertDescription>
									Release the unpacked assigned quantities to backlog before
									completing this fulfillment.
								</AlertDescription>
							</Alert>
						)}
						{review.lines.length > 0 && (
							<section
								className="space-y-2"
								aria-labelledby="completion-quantity-review"
							>
								<h3 id="completion-quantity-review" className="font-semibold">
									Confirm delivered quantities
								</h3>
								<ul className="divide-y rounded-md border">
									{review.lines.map((line) => (
										<li key={line.uid} className="space-y-2 p-3 text-sm">
											<p className="font-medium">{line.title}</p>
											<dl className="grid grid-cols-3 gap-2">
												<div>
													<dt className="text-xs text-muted-foreground">
														Assigned
													</dt>
													<dd>{quantityLabel(line.assigned)}</dd>
												</div>
												<div>
													<dt className="text-xs text-muted-foreground">
														Packed
													</dt>
													<dd>{quantityLabel(line.packed)}</dd>
												</div>
												<div>
													<dt className="text-xs text-muted-foreground">
														Backlog
													</dt>
													<dd>{quantityLabel(line.leftBehind)}</dd>
												</div>
											</dl>
										</li>
									))}
								</ul>
							</section>
						)}
					</div>
					{!review.blockedReason && !review.requiresShortLoadConfirmation && (
						<DriverStopFormContext
							dispatchId={fulfillmentId}
							manifestRevision={review.manifestRevision}
							defaultNoteType={
								review.deliveryMode === "pickup" ? "pickup" : "dispatch"
							}
						>
							<DriverProofForm
								dispatchId={fulfillmentId}
								expectedManifestRevision={review.manifestRevision}
								onCompleted={async () => {
									await queryClient.invalidateQueries({
										queryKey: trpc.dispatch.fulfillmentOrder.pathKey(),
									});
									await closeFulfillment();
								}}
							/>
						</DriverStopFormContext>
					)}
				</div>
				{(review.blockedReason || review.requiresShortLoadConfirmation) && (
					<div className="flex gap-2 border-t p-4">
						{review.requiresShortLoadConfirmation && (
							<Button onClick={() => openFulfillment(fulfillmentId, "packing")}>
								Review packing
							</Button>
						)}
						<Button variant="outline" onClick={() => closeFulfillment()}>
							Back to fulfillment
						</Button>
					</div>
				)}
			</div>
		</Sheet.SecondaryContent>
	);
}
