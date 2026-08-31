"use client";

import { invalidateDispatchWorkspace } from "@/components/dispatch-admin/dispatch-query-invalidation";
import { useDispatchAssignmentAddressGuard } from "@/components/dispatch-assignment/address-guard";
import {
	type DispatchCreateFormValues,
	DispatchFormContext,
} from "@/components/dispatch-admin/dispatch/form-context";
import { CustomModal } from "@/components/modals/custom-modal";
import { useDispatchFilterParams } from "@/hooks/use-dispatch-filter-params";
import { useTRPC } from "@/trpc/client";
import { Button } from "@gnd/ui/button";
import { Card } from "@gnd/ui/card";
import { DialogFooter } from "@gnd/ui/dialog";
import type { Option } from "@gnd/ui/multiple-selector";
import { Separator } from "@gnd/ui/separator";
import { Spinner } from "@gnd/ui/spinner";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { toast } from "sonner";
import {
	buildDispatchOrderDates,
	parseDateInput,
	reconcileOrderDueDates,
	todayDateInput,
	toDateInput,
} from "./create-dispatch/date-model";
import { DispatchDriverPanel } from "./create-dispatch/driver-panel";
import { DispatchOrderPanel } from "./create-dispatch/order-panel";
import { DispatchRoutePanel } from "./create-dispatch/route-panel";
import {
	type BacklogOrder,
	type DriverChoice,
	type DriverWorkload,
	getBacklogCustomerName,
} from "./create-dispatch/types";

const emptyBacklogOrders: BacklogOrder[] = [];

function mergeBacklogOrders(current: BacklogOrder[], incoming: BacklogOrder[]) {
	const merged = new Map(current.map((order) => [order.id, order]));
	for (const order of incoming) merged.set(order.id, order);
	return [...merged.values()];
}

function toOrderOptions(orders: BacklogOrder[]): Option[] {
	return orders.map((order) => ({
		value: String(order.id),
		label: order.orderId || `Order ${order.id}`,
		orderName: order.title || order.orderId || `Order ${order.id}`,
		customerName: getBacklogCustomerName(order),
		status: order.status || "Ready",
		deliveryMode: order.deliveryOption || "delivery",
	}));
}

