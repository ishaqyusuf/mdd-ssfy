"use client";

import { invalidateDispatchWorkspace } from "@/components/dispatch-admin/dispatch-query-invalidation";
import {
	DispatchFormContext,
	type DispatchCreateFormValues,
} from "@/components/dispatch-admin/dispatch/form-context";
import { useDriversList } from "@/hooks/use-data-list";
import { useDispatchFilterParams } from "@/hooks/use-dispatch-filter-params";
import { useTRPC } from "@/trpc/client";
import type { RouterOutputs } from "@api/trpc/routers/_app";
import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@gnd/ui/dialog";
import {
	Field,
	FieldDescription,
	FieldError,
	FieldGroup,
	FieldLabel,
} from "@gnd/ui/field";
import { Input } from "@gnd/ui/input";
import MultipleSelector, { type Option } from "@gnd/ui/multiple-selector";
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@gnd/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@gnd/ui/toggle-group";
import {
	useMutation,
	useQuery,
	useQueryClient,
} from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Controller, useFormContext } from "react-hook-form";
import { toast } from "sonner";

type BacklogOrder = RouterOutputs["dispatch"]["backlog"]["data"][number];
const emptyBacklogOrders: BacklogOrder[] = [];

function toOrderOptions(orders: BacklogOrder[]): Option[] {
	return orders.map((order) => ({
		value: String(order.id),
		label: order.orderId || `Order ${order.id}`,
		orderName: order.title || order.orderId || `Order ${order.id}`,
		customerName:
			order.customer?.businessName ||
			order.customer?.name ||
			order.shippingAddress?.name ||
			"Customer",
		status: order.status || "Ready",
		deliveryMode: order.deliveryOption || "delivery",
	}));
}

