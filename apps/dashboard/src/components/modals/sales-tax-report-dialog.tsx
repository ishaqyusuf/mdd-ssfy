"use client";

import {
	formatSalesTaxCalendarDate,
	getDefaultSalesTaxReportRange,
	isSelectableSalesTaxReportDate,
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
import { useMediaQuery } from "@gnd/ui/hooks";
import { Icons } from "@gnd/ui/icons";
import { useQueryClient } from "@gnd/ui/tanstack";
import { toast } from "@gnd/ui/use-toast";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useState } from "react";
import type { DateRange } from "react-day-picker";

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
	const isWideCalendar = useMediaQuery("(min-width: 768px)");
	const [selectedRange, setSelectedRange] = useState<DateRange>(() =>
		getDefaultSalesTaxReportRange(),
	);
	const [isGenerating, setIsGenerating] = useState(false);
	const resetDates = useCallback(() => {
		setSelectedRange(getDefaultSalesTaxReportRange());
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
		if (!selectedRange.from || !selectedRange.to || isGenerating) return;
		setIsGenerating(true);
		toast({ variant: "spinner", title: "Preparing sales tax report..." });
		try {
			const input = {
				from: formatSalesTaxCalendarDate(selectedRange.from),
				to: formatSalesTaxCalendarDate(selectedRange.to),
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
					description:
						"No fully paid sales orders match the selected date range.",
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
			<DialogContent className="max-h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] max-w-[44rem] gap-0 overflow-hidden p-0">
				<DialogHeader className="border-b bg-muted/20 px-5 py-4">
					<DialogTitle>Sales Tax Report</DialogTitle>
					<DialogDescription>
						Choose any non-future date range. Only fully paid orders are
						included.
					</DialogDescription>
				</DialogHeader>
				<div className="min-h-0 space-y-4 overflow-y-auto px-4 py-4 sm:px-5">
					<dl className="grid grid-cols-2 gap-3">
						<div className="rounded-md border bg-muted/20 px-3 py-2">
							<dt className="text-xs text-muted-foreground">From</dt>
							<dd className="mt-1 text-sm font-medium">
								{selectedRange.from
									? displayDate(selectedRange.from)
									: "Select a date"}
							</dd>
						</div>
						<div className="rounded-md border bg-muted/20 px-3 py-2">
							<dt className="text-xs text-muted-foreground">To</dt>
							<dd className="mt-1 text-sm font-medium">
								{selectedRange.to
									? displayDate(selectedRange.to)
									: "Select a date"}
							</dd>
						</div>
					</dl>
					<div className="flex min-w-0 justify-center overflow-hidden rounded-md border">
						<Calendar
							key={isWideCalendar ? "wide" : "narrow"}
							mode="range"
							defaultMonth={
								isWideCalendar && selectedRange.to
									? new Date(
											selectedRange.to.getFullYear(),
											selectedRange.to.getMonth() - 1,
											1,
										)
									: selectedRange.to
							}
							selected={selectedRange}
							onSelect={(range) => {
								if (range) setSelectedRange(range);
							}}
							disabled={(date) => !isSelectableSalesTaxReportDate(date)}
							numberOfMonths={isWideCalendar ? 2 : 1}
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
						disabled={!selectedRange.from || !selectedRange.to || isGenerating}
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
