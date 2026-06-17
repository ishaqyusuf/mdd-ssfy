"use client";

import { DatePicker } from "@/components/_v1/date-range-picker";
import { DispatchCompletionDecisionModal } from "@/components/dispatch-completion-decision-modal";
import { useAuth } from "@/hooks/use-auth";
import { useDriversList } from "@/hooks/use-data-list";
import { useSalesOverviewQuery } from "@/hooks/use-sales-overview-query";
import { useTaskTrigger } from "@/hooks/use-task-trigger";
import { getColorFromName } from "@/lib/color";
import { cn } from "@/lib/utils";
import { useTRPC } from "@/trpc/client";
import type { RouterOutputs } from "@api/trpc/routers/_app";
import { Checkbox } from "@gnd/ui/checkbox";
import { Menu } from "@gnd/ui/custom/menu";
import { Progress } from "@gnd/ui/custom/progress";
import TextWithTooltip from "@gnd/ui/custom/text-with-tooltip";
import { AlertDialog } from "@gnd/ui/namespace";
import { useMutation, useQueryClient } from "@gnd/ui/tanstack";
import { toast } from "@gnd/ui/use-toast";
import { salesDispatchStatus } from "@gnd/utils/constants";
import type { UpdateSalesControl } from "@sales/schema";
import type { ColumnDef } from "@tanstack/react-table";
import { useEffect, useState } from "react";

export type SalesDispatch = RouterOutputs["dispatch"]["index"]["data"][number];

type Column = ColumnDef<SalesDispatch>;
type DispatchStatus = NonNullable<SalesDispatch["status"]>;
type DateValue = string | number | Date | null | undefined;
type PackingTotal = {
	total?: number | string | null;
};
type PackingControl = {
	packed?: PackingTotal | null;
	pendingPacking?: PackingTotal | null;
};
type DispatchWithPacking = SalesDispatch & {
	control?: PackingControl | null;
	statistic?: PackingControl | null;
	order?: SalesDispatch["order"] & {
		control?: PackingControl | null;
	};
};

const selectColumn: Column = {
	id: "select",
	size: 50,
	minSize: 50,
	maxSize: 50,
	enableResizing: false,
	enableHiding: false,
	enableSorting: false,
	meta: {
		sticky: true,
		skeleton: { type: "checkbox" },
		className:
			"w-[50px] min-w-[50px] md:sticky md:left-0 bg-background group-hover:bg-[#F2F1EF] group-hover:dark:bg-secondary z-20",
	},
	cell: ({ row }) => (
		<Checkbox
			checked={row.getIsSelected()}
			onCheckedChange={(checked) => {
				if (checked === "indeterminate") {
					row.toggleSelected();
				} else {
					row.toggleSelected(checked);
				}
			}}
		/>
	),
};

function createScheduleColumn(driverMode = false): Column {
	return {
		id: "dueDate",
		header: "Schedule",
		accessorKey: "dueDate",
		size: 150,
		minSize: 130,
		maxSize: 210,
		enableResizing: true,
		meta: {
			skeleton: { type: "text", width: "w-24" },
			headerLabel: "Schedule",
			sortField: "dueDate",
			className: "w-[150px] min-w-[130px]",
		},
		cell: ({ row }) => (
			<ScheduleDateCell item={row.original} driverMode={driverMode} />
		),
	};
}

const orderIdColumn: Column = {
	id: "orderId",
	header: "Order",
	accessorFn: (row) => row.order?.orderId,
	size: 180,
	minSize: 150,
	maxSize: 260,
	enableResizing: true,
	meta: {
		sticky: true,
		skeleton: { type: "text", width: "w-24" },
		headerLabel: "Order",
		sortField: "orderId",
		className:
			"w-[180px] min-w-[150px] md:sticky md:left-[50px] bg-background group-hover:bg-[#F2F1EF] group-hover:dark:bg-secondary z-20",
	},
	cell: ({ row }) => (
		<div className="flex min-w-0 items-center gap-2 overflow-hidden">
			<span className="truncate font-mono text-sm font-medium uppercase">
				{row.original.order?.orderId || "-"}
			</span>
			{row.original.deliveryMode ? (
				<span className="shrink-0 rounded-full border px-1.5 py-0.5 text-[10px] font-medium uppercase text-muted-foreground">
					{row.original.deliveryMode}
				</span>
			) : null}
		</div>
	),
};

