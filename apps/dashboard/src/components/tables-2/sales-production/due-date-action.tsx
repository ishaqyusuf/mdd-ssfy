"use client";

import { batchEditProductionOrdersAction } from "@/actions/batch-edit-production-orders";
import { useAuth } from "@/hooks/use-auth";
import { publishQueryEvent } from "@/lib/query-events";
import { useTRPC } from "@/trpc/client";
import { Button } from "@gnd/ui/button";
import { Calendar } from "@gnd/ui/calendar";
import { Icons } from "@gnd/ui/icons";
import { Popover, PopoverContent, PopoverTrigger } from "@gnd/ui/popover";
import { useQueryClient } from "@gnd/ui/tanstack";
import { toast } from "@gnd/ui/use-toast";
import {
	createProductionDueDate,
	getProductionDueDatePresentation,
	productionCalendarPartsFromLocalDate,
} from "@sales/production-date";
import { useAction } from "next-safe-action/hooks";
import { useRef, useState } from "react";

export function ProductionDueDateAction({
	salesId,
	orderNo,
	dueDate,
	completed,
}: {
	salesId: number;
	orderNo: string;
	dueDate: Date | string | null | undefined;
	completed: boolean;
}) {
	if (
		completed ||
		getProductionDueDatePresentation(dueDate).bucket !== "past-due"
	)
		return null;
	return (
		<DueDateEditor
			salesId={salesId}
			orderNo={orderNo}
			dueDate={new Date(dueDate!)}
		/>
	);
}

function DueDateEditor({
	salesId,
	orderNo,
	dueDate,
}: {
	salesId: number;
	orderNo: string;
	dueDate: Date;
}) {
	const auth = useAuth();
	const trpc = useTRPC();
	const queryClient = useQueryClient();
	const action = useAction(batchEditProductionOrdersAction);
	const [open, setOpen] = useState(false);
	const [selected, setSelected] = useState<Date>();
	const [pending, setPending] = useState(false);
	const [error, setError] = useState<string>();
	const saving = useRef(false);
	const current = new Date(
		dueDate.getUTCFullYear(),
		dueDate.getUTCMonth(),
		dueDate.getUTCDate(),
	);
	const unchanged = !selected || selected.getTime() === current.getTime();

	async function save() {
		if (!selected || unchanged || saving.current) return;
		saving.current = true;
		setPending(true);
		setError(undefined);
		try {
			const result = await action.executeAsync({
				salesIds: [salesId],
				dueDate: createProductionDueDate(
					productionCalendarPartsFromLocalDate(selected),
				),
			});
			if (!result?.data || result.serverError || result.validationErrors) {
				throw new Error(
					result?.serverError ||
						"The due date could not be updated. Try again.",
				);
			}
			if (!result.data.assignmentsUpdated) {
				throw new Error(
					"No active assignments were updated. Refresh the order to check its current status.",
				);
			}
			setOpen(false);
			toast({ title: "Production due date updated." });
			try {
				await Promise.all([
					queryClient.invalidateQueries(
						{ queryKey: trpc.sales.productions.pathKey() },
						{ throwOnError: true },
					),
					queryClient.invalidateQueries(
						{ queryKey: trpc.sales.productionTasks.pathKey() },
						{ throwOnError: true },
					),
					queryClient.invalidateQueries(
						{ queryKey: trpc.sales.productionSummary.pathKey() },
						{ throwOnError: true },
					),
					queryClient.invalidateQueries(
						{ queryKey: trpc.sales.productionCalendar.pathKey() },
						{ throwOnError: true },
					),
					queryClient.invalidateQueries(
						{ queryKey: trpc.sales.productionCalendarTasks.pathKey() },
						{ throwOnError: true },
					),
					publishQueryEvent("sales.pipeline.changed", {
						sales: [{ salesId, orderNo, salesType: "order" }],
					}),
				]);
			} catch {
				toast({
					title: "Date saved. Refresh the list to see the latest schedule.",
				});
			}
		} catch (cause) {
			setError(
				cause instanceof Error
					? cause.message
					: "Unable to update the due date.",
			);
		} finally {
			saving.current = false;
			setPending(false);
		}
	}

	if (!auth.can?.editProduction) return null;
	return (
		<Popover
			open={open}
			onOpenChange={(value) => {
				if (saving.current) return;
				setOpen(value);
				if (value) {
					setSelected(current);
					setError(undefined);
				}
			}}
		>
			<PopoverTrigger asChild>
				<Button
					type="button"
					variant="ghost"
					size="icon"
					className="size-8 shrink-0 text-destructive"
					aria-label={`Change due date for ${orderNo}`}
					title="Change due date"
					onClick={(event) => event.stopPropagation()}
					onPointerDown={(event) => event.stopPropagation()}
				>
					<Icons.Calendar className="size-4" aria-hidden="true" />
				</Button>
			</PopoverTrigger>
			<PopoverContent
				align="start"
				collisionPadding={16}
				className="w-auto max-w-[calc(100vw-2rem)] max-h-[calc(100dvh-2rem)] overflow-y-auto p-3"
				onClick={(event) => event.stopPropagation()}
				onPointerDown={(event) => event.stopPropagation()}
			>
				<p className="text-sm font-medium">Due date · {orderNo}</p>
				<p className="max-w-64 text-xs text-muted-foreground">
					Updates this order’s active production assignments.
				</p>
				<Calendar
					mode="single"
					selected={selected}
					defaultMonth={current}
					onSelect={setSelected}
					disabled={pending}
					initialFocus
				/>
				{error ? (
					<p role="alert" className="max-w-64 text-sm text-destructive">
						{error}
					</p>
				) : null}
				<div className="flex justify-end gap-2 pt-2">
					<Button
						type="button"
						variant="outline"
						disabled={pending}
						onClick={() => setOpen(false)}
					>
						Cancel
					</Button>
					<Button
						type="button"
						disabled={pending || unchanged}
						onClick={() => void save()}
					>
						{pending ? "Saving…" : "Save date"}
					</Button>
				</div>
			</PopoverContent>
		</Popover>
	);
}
