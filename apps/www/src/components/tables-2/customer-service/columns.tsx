"use client";

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

const appointmentColumn: Column = {
	id: "appointment",
	header: "Appointment",
	accessorFn: (row) => row.scheduleDate,
	size: 180,
	minSize: 150,
	maxSize: 240,
	enableResizing: true,
	enableHiding: false,
	meta: {
		sticky: true,
		skeleton: { type: "text", width: "w-28" },
		headerLabel: "Appointment",
		sortField: "scheduleDate",
		className:
			"w-[180px] min-w-[150px] md:sticky md:left-[50px] bg-background group-hover:bg-[#F2F1EF] group-hover:dark:bg-secondary z-20",
	},
	cell: ({ row }) => (
		<div className="min-w-0 space-y-1">
			<p className="font-medium">{formatDate(row.original.scheduleDate)}</p>
			<p className="text-xs text-muted-foreground">
				{row.original.scheduleTime || "No time set"}
			</p>
		</div>
	),
};

const customerColumn: Column = {
	id: "customer",
	header: "Customer",
	accessorFn: (row) => row.homeOwner,
	size: 220,
	minSize: 180,
	maxSize: 320,
	enableResizing: true,
	meta: {
		skeleton: { type: "text", width: "w-36" },
		headerLabel: "Customer",
		className: "w-[220px] min-w-[180px]",
	},
	cell: ({ row }) => (
		<div className="min-w-0 space-y-1">
			<TextWithTooltip
				className="max-w-full truncate font-semibold"
				text={row.original.homeOwner || "No homeowner"}
			/>
			<p className="truncate text-xs text-muted-foreground">
				{row.original.homePhone || "No phone"}
			</p>
		</div>
	),
};

const descriptionColumn: Column = {
	id: "description",
	header: "Description",
	accessorFn: (row) => row.description,
	size: 320,
	minSize: 240,
	maxSize: 520,
	enableResizing: true,
	meta: {
		skeleton: { type: "text", width: "w-48" },
		headerLabel: "Description",
		className: "w-[320px] min-w-[240px]",
	},
	cell: ({ row }) => (
		<div className="min-w-0 space-y-1">
			<TextWithTooltip
				className="max-w-full truncate font-medium"
				text={row.original.projectName || "No project"}
			/>
			<TextWithTooltip
				className="max-w-full truncate text-sm text-muted-foreground"
				text={row.original.description || "No description provided"}
			/>
		</div>
	),
};

const assignedToColumn: Column = {
	id: "assignedTo",
	header: "Assigned To",
	accessorFn: (row) => row.tech?.name,
	size: 190,
	minSize: 160,
	maxSize: 260,
	enableResizing: true,
	meta: {
		preventDefault: true,
		skeleton: { type: "button", width: "w-28" },
		headerLabel: "Assigned To",
		className: "w-[190px] min-w-[160px]",
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
	size: 150,
	minSize: 130,
	maxSize: 200,
	enableResizing: true,
	meta: {
		preventDefault: true,
		skeleton: { type: "badge" },
		headerLabel: "Status",
		className: "w-[150px] min-w-[130px]",
	},
	cell: ({ row }) => <StatusCell item={row.original} />,
};

const actionsColumn: Column = {
	id: "actions",
	header: "",
	size: 100,
	minSize: 88,
	maxSize: 120,
	enableResizing: false,
	enableHiding: false,
	meta: {
		actionCell: true,
		preventDefault: true,
		headerLabel: "Actions",
		skeleton: { type: "button", width: "w-16" },
		className: "w-[100px] min-w-[88px]",
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
		<div className="relative z-10 flex justify-end gap-2">
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