const orderDateColumn: Column = {
	id: "orderDate",
	header: "Order Date",
	accessorFn: (row) => row.order?.createdAt,
	size: 130,
	minSize: 110,
	maxSize: 180,
	enableResizing: true,
	meta: {
		skeleton: { type: "text", width: "w-20" },
		headerLabel: "Order date",
		sortField: "createdAt",
		className: "w-[130px] min-w-[110px]",
	},
	cell: ({ row }) => (
		<span className="truncate text-muted-foreground">
			{formatDate(row.original.order?.createdAt)}
		</span>
	),
};

const customerColumn: Column = {
	id: "customer",
	header: "Ship To",
	accessorFn: (row) => getCustomerName(row),
	size: 280,
	minSize: 200,
	maxSize: 420,
	enableResizing: true,
	meta: {
		skeleton: { type: "text", width: "w-40" },
		headerLabel: "Ship to",
		className: "w-[280px] min-w-[200px]",
	},
	cell: ({ row }) => {
		const customerName = getCustomerName(row.original);
		const phone = getCustomerPhone(row.original);

		return (
			<div className="min-w-0 space-y-1">
				<TextWithTooltip
					className="max-w-full truncate font-medium uppercase"
					text={customerName || "-"}
				/>
				<div className="truncate text-xs text-muted-foreground">
					{phone || "No phone"}
				</div>
			</div>
		);
	},
};

const assignedToColumn: Column = {
	id: "assignedTo",
	header: "Assigned To",
	accessorFn: (row) => row.driver?.name,
	size: 190,
	minSize: 150,
	maxSize: 280,
	enableResizing: true,
	meta: {
		skeleton: { type: "text", width: "w-28" },
		headerLabel: "Assigned to",
		sortField: "driverId",
		className: "w-[190px] min-w-[150px]",
	},
	cell: ({ row }) => <AssignedDriverCell item={row.original} />,
};

const progressColumn: Column = {
	id: "packingProgress",
	header: "Progress",
	accessorFn: (row) => getPackingTotals(row).packed,
	size: 150,
	minSize: 130,
	maxSize: 220,
	enableResizing: true,
	meta: {
		skeleton: { type: "text", width: "w-24" },
		headerLabel: "Progress",
		className: "w-[150px] min-w-[130px]",
	},
	cell: ({ row }) => <PackingProgressCell item={row.original} />,
};

const statusColumn: Column = {
	id: "status",
	header: "Status",
	accessorKey: "status",
	size: 150,
	minSize: 130,
	maxSize: 210,
	enableResizing: true,
	meta: {
		skeleton: { type: "badge", width: "w-24" },
		headerLabel: "Status",
		sortField: "status",
		className: "w-[150px] min-w-[130px]",
	},
	cell: ({ row }) => <DispatchStatusCell item={row.original} />,
};

const actionsColumn: Column = {
	id: "actions",
	header: "Actions",
	size: 92,
	minSize: 92,
	maxSize: 92,
	enableResizing: false,
	enableHiding: false,
	enableSorting: false,
	meta: {
		skeleton: { type: "icon" },
		headerLabel: "Actions",
		className:
			"w-[92px] min-w-[92px] md:sticky md:right-0 bg-background group-hover:bg-[#F2F1EF] group-hover:dark:bg-secondary z-20",
	},
	cell: ({ row }) => <DispatchActionsCell item={row.original} />,
};

function createColumns({ driverMode = false } = {}): Column[] {
	const baseColumns = [
		selectColumn,
		createScheduleColumn(driverMode),
		orderIdColumn,
		orderDateColumn,
		customerColumn,
	];

	if (!driverMode) {
		baseColumns.push(assignedToColumn);
	}

	return [...baseColumns, progressColumn, statusColumn, actionsColumn];
}

export const columns: Column[] = createColumns();
export const driverColumns: Column[] = createColumns({ driverMode: true });

export function getSalesDispatchColumns(driverMode = false) {
	return driverMode ? driverColumns : columns;
}

