"use client";

import {
	formatSalesTaxCalendarDate,
	getInitialSalesTaxReportMonth,
	getSalesTaxReportStartDate,
	isSelectableSalesTaxReportEndDate,
} from "@/lib/sales-tax-report-date";
import {
	downloadSalesExcelWorkbook,
	isSalesWorkbookReport,
} from "@/lib/sales-workbook-export";
import { useTRPC } from "@/trpc/client";
import type { RouterInputs } from "@api/trpc/routers/_app";
import { Button } from "@gnd/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@gnd/ui/dialog";
import { Icons } from "@gnd/ui/icons";
import { useQueryClient } from "@gnd/ui/tanstack";
import { toast } from "@gnd/ui/use-toast";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useState } from "react";

const Calendar = dynamic(
	() => import("@gnd/ui/calendar").then((module) => module.Calendar),
	{
		loading: () => (
			<div className="h-[300px] w-[300px] animate-pulse rounded-lg bg-muted" />
		),
	},
);

function displayDate(date: Date) {
	return new Intl.DateTimeFormat("en-US", {
		month: "short",
		day: "numeric",
		year: "numeric",
	}).format(date);
}

export function SalesTaxReportDialog({
	open,
	onOpenChange,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}) {
	const trpc = useTRPC();
	const queryClient = useQueryClient();
	const [calendarMonth, setCalendarMonth] = useState(() =>
		getInitialSalesTaxReportMonth(),
	);
	const [selectedTo, setSelectedTo] = useState<Date>();
	const [isGenerating, setIsGenerating] = useState(false);
	const from = getSalesTaxReportStartDate(selectedTo || calendarMonth);
	const resetDates = useCallback(() => {
		setCalendarMonth(getInitialSalesTaxReportMonth());
		setSelectedTo(undefined);
	}, []);
	const handleOpenChange = (nextOpen: boolean) => {
		if (!nextOpen) resetDates();
		onOpenChange(nextOpen);
	};

	useEffect(() => {
		if (!open) return;
		resetDates();
	}, [open, resetDates]);

	async function generateReport() {
		if (!selectedTo || isGenerating) return;
		setIsGenerating(true);
		toast({ variant: "spinner", title: "Preparing sales tax report..." });
		try {
			const input = {
				to: formatSalesTaxCalendarDate(selectedTo),
			} satisfies RouterInputs["salesDashboard"]["salesTaxReport"];
			const report = await queryClient.fetchQuery(
				trpc.salesDashboard.salesTaxReport.queryOptions(input),
			);
			if (!isSalesWorkbookReport(report) || report.type !== "sales-tax") {
				throw new Error("The sales tax report response is invalid.");
			}
			if (report.rowCount === 0) {
				toast({
					variant: "error",
					title: "No report rows",
					description: "No sales orders match the selected month period.",
				});
				return;
			}
			await downloadSalesExcelWorkbook(report);
			toast({
				title: "Excel report downloaded",
				description: `${report.rowCount.toLocaleString()} order${report.rowCount === 1 ? "" : "s"} included.`,
			});
			handleOpenChange(false);
		} catch (error) {
			console.error(error);
			toast({
				variant: "error",
				title: "Unable to generate sales tax report",
				description:
					error instanceof Error ? error.message : "Please try again.",
			});
		} finally {
			setIsGenerating(false);
		}
	}

	return (
		<Dialog open={open} onOpenChange={handleOpenChange}>
			<DialogContent className="max-w-[min(96vw,420px)] gap-0 overflow-hidden p-0">
				<DialogHeader className="border-b bg-muted/20 px-5 py-4">
					<DialogTitle>Sales Tax Report</DialogTitle>
					<DialogDescription>
						Report starts on the first day of the selected month. Choose an end
						date from the 25th through month-end.
					</DialogDescription>
				</DialogHeader>
				<div className="space-y-4 px-5 py-4">
					<dl className="grid grid-cols-2 gap-3">
						<div className="rounded-md border bg-muted/20 px-3 py-2">
							<dt className="text-xs text-muted-foreground">From</dt>
							<dd className="mt-1 text-sm font-medium">{displayDate(from)}</dd>
						</div>
						<div className="rounded-md border bg-muted/20 px-3 py-2">
							<dt className="text-xs text-muted-foreground">To</dt>
							<dd className="mt-1 text-sm font-medium">
								{selectedTo ? displayDate(selectedTo) : "Select a date"}
							</dd>
						</div>
					</dl>
					<div className="flex justify-center rounded-md border">
						<Calendar
							mode="single"
							month={calendarMonth}
							selected={selectedTo}
							onMonthChange={(month) => {
								setCalendarMonth(getSalesTaxReportStartDate(month));
								setSelectedTo(undefined);
							}}
							onSelect={setSelectedTo}
							disabled={(date) => !isSelectableSalesTaxReportEndDate(date)}
							showOutsideDays={false}
							initialFocus
						/>
					</div>
				</div>
				<DialogFooter className="border-t px-5 py-4">
					<Button
						type="button"
						variant="outline"
						disabled={isGenerating}
						onClick={() => handleOpenChange(false)}
					>
						Cancel
					</Button>
					<Button
						type="button"
						disabled={!selectedTo || isGenerating}
						onClick={() => void generateReport()}
					>
						{isGenerating ? (
							<Icons.Loader2 className="size-4 animate-spin" />
						) : (
							<Icons.Export className="size-4" />
						)}
						{isGenerating ? "Generating" : "Generate Excel"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
