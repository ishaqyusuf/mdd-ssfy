import type { RouterOutputs } from "@api/trpc/routers/_app";
import { Menu } from "@gnd/ui/custom/menu";

import { _qc, _trpc } from "@/components/static-trpc";
import { useCustomerServiceParams } from "@/hooks/use-customer-service-params";
import { getColorFromName } from "@/lib/color";
import { labelIdOptions } from "@/lib/utils";
import { Button } from "@gnd/ui/button";
import { cn } from "@gnd/ui/cn";
import { ComboboxDropdown } from "@gnd/ui/combobox-dropdown";
import { ConfirmBtn } from "@gnd/ui/confirm-button";
import { Progress } from "@gnd/ui/custom/progress";
import TextWithTooltip from "@gnd/ui/custom/text-with-tooltip";
import { useTable } from "@gnd/ui/data-table";
import { cells } from "@gnd/ui/data-table/cells";
import { Icons } from "@gnd/ui/icons";
import { Item as TableItem } from "@gnd/ui/namespace";
import { formatDate } from "@gnd/utils/dayjs";
import { useMutation } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { useMemo } from "react";
type Item =
	RouterOutputs["customerService"]["getCustomerServices"]["data"][number];
interface ItemProps {
	item: Item;
}
interface TableExtra {
	employees: RouterOutputs["hrm"]["getEmployees"]["data"];
}
type Column = ColumnDef<Item>;