function ScheduleDateCell({
	item,
	driverMode,
}: {
	item: SalesDispatch;
	driverMode?: boolean;
}) {
	const [date, setDate] = useState<DateValue>(item.dueDate as DateValue);
	const trpc = useTRPC();
	const queryClient = useQueryClient();
	const dueDateUpdate = useMutation(
		trpc.dispatch.updateDispatchDueDate.mutationOptions({
			onSuccess() {
				toast({
					duration: 2000,
					variant: "success",
					description: "Dispatch due date updated",
					title: "Updated!",
				});
				queryClient.invalidateQueries({
					queryKey: trpc.dispatch.index.pathKey(),
				});
				queryClient.invalidateQueries({
					queryKey: trpc.dispatch.assignedDispatch.pathKey(),
				});
			},
			onError(error) {
				toast({
					duration: 3000,
					variant: "error",
					description: error.message || "Unable to update due date",
					title: "Update Failed",
				});
			},
		}),
	);

	useEffect(() => {
		setDate(item.dueDate);
	}, [item.dueDate]);

	if (driverMode) {
		return (
			<span className="truncate text-muted-foreground">
				{formatDateTime(date)}
			</span>
		);
	}

	return (
		<div className="relative z-10 w-32">
			<DatePicker
				placeholder="Not Set"
				hideIcon
				value={date}
				onSelect={(value) => {
					if (!value) return;
					const newDueDate = toDate(value);

					dueDateUpdate.mutate({
						dispatchId: item.id,
						oldDueDate: date ? toDate(date) : null,
						newDueDate,
					});
					setDate(newDueDate);
				}}
				variant="secondary"
				className="w-auto"
			/>
		</div>
	);
}

function AssignedDriverCell({ item }: { item: SalesDispatch }) {
	const trpc = useTRPC();
	const queryClient = useQueryClient();
	const drivers = useDriversList(true);
	const [selectedDriver, setSelectedDriver] = useState<
		(typeof drivers)[number] | null
	>(null);
	const [confirmOpen, setConfirmOpen] = useState(false);
	const updateDriver = useMutation(
		trpc.dispatch.updateDispatchDriver.mutationOptions({
			onSuccess() {
				toast({
					duration: 2000,
					variant: "success",
					description: "Dispatch assigned",
					title: "Updated!",
				});
				queryClient.invalidateQueries({
					queryKey: trpc.dispatch.index.pathKey(),
				});
				queryClient.invalidateQueries({
					queryKey: trpc.dispatch.assignedDispatch.pathKey(),
				});
			},
			onError(error) {
				toast({
					duration: 3000,
					variant: "error",
					description: error.message || "Unable to assign driver",
					title: "Update Failed",
				});
			},
		}),
	);

	const submitDriverUpdate = (driverId: number | null) => {
		const currentDriverId = (item.driver as { id?: number } | null)?.id ?? null;
		if (currentDriverId === driverId) return;

		updateDriver.mutate({
			dispatchId: item.id,
			oldDriverId: currentDriverId,
			newDriverId: driverId,
		});
	};

	return (
		<>
			<div className="relative z-10">
				<Menu
					Icon={null}
					variant={!item.driver?.name ? "secondary" : "link"}
					label={item.driver?.name || "Not Assigned"}
				>
					{drivers.length ? (
						drivers.map((driver) => (
							<Menu.Item
								onClick={(event) => {
									event.stopPropagation();

									if ((item.driver as { id?: number } | null)?.id) {
										setSelectedDriver(driver);
										setConfirmOpen(true);
										return;
									}

									submitDriverUpdate(driver.id);
								}}
								key={driver.id}
							>
								<span className="uppercase">{driver.name}</span>
							</Menu.Item>
						))
					) : (
						<Menu.Item disabled>No drivers found</Menu.Item>
					)}
				</Menu>
			</div>
			<AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
				<AlertDialog.Content>
					<AlertDialog.Header>
						<AlertDialog.Title>Reassign Dispatch Driver</AlertDialog.Title>
						<AlertDialog.Description>
							This dispatch already has an assigned driver. Do you want to
							proceed with reassignment?
						</AlertDialog.Description>
					</AlertDialog.Header>
					<AlertDialog.Footer>
						<AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
						<AlertDialog.Action
							onClick={() => {
								setConfirmOpen(false);
								submitDriverUpdate(selectedDriver?.id ?? null);
							}}
						>
							Proceed
						</AlertDialog.Action>
					</AlertDialog.Footer>
				</AlertDialog.Content>
			</AlertDialog>
		</>
	);
}

