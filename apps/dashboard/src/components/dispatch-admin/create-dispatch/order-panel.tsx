"use client";

import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@gnd/ui/card";
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from "@gnd/ui/command";
import {
	Field,
	FieldError,
	FieldLabel,
	FieldLegend,
	FieldSet,
} from "@gnd/ui/field";
import { Icons } from "@gnd/ui/icons";
import type { Option } from "@gnd/ui/multiple-selector";
import { ScrollArea } from "@gnd/ui/scroll-area";
import { ToggleGroup, ToggleGroupItem } from "@gnd/ui/toggle-group";
import { useEffect, useMemo, useState } from "react";
import type { OrderDueDateMap } from "./date-model";
import { DeliveryDatePicker } from "./delivery-date-picker";
import {
	type BacklogOrder,
	formatBacklogAddress,
	getBacklogCustomerName,
} from "./types";

function OrderSearch({
	selectedIds,
	onSearch,
	onAdd,
	error,
}: {
	selectedIds: number[];
	onSearch: (search: string) => Promise<Option[]>;
	onAdd: (option: Option) => void;
	error?: { message?: string };
}) {
	const [open, setOpen] = useState(false);
	const [inputValue, setInputValue] = useState("");
	const [options, setOptions] = useState<Option[]>([]);
	const [isSearching, setIsSearching] = useState(false);

	useEffect(() => {
		const query = inputValue.trim();
		if (!query) {
			setOptions([]);
			setIsSearching(false);
			return;
		}

		let cancelled = false;
		const timeout = setTimeout(() => {
			setIsSearching(true);
			void onSearch(query)
				.then((results) => {
					if (!cancelled) setOptions(results);
				})
				.catch(() => {
					if (!cancelled) setOptions([]);
				})
				.finally(() => {
					if (!cancelled) setIsSearching(false);
				});
		}, 150);

		return () => {
			cancelled = true;
			clearTimeout(timeout);
		};
	}, [inputValue, onSearch]);

	const availableOptions = useMemo(
		() =>
			options.filter((option) => !selectedIds.includes(Number(option.value))),
		[options, selectedIds],
	);
	const selectOption = (option: Option) => {
		onAdd(option);
		setOptions([]);
		setOpen(false);
		setTimeout(() => setInputValue(""), 0);
	};

	return (
		<Field data-invalid={Boolean(error)}>
			<FieldLabel htmlFor="dispatch-orders" className="sr-only">
				Search orders
			</FieldLabel>
			<Command
				shouldFilter={false}
				className="relative overflow-visible border"
			>
				<CommandInput
					id="dispatch-orders"
					value={inputValue}
					onValueChange={(value) => {
						setInputValue(value);
						setOpen(Boolean(value.trim()));
					}}
					placeholder="Search orders"
					aria-label="Search orders"
					aria-invalid={Boolean(error)}
					onFocus={() => setOpen(Boolean(inputValue.trim()))}
					onBlur={() => setTimeout(() => setOpen(false), 0)}
					className="px-3"
				/>
				{open ? (
					<CommandList className="absolute inset-x-0 top-full z-10 mt-1 max-h-72 border bg-background shadow-md">
						<CommandEmpty>No orders found</CommandEmpty>
						<CommandGroup>
							{isSearching ? (
								<CommandItem value="searching" disabled>
									Searching…
								</CommandItem>
							) : null}
							{!isSearching
								? availableOptions.map((option) => (
										<CommandItem
											key={String(option.value)}
											value={String(option.value)}
											onMouseDown={(event) => event.preventDefault()}
											onSelect={() => selectOption(option)}
										>
											<div className="min-w-0">
												<p className="truncate font-medium">
													{String(option.orderName)}
												</p>
												<p className="truncate text-xs text-muted-foreground">
													{option.label} · {String(option.customerName)}
												</p>
											</div>
										</CommandItem>
									))
								: null}
						</CommandGroup>
					</CommandList>
				) : null}
			</Command>
			<FieldError errors={error ? [error] : undefined} />
		</Field>
	);
}

