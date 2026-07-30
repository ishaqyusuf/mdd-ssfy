"use client";

import {
	formatSalesDashboardDateParam,
	getSalesDashboardPeriodOptions,
	parseSalesDashboardDateParam,
	useSalesDashboardParams,
} from "@/hooks/use-sales-dashboard-params";
import { Button } from "@gnd/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@gnd/ui/popover";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@gnd/ui/select";
import { formatDateRange } from "little-date";
import { CalendarDays } from "lucide-react";
import dynamic from "next/dynamic";
import { useMemo } from "react";
import type { DateRange } from "react-day-picker";

const Calendar = dynamic(
	() => import("@gnd/ui/calendar").then((module) => module.Calendar),
	{
		loading: () => (
			<div className="h-[300px] w-[300px] animate-pulse rounded-lg bg-muted" />
		),
	},
);

export function SalesReportingPeriodControl() {
	const { params, setParams } = useSalesDashboardParams();
	const periods = useMemo(() => getSalesDashboardPeriodOptions(), []);
	const selectedRange = {
		from: parseSalesDashboardDateParam(params.from),
		to: parseSalesDashboardDateParam(params.to),
	};

	function updateRange(range: DateRange | undefined, period = "custom") {
		if (!range?.from) return;
		setParams({
			from: formatSalesDashboardDateParam(range.from),
			to: formatSalesDashboardDateParam(range.to || range.from),
			period,
		});
	}

	return (
		<div className="flex flex-col gap-2 sm:flex-row sm:items-center">
			<Select
				value={params.period}
				onValueChange={(value) => {
					const period = periods.find((option) => option.value === value);
					if (period) updateRange(period.range, period.value);
				}}
			>
				<SelectTrigger className="h-9 w-full bg-background sm:w-[160px]">
					<SelectValue placeholder="Select period" />
				</SelectTrigger>
				<SelectContent>
					{periods.map((period) => (
						<SelectItem key={period.value} value={period.value}>
							{period.label}
						</SelectItem>
					))}
					{params.period === "custom" ? (
						<SelectItem value="custom">Custom range</SelectItem>
					) : null}
				</SelectContent>
			</Select>
			<Popover>
				<PopoverTrigger asChild>
					<Button
						type="button"
						variant="outline"
						className="h-9 justify-start gap-2 bg-background font-normal"
					>
						<CalendarDays className="size-4 text-muted-foreground" />
						<span className="truncate">
							{selectedRange.from && selectedRange.to
								? formatDateRange(selectedRange.from, selectedRange.to, {
										includeTime: false,
									})
								: "Select date range"}
						</span>
					</Button>
				</PopoverTrigger>
				<PopoverContent align="end" className="w-auto p-0">
					<Calendar
						mode="range"
						defaultMonth={selectedRange.from}
						selected={selectedRange}
						onSelect={(range) => updateRange(range)}
						numberOfMonths={1}
						toDate={new Date()}
						initialFocus
					/>
				</PopoverContent>
			</Popover>
		</div>
	);
}
