"use client";
import MultiSheet from "@gnd/ui/custom/sheet-v2";

import { useFulfillmentParams } from "@/hooks/use-fulfillment-params";

import { useTRPC } from "@/trpc/client";
import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import { SheetDescription, SheetHeader, SheetTitle } from "@gnd/ui/sheet";
import { Skeleton } from "@gnd/ui/skeleton";
import { useInfiniteQuery } from "@tanstack/react-query";
import dynamic from "next/dynamic";
import { FulfillmentHistory } from "./fulfillment-history";
import { FulfillmentOrderBacklog } from "./fulfillment-order-backlog";

const FulfillmentDetailSheet = dynamic(
	() =>
		import("./fulfillment-detail-sheet").then(
			(module) => module.FulfillmentDetailSheet,
		),
	{ ssr: false },
);

const FulfillmentEditSheet = dynamic(() =>
	import("./fulfillment-edit-sheet").then(
		(module) => module.FulfillmentEditSheet,
	),
);
const FulfillmentCreateSheet = dynamic(
	() =>
		import("./fulfillment-create-sheet").then(
			(module) => module.FulfillmentCreateSheet,
		),
	{ ssr: false },
);
const FulfillmentCompletionSheet = dynamic(
	() =>
		import("./fulfillment-completion-sheet").then(
			(module) => module.FulfillmentCompletionSheet,
		),
	{ ssr: false },
);

const dateLabel = (value: string | Date | null | undefined) =>
	value
		? new Date(value).toLocaleDateString("en-US", {
				month: "short",
				day: "numeric",
				year: "numeric",
			})
		: "Unscheduled";