export function DispatchOrderPanel({
	selectedIds,
	selectedOrders,
	deliveryMode,
	onDeliveryModeChange,
	onSearch,
	onAdd,
	onRemove,
	orderDueDates,
	overrideDueDate,
	onOrderDueDateChange,
	error,
}: {
	selectedIds: number[];
	selectedOrders: BacklogOrder[];
	deliveryMode: "delivery" | "pickup";
	onDeliveryModeChange: (value: "delivery" | "pickup") => void;
	onSearch: (search: string) => Promise<Option[]>;
	onAdd: (option: Option) => void;
	onRemove: (salesId: number) => void;
	orderDueDates: OrderDueDateMap;
	overrideDueDate: string | null;
	onOrderDueDateChange: (salesId: number, value: string | null) => void;
	error?: { message?: string };
}) {
	return (
		<section className="flex min-h-[28rem] min-w-0 flex-col lg:min-h-0">
			<CardHeader className="gap-3 p-4">
				<div className="flex items-center justify-between gap-3 lg:flex-col lg:items-start">
					<CardTitle className="mb-0 text-base">Orders in dispatch</CardTitle>
					<Badge variant="outline" className="shrink-0 lg:self-start">
						{selectedIds.length}
					</Badge>
				</div>
				<FieldSet className="gap-2">
					<FieldLegend className="sr-only">Fulfillment mode</FieldLegend>
					<ToggleGroup
						type="single"
						variant="outline"
						value={deliveryMode}
						onValueChange={(value) => {
							if (value) onDeliveryModeChange(value as "delivery" | "pickup");
						}}
						className="w-full"
					>
						<ToggleGroupItem value="delivery" className="flex-1">
							Delivery
						</ToggleGroupItem>
						<ToggleGroupItem value="pickup" className="flex-1">
							Pickup
						</ToggleGroupItem>
					</ToggleGroup>
				</FieldSet>
				<OrderSearch
					selectedIds={selectedIds}
					onSearch={onSearch}
					onAdd={onAdd}
					error={error}
				/>
			</CardHeader>
			<ScrollArea className="min-h-0 flex-1 border-t [&_[data-radix-scroll-area-viewport]>div]:!block [&_[data-radix-scroll-area-viewport]>div]:!min-w-0 [&_[data-radix-scroll-area-viewport]>div]:!w-full">
				<CardContent className="flex flex-col gap-3 p-3">
					{selectedOrders.map((order) => (
						<Card key={order.id} className="[content-visibility:auto]">
							<CardHeader className="flex-row items-start justify-between gap-3 p-3">
								<div className="min-w-0">
									<CardTitle className="mb-1 truncate text-sm">
										{order.orderId} · {getBacklogCustomerName(order)}
									</CardTitle>
									<CardDescription className="truncate text-xs">
										{order.title || "Sales order"}
									</CardDescription>
								</div>
								<Button
									type="button"
									variant="ghost"
									size="icon-sm"
									onClick={() => onRemove(order.id)}
									aria-label={`Remove ${order.orderId} from this batch`}
								>
									<Icons.X aria-hidden="true" />
								</Button>
							</CardHeader>
							<CardContent className="px-3 pb-3">
								<p className="flex items-start gap-2 text-xs text-muted-foreground">
									<Icons.MapPin data-icon="inline-start" aria-hidden="true" />
									<span>{formatBacklogAddress(order)}</span>
								</p>
							</CardContent>
							<CardFooter className="block p-3">
								<DeliveryDatePicker
									value={orderDueDates[String(order.id)] || null}
									overrideValue={overrideDueDate}
									onChange={(value) => onOrderDueDateChange(order.id, value)}
									label={`Delivery date for ${order.orderId}`}
								/>
							</CardFooter>
						</Card>
					))}
					{selectedIds.length > selectedOrders.length ? (
						<p className="p-3 text-sm text-muted-foreground">
							Loading selected order details…
						</p>
					) : null}
				</CardContent>
			</ScrollArea>
		</section>
	);
}
