"use client";

import { batchEditProductionOrdersAction } from "@/actions/batch-edit-production-orders";
import { useLoadingToast } from "@/hooks/use-loading-toast";
import { useTRPC } from "@/trpc/client";
import { Button } from "@gnd/ui/button";
import { Calendar } from "@gnd/ui/calendar";
import { Checkbox } from "@gnd/ui/checkbox";
import { Icons } from "@gnd/ui/icons";
import { Label } from "@gnd/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@gnd/ui/popover";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@gnd/ui/select";
import { useQuery, useQueryClient } from "@gnd/ui/tanstack";
import { createProductionDueDate } from "@sales/production-date";
import { format } from "date-fns";
import { useAction } from "next-safe-action/hooks";
import { useMemo, useState } from "react";

const ASSIGNEE_UNCHANGED = "unchanged";
const ASSIGNEE_UNASSIGNED = "unassigned";

export function BatchProductionEdit({
	salesIds,
	onSuccess,
}: {
	salesIds: number[];
	onSuccess: () => void;
}) {
	const trpc = useTRPC();
	const queryClient = useQueryClient();
	const loading = useLoadingToast();
	const [open, setOpen] = useState(false);
	const [datePickerOpen, setDatePickerOpen] = useState(false);
	const [assignee, setAssignee] = useState(ASSIGNEE_UNCHANGED);
	const [dueDate, setDueDate] = useState<Date>();
	const [clearDueDate, setClearDueDate] = useState(false);
	const employeeFilters = useQuery(
		trpc.filters.salesProductions.queryOptions(undefined, {
			enabled: open,
			refetchOnWindowFocus: false,
			staleTime: 60 * 1000,
		}),
	);
	const assigneeOptions = useMemo(
		() =>
			employeeFilters.data?.find((filter) => filter.value === "assignedToId")
				?.options || [],
		[employeeFilters.data],
	);
	const hasChanges =
		assignee !== ASSIGNEE_UNCHANGED || Boolean(dueDate) || clearDueDate;
	const editAction = useAction(batchEditProductionOrdersAction, {
		onExecute: () => loading.loading("Updating production assignments..."),
		onSuccess: async () => {
			loading.success("Production assignments updated");
			setOpen(false);
			setAssignee(ASSIGNEE_UNCHANGED);
			setDueDate(undefined);
			setClearDueDate(false);
			onSuccess();
			await Promise.all([
				queryClient.invalidateQueries({
					queryKey: trpc.sales.productions.pathKey(),
				}),
				queryClient.invalidateQueries({
					queryKey: trpc.sales.productionTasks.pathKey(),
				}),
				queryClient.invalidateQueries({
					queryKey: trpc.sales.productionSummary.pathKey(),
				}),
				queryClient.invalidateQueries({
					queryKey: trpc.sales.productionDashboard.pathKey(),
				}),
				queryClient.invalidateQueries({
					queryKey: trpc.sales.productionDashboardTasks.pathKey(),
				}),
				queryClient.invalidateQueries({
					queryKey: trpc.sales.productionCalendar.pathKey(),
				}),
				queryClient.invalidateQueries({
					queryKey: trpc.sales.productionCalendarTasks.pathKey(),
				}),
			]);
		},
		onError: ({ error }) => {
			loading.error(
				error.serverError || "Unable to update production assignments",
			);
		},
	});

	const applyChanges = () => {
		if (!hasChanges || !salesIds.length) return;
		editAction.execute({
			salesIds,
			assignedToId:
				assignee === ASSIGNEE_UNCHANGED
					? undefined
					: assignee === ASSIGNEE_UNASSIGNED
						? null
						: Number(assignee),
			dueDate: clearDueDate
				? null
				: dueDate
					? createProductionDueDate({
							year: dueDate.getFullYear(),
							month: dueDate.getMonth() + 1,
							day: dueDate.getDate(),
						})
					: undefined,
		});
	};

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>
				<Button
					variant="ghost"
					className="whitespace-nowrap"
					disabled={!salesIds.length}
				>
					<Icons.Edit className="mr-2 size-4" />
					Edit production
				</Button>
			</PopoverTrigger>
			<PopoverContent
				align="end"
				className="w-[calc(100vw-2rem)] max-w-sm space-y-4 p-4"
			>
				<div>
					<p className="font-semibold">Edit selected production</p>
					<p className="mt-1 text-xs text-muted-foreground">
						Updates active assignments across {salesIds.length} selected order
						{salesIds.length === 1 ? "" : "s"}. Assigning a worker also creates
						any remaining unassigned production work.
					</p>
				</div>
				<div className="grid gap-2">
					<Label htmlFor="batch-production-assignee">Assign to</Label>
					<Select value={assignee} onValueChange={setAssignee}>
						<SelectTrigger id="batch-production-assignee">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value={ASSIGNEE_UNCHANGED}>Keep current</SelectItem>
							<SelectItem value={ASSIGNEE_UNASSIGNED}>Unassigned</SelectItem>
							{assigneeOptions.map((option) => (
								<SelectItem
									key={String(option.value)}
									value={String(option.value)}
								>
									{option.label}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>
				<div className="grid gap-2">
					<Label htmlFor="batch-production-due-date">Production due date</Label>
					<Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
						<PopoverTrigger asChild>
							<Button
								id="batch-production-due-date"
								type="button"
								variant="outline"
								disabled={clearDueDate}
								className="justify-start text-left font-normal"
							>
								<Icons.CalendarIcon className="mr-2 size-4 opacity-60" />
								{dueDate ? (
									format(dueDate, "MMM d, yyyy")
								) : (
									<span className="text-muted-foreground">Pick a date</span>
								)}
							</Button>
						</PopoverTrigger>
						<PopoverContent className="w-auto p-0" align="start">
							<Calendar
								mode="single"
								selected={dueDate}
								onSelect={(date) => {
									setDueDate(date);
									if (date) setDatePickerOpen(false);
								}}
								initialFocus
							/>
						</PopoverContent>
					</Popover>
					<label
						htmlFor="batch-production-clear-due-date"
						className="flex min-h-8 cursor-pointer items-center gap-2 text-xs text-muted-foreground"
					>
						<Checkbox
							id="batch-production-clear-due-date"
							checked={clearDueDate}
							onCheckedChange={(checked) => {
								setClearDueDate(checked === true);
								if (checked) setDueDate(undefined);
							}}
						/>
						Clear the current due date
					</label>
				</div>
				<div className="flex justify-end gap-2">
					<Button variant="ghost" onClick={() => setOpen(false)}>
						Cancel
					</Button>
					<Button
						disabled={!hasChanges || editAction.isExecuting}
						onClick={applyChanges}
					>
						Apply changes
					</Button>
				</div>
			</PopoverContent>
		</Popover>
	);
}