function PackingProgressCell({ item }: { item: SalesDispatch }) {
	const { packed, pending, total } = getPackingTotals(item);
	const ratio = total <= 0 ? 0 : packed / total;
	const colorClass =
		ratio >= 1
			? "text-green-600"
			: ratio > 0
				? "text-amber-600"
				: "text-muted-foreground";

	return (
		<div className="min-w-0">
			<div className={cn("truncate text-sm font-semibold", colorClass)}>
				{packed}/{total} packed
			</div>
			<div className={cn("truncate text-xs", colorClass)}>
				{Math.round(ratio * 100)}% ({pending} pending)
			</div>
		</div>
	);
}

function DispatchStatusCell({ item }: { item: SalesDispatch }) {
	const [status, setStatus] = useState(item.status);
	const [completionDialogOpen, setCompletionDialogOpen] = useState(false);
	const { packed, pending } = getPackingTotals(item);
	const hasPendingPackings = pending > 0;
	const trpc = useTRPC();
	const queryClient = useQueryClient();
	const auth = useAuth();

	const submitDispatch = useMutation(
		trpc.dispatch.submitDispatch.mutationOptions({
			onSuccess() {
				setStatus("completed" as DispatchStatus);
				toast({
					duration: 2000,
					variant: "success",
					description: "Dispatch completed",
					title: "Updated!",
				});
				queryClient.invalidateQueries({
					queryKey: trpc.dispatch.index.pathKey(),
				});
				queryClient.invalidateQueries({
					queryKey: trpc.dispatch.assignedDispatch.pathKey(),
				});
				queryClient.invalidateQueries({
					queryKey: trpc.dispatch.dispatchOverview.queryKey(),
				});
			},
			onError(error) {
				toast({
					duration: 3000,
					variant: "error",
					description: error.message || "Unable to complete dispatch",
					title: "Update Failed",
				});
			},
		}),
	);

	const completeDispatchPackedOnly = () => {
		submitDispatch.mutate({
			meta: {
				authorId: Number(auth.id || 0),
				authorName: auth.name || "System",
				salesId: Number(item.order?.id || 0),
			},
			submitDispatch: {
				dispatchId: item.id,
				receivedBy: auth.name || "System",
				receivedDate: new Date(),
			},
		});
	};

	const trigger = useTaskTrigger({
		onStarted() {
			queryClient.invalidateQueries({
				queryKey: trpc.dispatch.dispatchOverview.queryKey(),
			});
			setCompletionDialogOpen(false);
			completeDispatchPackedOnly();
		},
	});

	const statusUpdate = useMutation(
		trpc.dispatch.updateDispatchStatus.mutationOptions({
			onSuccess(data) {
				if (data?.newStatus) {
					setStatus(data.newStatus as DispatchStatus);
				}
				toast({
					duration: 2000,
					variant: "success",
					description: "Dispatch status updated",
					title: "Updated!",
				});
				queryClient.invalidateQueries({
					queryKey: trpc.dispatch.index.pathKey(),
				});
				queryClient.invalidateQueries({
					queryKey: trpc.dispatch.assignedDispatch.pathKey(),
				});
			},
			onError(error) {
				toast({
					duration: 3000,
					variant: "error",
					description: error.message || "Unable to update status",
					title: "Update Failed",
				});
			},
		}),
	);

	useEffect(() => {
		setStatus(item.status);
	}, [item.status]);

	const updateStatus = (newStatus: DispatchStatus) => {
		if (newStatus === status) return;

		statusUpdate.mutate({
			dispatchId: item.id,
			oldStatus: (status || "queue") as DispatchStatus,
			newStatus: (newStatus || "queue") as DispatchStatus,
		});
	};

	return (
		<>
			<div className="relative z-10">
				<Menu
					Icon={null}
					variant="link"
					label={
						<Progress>
							<Progress.Status>{status || "N/A"}</Progress.Status>
						</Progress>
					}
				>
					{salesDispatchStatus.map((nextStatus) => (
						<Menu.Item
							onClick={(event) => {
								event.stopPropagation();

								if (nextStatus === "completed") {
									if (hasPendingPackings) {
										setCompletionDialogOpen(true);
										return;
									}

									completeDispatchPackedOnly();
									return;
								}

								updateStatus(nextStatus as DispatchStatus);
							}}
							key={nextStatus}
						>
							<div
								className="size-2"
								style={{
									backgroundColor: getColorFromName(nextStatus),
								}}
							/>
							<span className="uppercase">{nextStatus}</span>
						</Menu.Item>
					))}
				</Menu>
			</div>
			<DispatchCompletionDecisionModal
				open={completionDialogOpen}
				onOpenChange={setCompletionDialogOpen}
				packedCount={packed}
				pendingCount={pending}
				isLoading={trigger.isActionPending || submitDispatch.isPending}
				onCompletePacked={() => {
					setCompletionDialogOpen(false);
					completeDispatchPackedOnly();
				}}
				onPackAllComplete={() => {
					const packItems: UpdateSalesControl["packItems"] = {
						dispatchId: item.id,
						packMode: "all",
						dispatchStatus: "completed",
						replaceExisting: true,
					};

					trigger.trigger({
						taskName: "update-sales-control",
						payload: {
							meta: {
								authorId: Number(auth.id || 0),
								authorName: auth.name || "System",
								salesId: Number(item.order?.id || 0),
							},
							packItems,
						} as UpdateSalesControl,
					});
				}}
			/>
		</>
	);
}

