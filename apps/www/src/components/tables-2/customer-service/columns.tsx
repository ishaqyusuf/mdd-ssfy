"use client";

import { sizeClass, sizes } from "@/components/tables-2/core/table-sizes";
import { useCustomerServiceParams } from "@/hooks/use-customer-service-params";
import { getColorFromName } from "@/lib/color";
import { labelIdOptions } from "@/lib/utils";
import { useTRPC } from "@/trpc/client";
import type { RouterOutputs } from "@api/trpc/routers/_app";
import { Button } from "@gnd/ui/button";
import { Checkbox } from "@gnd/ui/checkbox";
import { cn } from "@gnd/ui/cn";
import { ComboboxDropdown } from "@gnd/ui/combobox-dropdown";
import { ConfirmBtn } from "@gnd/ui/confirm-button";
import { Menu } from "@gnd/ui/custom/menu";
import { Progress } from "@gnd/ui/custom/progress";
import TextWithTooltip from "@gnd/ui/custom/text-with-tooltip";
import { Icons } from "@gnd/ui/icons";
import { Item as TableItem } from "@gnd/ui/namespace";
import { formatDate } from "@gnd/utils/dayjs";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { useMemo } from "react";

export type CustomerServiceRow =
	RouterOutputs["customerService"]["getCustomerServices"]["data"][number];

export type CustomerServiceEmployeeList =
	RouterOutputs["hrm"]["getEmployees"]["data"];

type Column = ColumnDef<CustomerServiceRow>;

type TableMeta = {
	employees?: CustomerServiceEmployeeList;
};

export function getCustomerServiceRowId(item: CustomerServiceRow) {
	return String(item.id);
}

