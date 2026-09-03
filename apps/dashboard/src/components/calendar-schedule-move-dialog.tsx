"use client";

import { Button } from "@gnd/ui/button";
import { Calendar } from "@gnd/ui/calendar";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@gnd/ui/dialog";
import { Icons } from "@gnd/ui/icons";
import { Popover, PopoverContent, PopoverTrigger } from "@gnd/ui/popover";
import { format } from "date-fns";
import { useEffect, useState } from "react";

export type CalendarScheduleMoveProposal = {
	kind: "production" | "fulfillment";
	orderNo: string;
	customer: string;
	sourceDate: string | null;
	targetDate: string;
	affectedRecordCount: number;
};

function todayBusinessDate() {
	return format(new Date(), "yyyy-MM-dd");
}

function fromBusinessDate(value: string) {
	if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
	const [year, month, day] = value.split("-").map(Number);
	const date = new Date(year, month - 1, day);
	if (
		Number.isNaN(date.getTime()) ||
		date.getFullYear() !== year ||
		date.getMonth() !== month - 1 ||
		date.getDate() !== day
	) {
		return undefined;
	}
	return date;
}

function formatBusinessDate(value: string | null) {
	if (!value) return "Unscheduled";
	const date = fromBusinessDate(value);
	return date ? format(date, "MMM d, yyyy") : value;
}

export function CalendarScheduleMoveDialog({
	proposal,
	pending,
	onClose,
	onConfirm,
}: {
	proposal: CalendarScheduleMoveProposal | null;
	pending: boolean;
	onClose: () => void;
	onConfirm: (targetDate: string) => void;
}) {
	const [targetDate, setTargetDate] = useState("");
	const [datePickerOpen, setDatePickerOpen] = useState(false);
	useEffect(() => {
		setTargetDate(proposal?.targetDate || "");
		setDatePickerOpen(false);
	}, [proposal]);
	const sameDate = Boolean(proposal && proposal.sourceDate === targetDate);
	const pastDate = Boolean(targetDate && targetDate < todayBusinessDate());
	const selectedDate = fromBusinessDate(targetDate);

	return (
		<Dialog
			open={Boolean(proposal)}
			onOpenChange={(open) => !open && onClose()}
		>
			<DialogContent className="max-w-lg">
				<DialogHeader>
					<DialogTitle>Confirm schedule move</DialogTitle>
					<DialogDescription>
						Review the exact date-owned work before saving. No status,
						assignment, quantity, inventory, packing, payment, or accounting
						fact will change.
					</DialogDescription>
				</DialogHeader>
				{proposal ? (
					<div className="space-y-4 text-sm">
						<div className="rounded-md border bg-muted/30 p-3">
							<p className="font-mono font-semibold">{proposal.orderNo}</p>
							<p className="text-muted-foreground">{proposal.customer}</p>
							<p className="mt-2 text-xs text-muted-foreground">
								{proposal.affectedRecordCount}{" "}
								{proposal.kind === "production"
									? "production assignment"
									: "fulfillment record"}
								{proposal.affectedRecordCount === 1 ? "" : "s"} affected
							</p>
						</div>
						<div className="grid gap-3 sm:grid-cols-2">
							<div className="grid gap-1.5">
								<span className="text-xs font-medium text-muted-foreground">
									Current date
								</span>
								<div
									id="schedule-current-date"
									className="flex h-9 items-center rounded-md border bg-muted px-3 text-muted-foreground"
								>
									{formatBusinessDate(proposal.sourceDate)}
								</div>
							</div>
							<div className="grid gap-1.5">
								<span className="text-xs font-medium text-muted-foreground">
									New date
								</span>
								<Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
									<PopoverTrigger asChild>
										<Button
											id="schedule-target-date"
											type="button"
											variant="outline"
											className="justify-start text-left font-normal"
											autoFocus
											aria-label="New schedule date"
										>
											<Icons.Calendar aria-hidden="true" />
											{targetDate
												? formatBusinessDate(targetDate)
												: "Pick a date"}
										</Button>
									</PopoverTrigger>
									<PopoverContent className="w-auto p-0" align="start">
										<Calendar
											mode="single"
											aria-label="New schedule date"
											defaultMonth={selectedDate}
											selected={selectedDate}
											onSelect={(date) => {
												setTargetDate(date ? format(date, "yyyy-MM-dd") : "");
												if (date) setDatePickerOpen(false);
											}}
											initialFocus
										/>
									</PopoverContent>
								</Popover>
							</div>
						</div>
						{pastDate ? (
							<p
								role="alert"
								className="rounded-md border border-amber-300 bg-amber-50 p-3 text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100"
							>
								This moves active work into the past. Confirm only if that date
								is operationally correct.
							</p>
						) : null}
						{sameDate ? (
							<p className="text-xs text-muted-foreground">
								Choose a different date to continue.
							</p>
						) : null}
					</div>
				) : null}
				<DialogFooter>
					<Button
						type="button"
						variant="outline"
						onClick={onClose}
						disabled={pending}
					>
						Cancel
					</Button>
					<Button
						type="button"
						onClick={() => onConfirm(targetDate)}
						disabled={pending || !targetDate || sameDate}
					>
						{pending ? "Moving…" : "Confirm move"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