function CreateDispatchForm({
	initialSalesId,
	onCreated,
	onCancel,
}: {
	initialSalesId?: number | null;
	onCreated: () => void;
	onCancel: () => void;
}) {
	const trpc = useTRPC();
	const queryClient = useQueryClient();
	const form = useFormContext<DispatchCreateFormValues>();
	const salesIds = useWatch({ control: form.control, name: "salesIds" });
	const orderDueDates = useWatch({
		control: form.control,
		name: "orderDueDates",
	});
	const batchDueDate = useWatch({
		control: form.control,
		name: "batchDueDate",
	});
	const deliveryMode = useWatch({
		control: form.control,
		name: "deliveryMode",
	});
	const driverId = useWatch({ control: form.control, name: "driverId" });
	const assignmentAddressGuard = useDispatchAssignmentAddressGuard();

	const backlog = useQuery(trpc.dispatch.backlog.queryOptions({ size: 20 }));
	const initialOrder = useQuery(
		trpc.dispatch.backlog.queryOptions(
			{ ids: initialSalesId ? [initialSalesId] : [], size: 1 },
			{ enabled: Boolean(initialSalesId) },
		),
	);
	const employees = useQuery(
		trpc.hrm.getEmployees.queryOptions({
			can: ["viewDelivery"],
			cannot: ["editOrders"],
		}),
	);
	const driverWorkload = useQuery(
		trpc.dispatch.driverWorkload.queryOptions(undefined),
	);
	const [knownOrders, setKnownOrders] = useState<BacklogOrder[]>([]);

	useEffect(() => {
		const incoming = [
			...(backlog.data?.data ?? emptyBacklogOrders),
			...(initialOrder.data?.data ?? emptyBacklogOrders),
		];
		setKnownOrders((current) => mergeBacklogOrders(current, incoming));
	}, [backlog.data?.data, initialOrder.data?.data]);

	const orderOptions = useMemo(
		() => toOrderOptions(knownOrders),
		[knownOrders],
	);
	const orderById = useMemo(
		() => new Map(knownOrders.map((order) => [order.id, order])),
		[knownOrders],
	);
	const defaultDueDates = useMemo(
		() =>
			Object.fromEntries(
				knownOrders
					.map((order) => [String(order.id), toDateInput(order.deliveryDueDate)])
					.filter((entry) => Boolean(entry[1])),
			),
		[knownOrders],
	);
	const selectedOrders = useMemo(
		() =>
			salesIds
				.map((salesId) => orderById.get(salesId))
				.filter((order): order is BacklogOrder => Boolean(order)),
		[orderById, salesIds],
	);
	const updateSelectedOrderIds = useCallback(
		(nextSalesIds: number[]) => {
			form.setValue("salesIds", nextSalesIds, {
				shouldDirty: true,
				shouldValidate: true,
			});
			form.setValue(
				"orderDueDates",
				reconcileOrderDueDates(
					nextSalesIds,
					orderDueDates,
					todayDateInput(),
					defaultDueDates,
				),
				{ shouldDirty: true, shouldValidate: true },
			);
		},
		[defaultDueDates, form, orderDueDates],
	);
	const addOrder = useCallback(
		(option: Option) => {
			const salesId = Number(option.value);
			if (!salesId || salesIds.includes(salesId)) return;
			updateSelectedOrderIds([...salesIds, salesId]);
		},
		[salesIds, updateSelectedOrderIds],
	);

	const searchOrders = useCallback(
		async (search: string) => {
			const query = search.trim();
			if (!query) return orderOptions;
			const result = await queryClient.fetchQuery(
				trpc.dispatch.backlog.queryOptions({ q: query, size: 20 }),
			);
			setKnownOrders((current) => mergeBacklogOrders(current, result.data));
			return toOrderOptions(result.data);
		},
		[orderOptions, queryClient, trpc.dispatch.backlog],
	);

	const workloadByDriver = useMemo(
		() =>
			new Map((driverWorkload.data ?? []).map((item) => [item.driverId, item])),
		[driverWorkload.data],
	);
	const drivers = useMemo<DriverChoice[]>(() => {
		return (employees.data?.data ?? [])
			.map((employee) => {
				const workload = workloadByDriver.get(employee.id) as
					| DriverWorkload
					| undefined;
				return {
					id: employee.id,
					name: employee.name || "Unnamed driver",
					active: workload?.active ?? 0,
					inTransit: workload?.inTransit ?? 0,
					readyToLoad: workload?.readyToLoad ?? 0,
					openExceptions: workload?.openExceptions ?? 0,
				};
			})
			.sort(
				(a, b) =>
					a.openExceptions - b.openExceptions ||
					a.active - b.active ||
					a.inTransit - b.inTransit ||
					a.name.localeCompare(b.name),
			);
	}, [employees.data?.data, workloadByDriver]);

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
		const createDispatches = () =>
			mutation.mutate({
				orders: buildDispatchOrderDates(values.salesIds, values.orderDueDates),
				deliveryMode: values.deliveryMode,
				overrideDueDate: values.batchDueDate
					? parseDateInput(values.batchDueDate)
					: null,
				driverId: values.driverId,
			});
		if (values.deliveryMode === "delivery" && values.driverId) {
			void assignmentAddressGuard.guardAssignment(
				{
					salesIds: values.salesIds,
					deliveryMode: values.deliveryMode,
				},
				createDispatches,
			);
			return;
		}
		createDispatches();
	});
	const selectedDetailsLoading = selectedOrders.length !== salesIds.length;

	useEffect(() => {
		const nextDueDates = reconcileOrderDueDates(
			salesIds,
			orderDueDates,
			todayDateInput(),
			defaultDueDates,
		);
		const changed =
			Object.keys(nextDueDates).length !== Object.keys(orderDueDates).length ||
			Object.entries(nextDueDates).some(
				([salesId, value]) => orderDueDates[salesId] !== value,
			);
		if (!changed) return;
		form.setValue("orderDueDates", nextDueDates, {
			shouldDirty: false,
			shouldValidate: true,
		});
	}, [defaultDueDates, form, orderDueDates, salesIds]);

	useEffect(() => {
		if (deliveryMode !== "pickup" || driverId === null) return;
		form.setValue("driverId", null, {
			shouldDirty: true,
			shouldValidate: true,
		});
	}, [deliveryMode, driverId, form]);

	return (
		<>
			<form
				onSubmit={submit}
				className="flex min-h-0 min-w-0 flex-1 flex-col overflow-x-hidden"
			>
			<div className="min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden bg-background lg:overflow-hidden">
				<Card className="grid min-h-0 min-w-0 border-0 bg-background lg:h-full lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,3fr)_auto_minmax(0,1fr)] lg:overflow-hidden">
					<DispatchOrderPanel
						selectedIds={salesIds}
						selectedOrders={selectedOrders}
						deliveryMode={deliveryMode}
						onDeliveryModeChange={(value) => {
							form.setValue("deliveryMode", value, {
								shouldDirty: true,
								shouldValidate: true,
							});
							if (value === "pickup") {
								form.setValue("driverId", null, {
									shouldDirty: true,
									shouldValidate: true,
								});
							}
						}}
						onSearch={searchOrders}
						onAdd={addOrder}
						onRemove={(salesId) =>
							updateSelectedOrderIds(
								salesIds.filter((selectedId) => selectedId !== salesId),
							)
						}
						orderDueDates={orderDueDates}
						overrideDueDate={batchDueDate}
						onOrderDueDateChange={(salesId, value) => {
							if (!value) {
								toast.error("Each order needs an individual delivery date");
								return;
							}
							form.setValue(
								"orderDueDates",
								{ ...orderDueDates, [String(salesId)]: value },
								{ shouldDirty: true, shouldValidate: true },
							);
						}}
						error={form.formState.errors.salesIds}
					/>
					<Separator className="lg:hidden" />
					<Separator
						orientation="vertical"
						className="hidden h-full lg:block"
					/>
					<DispatchRoutePanel
						orders={selectedOrders}
						orderDueDates={orderDueDates}
						overrideDueDate={batchDueDate}
						onOverrideDueDateChange={(value) =>
							form.setValue("batchDueDate", value, {
								shouldDirty: true,
								shouldValidate: true,
							})
						}
					/>
					<Separator className="lg:hidden" />
					<Separator
						orientation="vertical"
						className="hidden h-full lg:block"
					/>
					<DispatchDriverPanel
						drivers={drivers}
						selectedDriverId={driverId}
						disabled={deliveryMode === "pickup"}
						onDriverChange={(value) =>
							form.setValue("driverId", value, {
								shouldDirty: true,
								shouldValidate: true,
							})
						}
						isLoading={employees.isLoading || driverWorkload.isLoading}
					/>
				</Card>
			</div>

			<DialogFooter className="grid grid-cols-2 items-center gap-2 border-t bg-background px-4 py-3 sm:flex sm:justify-end sm:space-x-0 sm:px-6 sm:py-4">
				<Button
					type="button"
					variant="outline"
					onClick={onCancel}
					className="w-full sm:w-auto"
				>
					Cancel
				</Button>
				<Button
					type="submit"
					className="w-full sm:w-auto"
					disabled={
						mutation.isPending ||
						assignmentAddressGuard.isChecking ||
						!form.formState.isValid ||
						selectedDetailsLoading ||
						salesIds.length === 0
					}
				>
					{mutation.isPending ? <Spinner /> : null}
					{salesIds.length > 1 ? "Create dispatches" : "Create dispatch"}
				</Button>
			</DialogFooter>
			</form>
			{assignmentAddressGuard.dialog}
		</>
	);
}

export function CreateDispatchDialog() {
	const { filters, setFilters } = useDispatchFilterParams();
	const open = filters.sheetMode === "create";
	const close = () =>
		setFilters({
			sheetMode: null,
			dispatchSalesId: null,
		});

	return (
		<CustomModal
			open={open}
			onOpenChange={(next) => !next && void close()}
			size="7xl"
			height="lg"
			title="Plan dispatch batch"
			description="Select orders and create dispatches."
			descriptionAsChild
			className="max-h-[94vh] gap-0 overflow-hidden p-0 [&>div:first-child]:border-b [&>div:first-child]:px-6 [&>div:first-child]:py-4 [&>div:first-child]:pr-12"
		>
			<DispatchFormContext salesId={filters.dispatchSalesId}>
				<CreateDispatchForm
					initialSalesId={filters.dispatchSalesId}
					onCreated={() => void close()}
					onCancel={() => void close()}
				/>
			</DispatchFormContext>
		</CustomModal>
	);
}