export const columns: Column[] = [
	cells.selectColumn,
	{
		header: "Appointment",
		accessorKey: "Appointment",
		meta: {
			// preventDefault: true,
			className: "w-[150px]",
		},
		cell: ({ row: { original: item } }) => (
			<>
				<TableItem.Title>{formatDate(item.scheduleDate)}</TableItem.Title>
				<TableItem.Description>{item.scheduleTime}</TableItem.Description>
			</>
		),
	},
	{
		header: "Customer",
		accessorKey: "Customer",
		meta: {
			// preventDefault: true,
			className: "w-[150px]",
		},
		cell: ({ row: { original: item } }) => (
			<>
				<TextWithTooltip
					className="max-w-[150px] font-semibold"
					text={item.homeOwner}
				/>
				{/* <Item.Title>{item.homeOwner}</Item.Title> */}
				<TableItem.Description>{item.homePhone}</TableItem.Description>
			</>
		),
	},
	{
		header: "Description",
		accessorKey: "Description",
		meta: {
			// preventDefault: true,
			className: "",
		},
		cell: ({ row: { original: item } }) => (
			<>
				<TableItem.Title>{item.projectName}</TableItem.Title>

				<TextWithTooltip
					className="max-w-[200px] text-secondary-foreground"
					text={item.description}
				/>
			</>
		),
	},
	{
		header: "Assigned To",
		accessorKey: "Assigned To",
		meta: {
			preventDefault: true,
			className: "w-[150px]",
		},
		cell: ({ row: { original: item } }) => <AssignedTo item={item} />,
	},
	{
		header: "Status",
		accessorKey: "Status",
		meta: {
			preventDefault: true,
			className: "",
		},
		cell: ({ row: { original: item } }) => {
			const { mutate: updateStatus } = useMutation(
				_trpc.customerService.updateWorkOrderStatus.mutationOptions({
					onSuccess(data, variables, onMutateResult, context) {
						_qc.invalidateQueries({
							queryKey:
								_trpc.customerService.getCustomerServices.infiniteQueryKey(),
						});
					},
					onError(error, variables, onMutateResult, context) {},
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
				<>
					<Menu
						Icon={null}
						label={
							<Progress>
								<Progress.Status>{item.status}</Progress.Status>
							</Progress>
						}
					>
						{["Pending", "Scheduled", "Incomplete", "Completed"]?.map((e) => (
							<Menu.Item
								Icon={() => (
									<span
										className="size-2"
										style={{
											backgroundColor: getColorFromName(e),
										}}
									/>
								)}
								onClick={(_e) =>
									updateStatus({
										status: e,
										id: item.id,
									})
								}
								className="cursor-pointer hover:bg-accent"
								key={e}
							>
								{e}
							</Menu.Item>
						))}
					</Menu>
				</>
			);
		},
	},
	{
		header: "",
		accessorKey: "action",
		meta: {
			actionCell: true,
			preventDefault: true,
			className: "dt-action-cell",
		},
		cell: ({ row: { original: item } }) => (
			<>
				<Actions item={item} />
			</>
		),
	},
];
function AssignedTo({ item }: ItemProps) {
	const ctx = useTable();
	const extras: TableExtra = ctx.tableMeta.extras;
	const list = extras.employees;
	const selected = useMemo(() => {
		const _selected = list?.find?.((t) => t.id === item.tech?.id);
		return labelIdOptions([_selected], "name", "id")?.[0];
	}, [list, item?.tech]);

	const { mutate: assign } = useMutation(
		_trpc.customerService.assignWorkOrder.mutationOptions({
			onSuccess(data, variables, onMutateResult, context) {
				_qc.invalidateQueries({
					queryKey:
						_trpc.customerService.getCustomerServices.infiniteQueryKey(),
				});
			},
			onError(error, variables, onMutateResult, context) {},
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
			items={labelIdOptions(list, "name", "id")}
			popoverProps={{
				className: cn("!w-auto"),
			}}
			placeholder="Assign"
			listClassName="max-w-auto"
			// disabled
			// renderSelectedItem={(selectedItem) => (
			//     <>
			//         <Item.Title>{selectedItem?.label}</Item.Title>
			//     </>
			// )}
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
function Actions({ item }: ItemProps) {
	const { setParams } = useCustomerServiceParams();
	const { mutateAsync: deleteWorkOrder } = useMutation(
		_trpc.customerService.deleteWorkOrder.mutationOptions({
			onSuccess(data, variables, onMutateResult, context) {
				_qc.invalidateQueries({
					queryKey: _trpc.customerService.getCustomerServices.infiniteQueryKey(
						{},
					),
				});
			},
			onError(error, variables, onMutateResult, context) {},
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
		<div className="relative flex gap-2 justify-end z-10">
			<Button
				variant="outline"
				className="flex h-8 w-8 p-0"
				onClick={() => {
					setParams({
						openCustomerServiceId: item.id,
					});
				}}
			>
				<Icons.Edit className="size-4" />
				<span className="sr-only">Delete</span>
			</Button>
			<ConfirmBtn
				onClick={async (e) => {
					await deleteWorkOrder({
						id: item.id,
					});
				}}
				trash
				variant="outline"
				className="px-2"
				size="sm"
			/>
			{/* <Menu
                triggerSize={isMobile ? "default" : "xs"}
                Trigger={
                    <Button
                        className={cn(isMobile || "size-4 p-0")}
                        variant="ghost"
                    >
                        <Icons.MoreHoriz className="" />
                    </Button>
                }
            >
                <Menu.Item SubMenu={<></>}>Mark as</Menu.Item>
            </Menu> */}
		</div>
	);
}
export const mobileColumn: ColumnDef<Item>[] = [
	{
		header: "",
		accessorKey: "row",
		meta: {
			className: "flex-1 p-0",
			// preventDefault: true,
		},
		cell: ({ row: { original: item } }) => {
			return <ItemCard item={item} />;
		},
	},
];
function ItemCard({ item }: ItemProps) {
	const { setParams } = useCustomerServiceParams();

	return (
		<div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
			<div className="flex items-start gap-3">
				<button
					type="button"
					className="min-w-0 flex-1 text-left"
					onClick={() => {
						setParams({
							openCustomerServiceId: item.id,
						});
					}}
				>
					<div className="flex items-center gap-2">
						<div className="rounded-xl bg-amber-50 p-2 text-amber-700">
							<Icons.CalendarDays className="size-4" />
						</div>
						<div className="min-w-0">
							<p className="truncate text-base font-semibold text-slate-900">
								{item.homeOwner}
							</p>
							<p className="truncate text-sm text-slate-600">
								{formatDate(item.scheduleDate)} ·{" "}
								{item.scheduleTime || "No time set"}
							</p>
						</div>
					</div>
				</button>

				<div className="shrink-0">
					<Actions item={item} />
				</div>
			</div>

			<div className="mt-4 rounded-2xl bg-slate-50 px-3 py-3">
				<p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
					Work order
				</p>
				<p className="mt-1 text-sm font-semibold text-slate-900">
					{item.projectName || "No project name"}
				</p>
				<p className="mt-1 text-xs text-muted-foreground">
					{item.description || "No description provided"}
				</p>
			</div>

			<div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
				<div className="rounded-2xl border border-slate-200 px-3 py-3">
					<div className="flex items-center gap-2 text-slate-700">
						<Icons.UserRound className="size-4" />
						<p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
							Customer
						</p>
					</div>
					<p className="mt-2 text-sm font-semibold text-slate-900">
						{item.homeOwner}
					</p>
					<p className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground">
						<Icons.Phone className="size-3.5" />
						{item.homePhone || "No phone number"}
					</p>
				</div>

				<div className="rounded-2xl border border-slate-200 px-3 py-3">
					<div className="flex items-center gap-2 text-slate-700">
						<Icons.Wrench className="size-4" />
						<p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
							Technician
						</p>
					</div>
					<p className="mt-2 text-sm font-semibold text-slate-900">
						{item.tech?.name || "Not assigned"}
					</p>
					<div className="mt-2">
						<Progress>
							<Progress.Status>{item.status}</Progress.Status>
						</Progress>
					</div>
				</div>
			</div>

			<Button
				type="button"
				className="mt-4 w-full"
				variant="outline"
				onClick={() => {
					setParams({
						openCustomerServiceId: item.id,
					});
				}}
			>
				Open Work Order
			</Button>
		</div>
	);
}