export function FulfillmentOrderSheet() {
	const {
		fulfillmentOrderId,
		fulfillmentId,
		closeOrder,
		closeFulfillment,
		fulfillmentForm,
		openCreateFulfillment,
	} = useFulfillmentParams();

	const trpc = useTRPC();
	const query = useInfiniteQuery(
		trpc.dispatch.fulfillmentOrder.infiniteQueryOptions(
			{ salesId: fulfillmentOrderId || 1 },
			{
				enabled: Boolean(fulfillmentOrderId),
				getNextPageParam: (page) => page.nextCursor,
			},
		),
	);
	const order = query.data?.pages[0];
	const fulfillments = [
		...new Map(
			(
				query.data?.pages.flatMap((page) => page.workspace.fulfillments) || []
			).map((fulfillment) => [fulfillment.id, fulfillment]),
		).values(),
	];
	const quantities = order?.workspace.quantities;
	const total = (key: "ordered" | "delivered" | "assigned") =>
		quantities?.lines.reduce(
			(sum, line) => sum + line[key].qty + line[key].lh + line[key].rh,
			0,
		) ?? 0;
	const assign = () => {
		if (order) void openCreateFulfillment();
	};

	return (
		<MultiSheet
			sheetName="fulfillment-order"
			open={Boolean(fulfillmentOrderId)}
			primarySize="3xl"
			secondarySize="2xl"
			secondaryOpened={Boolean(fulfillmentId || fulfillmentForm)}
			onCloseSecondary={() => void closeFulfillment()}
			onOpenChange={(open) => {
				if (!open) void closeOrder();
			}}
		>
			<MultiSheet.MultiContent>
				<MultiSheet.PrimaryContent>
					<div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
						<SheetHeader className="border-b pb-4 pr-8 text-left">
							<SheetDescription>Order fulfillment</SheetDescription>
							<SheetTitle>
								{order ? order.orderNo : "Order overview"}
							</SheetTitle>
							{order && (
								<div className="flex flex-wrap items-center gap-2">
									<span className="text-sm text-muted-foreground">
										{order.customerName}
									</span>
									<Badge variant="secondary">
										{order.pipeline.headline.label}
									</Badge>
								</div>
							)}
						</SheetHeader>
						<div className="min-h-0 flex-1 space-y-6 overflow-y-auto py-4">
							{query.isPending && <Skeleton className="h-64" />}
							{query.isError && (
								<div role="alert" className="space-y-3">
									<p>{query.error.message}</p>
									<Button variant="outline" onClick={() => query.refetch()}>
										Try again
									</Button>
								</div>
							)}
							{order && quantities && (
								<>
									<section
										aria-labelledby="fulfillment-order-general"
										className="space-y-3"
									>
										<h3
											id="fulfillment-order-general"
											className="font-semibold"
										>
											General information
										</h3>
										<dl className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
											<div>
												<dt className="text-xs text-muted-foreground">
													Customer
												</dt>
												<dd>{order.customerName}</dd>
											</div>
											<div>
												<dt className="text-xs text-muted-foreground">Phone</dt>
												<dd>{order.phone || "Not provided"}</dd>
											</div>
											<div>
												<dt className="text-xs text-muted-foreground">
													Destination
												</dt>
												<dd>
													{order.destination || "No address on this order"}
												</dd>
											</div>
											<div>
												<dt className="text-xs text-muted-foreground">
													Order fulfillment date
												</dt>
												<dd>{dateLabel(order.workspace.dueDate)}</dd>
											</div>
											<div>
												<dt className="text-xs text-muted-foreground">
													Delivery mode
												</dt>
												<dd className="capitalize">
													{order.workspace.deliveryMode || "Not set"}
												</dd>
											</div>
											<div>
												<dt className="text-xs text-muted-foreground">
													Exceptions
												</dt>
												<dd>
													{order.openExceptionFulfillmentCount
														? `${order.openExceptionFulfillmentCount} fulfillments with open exceptions`
														: "No open exceptions"}
												</dd>
											</div>
										</dl>
									</section>
									<dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
										{[
											["Ordered", total("ordered")],
											["Delivered", total("delivered")],
											[
												"Assigned",
												quantities.resolved ? total("assigned") : "—",
											],
											[
												"Backlog",
												order.fulfillmentCount === 0
													? 0
													: quantities.resolved
														? quantities.backlogQty
														: "—",
											],
										].map(([label, value]) => (
											<div key={label} className="border p-3">
												<dt className="text-xs text-muted-foreground">
													{label}
												</dt>
												<dd className="mt-1 text-xl font-semibold tabular-nums">
													{value}
												</dd>
											</div>
										))}
									</dl>
									<FulfillmentOrderBacklog
										quantities={quantities}
										onAssign={assign}
										completed={order.workspace.completed}
									/>
									<section
										aria-labelledby="order-fulfillments"
										className="space-y-3"
									>
										<div className="flex items-center justify-between gap-3">
											<h3 id="order-fulfillments" className="font-semibold">
												Fulfillments{" "}
												<span className="text-muted-foreground">
													({order.fulfillmentCount})
												</span>
											</h3>
											<Button
												onClick={assign}
												disabled={
													order.workspace.completed ||
													!quantities.resolved ||
													!quantities.lines.some(
														(line) =>
															line.availableToAssign.qty +
																line.availableToAssign.lh +
																line.availableToAssign.rh >
															0,
													)
												}
											>
												Assign
											</Button>
										</div>
										{fulfillments.length === 0 ? (
											<div className="border border-dashed p-6 text-center">
												<p className="font-medium">No fulfillments yet</p>
												<p className="mt-1 text-sm text-muted-foreground">
													Assign the available quantities to plan the first
													fulfillment.
												</p>
											</div>
										) : (
											<FulfillmentHistory items={fulfillments} />
										)}
										{query.hasNextPage && (
											<Button
												variant="outline"
												disabled={query.isFetchingNextPage}
												onClick={() => query.fetchNextPage()}
											>
												{query.isFetchingNextPage
													? "Loading…"
													: "Load more fulfillments"}
											</Button>
										)}
									</section>
								</>
							)}
						</div>
					</div>
				</MultiSheet.PrimaryContent>
				{fulfillmentForm === "create" && fulfillmentOrderId ? (
					<FulfillmentCreateSheet salesId={fulfillmentOrderId} />
				) : fulfillmentForm === "edit" &&
					fulfillmentOrderId &&
					fulfillmentId ? (
					<FulfillmentEditSheet
						salesId={fulfillmentOrderId}
						fulfillmentId={fulfillmentId}
					/>
				) : fulfillmentForm === "complete" &&
					fulfillmentOrderId &&
					fulfillmentId ? (
					<FulfillmentCompletionSheet
						salesId={fulfillmentOrderId}
						fulfillmentId={fulfillmentId}
					/>
				) : fulfillmentId ? (
					<FulfillmentDetailSheet />
				) : null}
			</MultiSheet.MultiContent>
		</MultiSheet>
	);
}
