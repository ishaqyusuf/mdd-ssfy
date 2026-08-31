"use client";

import { Badge } from "@gnd/ui/badge";
import { CardContent, CardHeader, CardTitle } from "@gnd/ui/card";
import { Icons } from "@gnd/ui/icons";
import { ScrollArea } from "@gnd/ui/scroll-area";
import { Separator } from "@gnd/ui/separator";
import {
	type OrderDueDateMap,
	formatDeliveryDate,
	getEffectiveDeliveryDate,
} from "./date-model";
import { DeliveryDatePicker } from "./delivery-date-picker";
import {
	type BacklogOrder,
	formatBacklogAddress,
	getBacklogCustomerName,
} from "./types";

export function DispatchRoutePanel({
	orders,
	orderDueDates,
	overrideDueDate,
	onOverrideDueDateChange,
}: {
	orders: BacklogOrder[];
	orderDueDates: OrderDueDateMap;
	overrideDueDate: string | null;
	onOverrideDueDateChange: (value: string | null) => void;
}) {
	return (
		<section className="flex min-h-[28rem] min-w-0 flex-col lg:min-h-0">
			<CardHeader className="gap-3 p-4">
				<CardTitle className="mb-0 text-base">Route</CardTitle>
				<DeliveryDatePicker
					value={overrideDueDate}
					onChange={onOverrideDueDateChange}
					label="Batch delivery-date override"
					placeholder="Set one date for all orders"
					allowClear
				/>
			</CardHeader>
			<ScrollArea className="min-h-0 flex-1 border-t">
				<CardContent className="p-4">
					<div className="flex items-center gap-3 pb-4">
						<div className="flex size-8 shrink-0 items-center justify-center rounded-full border bg-muted">
							<Icons.Route aria-hidden="true" />
						</div>
						<div className="min-w-0">
							<p className="text-sm font-medium">GND warehouse</p>
							<p className="text-xs text-muted-foreground">Route origin</p>
						</div>
					</div>
					{orders.map((order, index) => {
						const individualDate = orderDueDates[String(order.id)] || "";
						const effectiveDate = getEffectiveDeliveryDate(
							individualDate,
							overrideDueDate,
						);
						return (
							<div key={order.id}>
								<Separator />
								<div className="flex gap-3 py-4 [content-visibility:auto]">
									<div className="flex size-8 shrink-0 items-center justify-center rounded-full border bg-background text-xs font-medium">
										{index + 1}
									</div>
									<div className="min-w-0 flex-1">
										<p className="truncate text-sm font-medium">
											{order.orderId} · {getBacklogCustomerName(order)}
										</p>
										<p className="mt-1 text-xs text-muted-foreground">
											{formatBacklogAddress(order)}
										</p>
										<div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
											{overrideDueDate ? (
												<span className="text-muted-foreground line-through">
													{formatDeliveryDate(individualDate)}
												</span>
											) : null}
											<Badge variant="secondary">
												{formatDeliveryDate(effectiveDate)}
											</Badge>
										</div>
									</div>
								</div>
							</div>
						);
					})}
					{orders.length ? null : (
						<p className="py-10 text-center text-sm text-muted-foreground">
							Add an order to preview the route sequence.
						</p>
					)}
				</CardContent>
			</ScrollArea>
		</section>
	);
}