function DispatchActionsCell({ item }: { item: SalesDispatch }) {
	const overviewQuery = useSalesOverviewQuery();

	return (
		<div className="relative z-10 flex justify-end">
			<Menu variant="ghost" triggerSize="sm">
				<Menu.Item
					icon="packingList"
					onClick={(event) => {
						event.stopPropagation();
						overviewQuery.openDispatch(item.order?.orderId, item.id, "packing");
					}}
				>
					Packing
				</Menu.Item>
				<Menu.Item
					icon="production"
					onClick={(event) => {
						event.stopPropagation();
						overviewQuery.openDispatch(
							item.order?.orderId,
							item.id,
							"production",
						);
					}}
				>
					Production
				</Menu.Item>
			</Menu>
		</div>
	);
}

function getCustomerName(item: SalesDispatch) {
	return (
		item.order?.shippingAddress?.name ||
		item.order?.customer?.businessName ||
		item.order?.customer?.name ||
		""
	);
}

function getCustomerPhone(item: SalesDispatch) {
	return item.order?.shippingAddress?.phoneNo || item.order?.customer?.phoneNo;
}

function getPackingTotals(item: SalesDispatch) {
	const source = item as DispatchWithPacking;
	const packed = Number(
		source.order?.control?.packed?.total ||
			source.control?.packed?.total ||
			source.statistic?.packed?.total ||
			0,
	);
	const pending = Number(
		source.order?.control?.pendingPacking?.total ||
			source.control?.pendingPacking?.total ||
			source.statistic?.pendingPacking?.total ||
			0,
	);

	return {
		packed,
		pending,
		total: packed + pending,
	};
}

function toDate(value: DateValue) {
	if (value instanceof Date) return value;
	return new Date(value ?? "");
}

function formatDate(value: unknown) {
	if (!value) return "Not set";

	const date = new Date(value as string | number | Date);
	if (Number.isNaN(date.getTime())) return String(value);

	return date.toLocaleDateString("en-US", {
		month: "short",
		day: "numeric",
		year: "numeric",
	});
}

function formatDateTime(value: unknown) {
	if (!value) return "Date not set";

	const date = new Date(value as string | number | Date);
	if (Number.isNaN(date.getTime())) return String(value);

	return date.toLocaleString("en-US", {
		month: "short",
		day: "numeric",
		hour: "numeric",
		minute: "2-digit",
		hour12: true,
	});
}