function CreateDispatchForm({ onCreated }: { onCreated: () => void }) {
	const trpc = useTRPC();
	const queryClient = useQueryClient();
	const drivers = useDriversList(true);
	const form = useFormContext<DispatchCreateFormValues>();
	const backlog = useQuery(
		trpc.dispatch.backlog.queryOptions({ size: 100 }),
	);
	const orders = backlog.data?.data ?? emptyBacklogOrders;
	const orderOptions = useMemo<Option[]>(
		() => toOrderOptions(orders),
		[orders],
	);
	const [knownOptions, setKnownOptions] = useState<Option[]>([]);
	useEffect(() => {
		setKnownOptions((current) => {
			const merged = new Map(current.map((option) => [option.value, option]));
			for (const option of orderOptions) merged.set(option.value, option);
			return [...merged.values()];
		});
	}, [orderOptions]);
	const searchOrders = useCallback(
		async (search: string) => {
			const query = search.trim();
			if (!query) return orderOptions;
			const result = await queryClient.fetchQuery(
				trpc.dispatch.backlog.queryOptions({ q: query, size: 50 }),
			);
			const options = toOrderOptions(result.data);
			setKnownOptions((current) => {
				const merged = new Map(current.map((option) => [option.value, option]));
				for (const option of options) merged.set(option.value, option);
				return [...merged.values()];
			});
			return options;
		},
		[orderOptions, queryClient, trpc.dispatch.backlog],
	);
	const mutation = useMutation(
		trpc.dispatch.createDispatches.mutationOptions({
			onSuccess(result) {
				invalidateDispatchWorkspace(queryClient, trpc);
				toast.success(
					result.count === 1
						? "Dispatch created"
						: `${result.count} dispatches created`,
				);
				onCreated();
			},
			onError(error) {
				toast.error(error.message || "Unable to create dispatches");
			},
		}),
	);
	const submit = form.handleSubmit((values) => {
		mutation.mutate({
			salesIds: values.salesIds,
			deliveryMode: values.deliveryMode,
			dueDate: new Date(`${values.dueDate}T12:00:00`),
			driverId: values.driverId,
		});
	});

	return (
		<form onSubmit={submit} className="flex flex-col gap-6 px-6 pb-6">
			<FieldGroup>
				<Field data-invalid={Boolean(form.formState.errors.salesIds)}>
					<FieldLabel htmlFor="dispatch-orders">Orders</FieldLabel>
					<FieldDescription>
						Search by order number, customer, delivery mode, or status.
					</FieldDescription>
					<Controller
						control={form.control}
						name="salesIds"
						render={({ field }) => (
							<MultipleSelector
								value={knownOptions.filter((option) =>
									field.value.includes(Number(option.value)),
								)}
								onChange={(options) => {
									setKnownOptions((current) => {
										const merged = new Map(
											current.map((option) => [option.value, option]),
										);
										for (const option of options) merged.set(option.value, option);
										return [...merged.values()];
									});
									field.onChange(options.map((option) => Number(option.value)));
								}}
								onSearch={searchOrders}
								triggerSearchOnFocus
								delay={100}
								maxSelected={50}
								onMaxSelected={() =>
									toast.error("You can create up to 50 dispatches at a time")
								}
								placeholder="Search eligible orders..."
								emptyIndicator={
									<p className="py-3 text-center text-sm text-muted-foreground">
										No eligible orders found.
									</p>
								}
								inputProps={{
									id: "dispatch-orders",
									"aria-invalid": Boolean(form.formState.errors.salesIds),
								}}
								renderOption={(option) => (
									<div className="flex w-full items-start justify-between gap-3 py-1">
										<div className="min-w-0">
											<p className="font-medium">
												{String(option.orderName)}
											</p>
											<p className="truncate text-xs text-muted-foreground">
												{option.label} · {String(option.customerName)} ·{" "}
												<span className="capitalize">
													{String(option.deliveryMode)}
												</span>
											</p>
										</div>
										<Badge variant="outline" className="shrink-0 capitalize">
											{String(option.status)}
										</Badge>
									</div>
								)}
							/>
						)}
					/>
					<FieldError errors={[form.formState.errors.salesIds]} />
				</Field>
				<div className="grid gap-5 sm:grid-cols-2">
					<Field>
						<FieldLabel>Delivery mode</FieldLabel>
						<Controller
							control={form.control}
							name="deliveryMode"
							render={({ field }) => (
								<ToggleGroup
									type="single"
									variant="outline"
									value={field.value}
									onValueChange={(value) => value && field.onChange(value)}
								>
									<ToggleGroupItem value="delivery">Delivery</ToggleGroupItem>
									<ToggleGroupItem value="pickup">Pickup</ToggleGroupItem>
								</ToggleGroup>
							)}
						/>
					</Field>
					<Field data-invalid={Boolean(form.formState.errors.dueDate)}>
						<FieldLabel htmlFor="dispatch-date">Delivery date</FieldLabel>
						<Input
							id="dispatch-date"
							type="date"
							aria-invalid={Boolean(form.formState.errors.dueDate)}
							{...form.register("dueDate")}
						/>
						<FieldError errors={[form.formState.errors.dueDate]} />
					</Field>
				</div>
				<Field>
					<FieldLabel htmlFor="dispatch-driver">Driver</FieldLabel>
					<FieldDescription>
						Optional; unassigned work remains ready to assign.
					</FieldDescription>
					<Controller
						control={form.control}
						name="driverId"
						render={({ field }) => (
							<Select
								value={field.value ? String(field.value) : "unassigned"}
								onValueChange={(value) =>
									field.onChange(value === "unassigned" ? null : Number(value))
								}
							>
								<SelectTrigger id="dispatch-driver">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectGroup>
										<SelectItem value="unassigned">Unassigned</SelectItem>
										{drivers.map((driver) => (
											<SelectItem key={driver.id} value={String(driver.id)}>
												{driver.name || "Unnamed driver"}
											</SelectItem>
										))}
									</SelectGroup>
								</SelectContent>
							</Select>
						)}
					/>
				</Field>
			</FieldGroup>
			<div className="flex items-center justify-between gap-3 border-t pt-5">
				<p className="text-xs text-muted-foreground">
					{form.watch("salesIds").length} order
					{form.watch("salesIds").length === 1 ? "" : "s"} selected
				</p>
				<Button
					type="submit"
					disabled={mutation.isPending || !form.formState.isValid}
				>
					{mutation.isPending
						? "Creating..."
						: form.watch("salesIds").length > 1
							? "Create dispatches"
							: "Create dispatch"}
				</Button>
			</div>
		</form>
	);
}

export function CreateDispatchDialog() {
	const { filters, setFilters } = useDispatchFilterParams();
	const open = filters.sheetMode === "create";
	const close = () =>
		setFilters({
			sheetMode: null,
			dispatchSalesId: null,
			dispatchId: null,
			section: "dispatches",
		});
	return (
		<Dialog open={open} onOpenChange={(next) => !next && void close()}>
			<DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto p-0">
				<DialogHeader className="px-6 pt-6">
					<DialogTitle>Create dispatch</DialogTitle>
					<DialogDescription>
						Choose one or more eligible orders. Each order becomes its own
						dispatch with the shared schedule and driver assignment.
					</DialogDescription>
				</DialogHeader>
				<DispatchFormContext salesId={filters.dispatchSalesId}>
					<CreateDispatchForm onCreated={() => void close()} />
				</DispatchFormContext>
			</DialogContent>
		</Dialog>
	);
}