const selectColumn: Column = {
	id: "select",
	...sizes.custom(50, 50),
	enableResizing: false,
	enableHiding: false,
	enableSorting: false,
	meta: {
		sticky: true,
		skeleton: { type: "checkbox" },
		className: sizeClass(
			sizes.custom(50, 50),
			"md:sticky md:left-0 bg-background group-hover:bg-[#F2F1EF] group-hover:dark:bg-secondary z-20 justify-center",
		),
		contentClassName: "flex items-center justify-center",
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

const appointmentColumn: Column = {
	id: "appointment",
	header: "Appointment",
	accessorFn: (row) => row.scheduleDate,
	...sizes.custom(132, 210, 154),
	enableResizing: true,
	enableHiding: false,
	meta: {
		sticky: true,
		skeleton: { type: "text", width: "w-28" },
		headerLabel: "Appointment",
		sortField: "scheduleDate",
		className: sizeClass(
			sizes.custom(132, 210, 154),
			"md:sticky md:left-[50px] bg-background group-hover:bg-[#F2F1EF] group-hover:dark:bg-secondary z-20",
		),
	},
	cell: ({ row }) => (
		<div className="min-w-0 space-y-0.5">
			<p className="truncate font-medium">{formatDate(row.original.scheduleDate)}</p>
			<p className="truncate text-[11px] text-muted-foreground">
				{row.original.scheduleTime || "No time set"}
			</p>
		</div>
	),
};

const customerColumn: Column = {
	id: "customer",
	header: "Customer",
	accessorFn: (row) => row.homeOwner,
	...sizes.custom(160, 280, 190),
	enableResizing: true,
	meta: {
		skeleton: { type: "text", width: "w-36" },
		headerLabel: "Customer",
		className: sizeClass(sizes.custom(160, 280, 190)),
	},
	cell: ({ row }) => (
		<div className="min-w-0 space-y-0.5">
			<TextWithTooltip
				className="max-w-full truncate font-semibold"
				text={row.original.homeOwner || "No homeowner"}
			/>
			<p className="truncate text-[11px] text-muted-foreground">
				{row.original.homePhone || "No phone"}
			</p>
		</div>
	),
};

const descriptionColumn: Column = {
	id: "description",
	header: "Description",
	accessorFn: (row) => row.description,
	...sizes.custom(220, 420, 260),
	enableResizing: true,
	meta: {
		skeleton: { type: "text", width: "w-48" },
		headerLabel: "Description",
		className: sizeClass(sizes.custom(220, 420, 260)),
	},
	cell: ({ row }) => (
		<div className="min-w-0 space-y-0.5">
			<TextWithTooltip
				className="max-w-full truncate font-medium"
				text={row.original.projectName || "No project"}
			/>
			<TextWithTooltip
				className="max-w-full truncate text-xs text-muted-foreground"
				text={row.original.description || "No description provided"}
			/>
		</div>
	),
};

const assignedToColumn: Column = {
	id: "assignedTo",
	header: "Assigned To",
	accessorFn: (row) => row.tech?.name,
	...sizes.custom(140, 220, 160),
	enableResizing: true,
	meta: {
		preventDefault: true,
		skeleton: { type: "button", width: "w-28" },
		headerLabel: "Assigned To",
		className: sizeClass(sizes.custom(140, 220, 160)),
	},
	cell: ({ row, table }) => {
		const meta = table.options.meta as TableMeta | undefined;

		return <AssignedTo item={row.original} employees={meta?.employees ?? []} />;
	},
};

const statusColumn: Column = {
	id: "status",
	header: "Status",
	accessorFn: (row) => row.status,
	...sizes.custom(112, 170, 128),
	enableResizing: true,
	meta: {
		preventDefault: true,
		skeleton: { type: "badge" },
		headerLabel: "Status",
		className: sizeClass(sizes.custom(112, 170, 128)),
	},
	cell: ({ row }) => <StatusCell item={row.original} />,
};

const actionsColumn: Column = {
	id: "actions",
	header: "",
	...sizes.custom(88, 112, 96),
	enableResizing: false,
	enableHiding: false,
	meta: {
		actionCell: true,
		preventDefault: true,
		headerLabel: "Actions",
		skeleton: { type: "button", width: "w-16" },
		className: sizeClass(sizes.custom(88, 112, 96)),
	},
	cell: ({ row }) => <Actions item={row.original} />,
};

function StatusCell({ item }: { item: CustomerServiceRow }) {
	const trpc = useTRPC();
	const queryClient = useQueryClient();
	const { mutate: updateStatus } = useMutation(
		trpc.customerService.updateWorkOrderStatus.mutationOptions({
			onSuccess() {
				queryClient.invalidateQueries({
					queryKey: trpc.customerService.getCustomerServices.infiniteQueryKey(),
				});
			},
			meta: {
				toastTitle: {
					error: "Unable to complete",
					loading: "Processing...",
					success: "Done!.",
				},
			},
		}),
	);

	return (
		<Menu
			Icon={null}
			label={
				<Progress>
					<Progress.Status>{item.status}</Progress.Status>
				</Progress>
			}
		>
			{["Pending", "Scheduled", "Incomplete", "Completed"].map((status) => (
				<Menu.Item
					Icon={() => (
						<span
							className="size-2"
							style={{
								backgroundColor: getColorFromName(status),
							}}
						/>
					)}
					onClick={() =>
						updateStatus({
							status,
							id: item.id,
						})
					}
					className="cursor-pointer hover:bg-accent"
					key={status}
				>
					{status}
				</Menu.Item>
			))}
		</Menu>
	);
}

function AssignedTo({
	item,
	employees,
}: {
	item: CustomerServiceRow;
	employees: CustomerServiceEmployeeList;
}) {
	const trpc = useTRPC();
	const queryClient = useQueryClient();
	const selected = useMemo(() => {
		const selectedEmployee = employees?.find?.(
			(employee) => employee.id === item.tech?.id,
		);
		return labelIdOptions([selectedEmployee], "name", "id")?.[0];
	}, [employees, item.tech]);

	const { mutate: assign } = useMutation(
		trpc.customerService.assignWorkOrder.mutationOptions({
			onSuccess() {
				queryClient.invalidateQueries({
					queryKey: trpc.customerService.getCustomerServices.infiniteQueryKey(),
				});
			},
			meta: {
				toastTitle: {
					error: "Unable to complete",
					loading: "Processing...",
					success: "Done!.",
				},
			},
		}),
	);

	return (
		<ComboboxDropdown
			selectedItem={selected}
			onSelect={(data) => {
				assign({
					userId: data.data.id,
					woId: item.id,
				});
			}}
			items={labelIdOptions(employees, "name", "id")}
			popoverProps={{
				className: cn("!w-auto"),
			}}
			placeholder="Assign"
			Trigger={
				<Button
					type="button"
					variant="outline"
					className="h-8 min-w-0 justify-between gap-2 px-2 text-xs"
				>
					<span className="truncate">{selected?.label || "Assign"}</span>
					<Icons.ChevronsUpDown className="size-3.5 shrink-0 opacity-50" />
				</Button>
			}
			listClassName="max-w-auto"
			renderListItem={({ item }) => (
				<TableItem size="xs">
					<TableItem.Media>
						<Icons.CheckIcon
							className={cn(
								"size-4",
								item?.id !== selected?.id && "text-transparent",
							)}
						/>
					</TableItem.Media>
					<TableItem.Content>
						<TableItem.Title className="whitespace-nowrap">
							{item?.label}
						</TableItem.Title>
					</TableItem.Content>
				</TableItem>
			)}
		/>
	);
}

function Actions({ item }: { item: CustomerServiceRow }) {
	const trpc = useTRPC();
	const queryClient = useQueryClient();
	const { setParams } = useCustomerServiceParams();
	const { mutateAsync: deleteWorkOrder } = useMutation(
		trpc.customerService.deleteWorkOrder.mutationOptions({
			onSuccess() {
				queryClient.invalidateQueries({
					queryKey: trpc.customerService.getCustomerServices.infiniteQueryKey(
						{},
					),
				});
			},
			meta: {
				toastTitle: {
					error: "Unable to complete",
					loading: "Processing...",
					success: "Done!.",
				},
			},
		}),
	);

	return (
		<div className="relative z-10 flex justify-end gap-1.5">
			<Button
				variant="outline"
				className="flex size-8 p-0"
				onClick={(event) => {
					event.stopPropagation();
					setParams({
						openCustomerServiceId: item.id,
					});
				}}
			>
				<Icons.Edit className="size-4" />
				<span className="sr-only">Edit</span>
			</Button>
			<ConfirmBtn
				onClick={async (event) => {
					event.stopPropagation();
					await deleteWorkOrder({
						id: item.id,
					});
				}}
				trash
				variant="outline"
				className="px-2"
				size="sm"
			/>
		</div>
	);
}

export const columns: Column[] = [
	selectColumn,
	appointmentColumn,
	customerColumn,
	descriptionColumn,
	assignedToColumn,
	statusColumn,
	actionsColumn,
];
