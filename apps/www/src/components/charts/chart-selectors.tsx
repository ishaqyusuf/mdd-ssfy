"use client";

import { Icons } from "@gnd/ui/icons";

import {
	chartPeriodOptions,
	useSalesDashboardParams,
} from "@/hooks/use-sales-dashboard-params";
import { Button } from "@gnd/ui/button";
import { Calendar } from "@gnd/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@gnd/ui/popover";
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@gnd/ui/select";
import { formatISO } from "date-fns";
import { formatDateRange } from "little-date";
import { useEffect, useState } from "react";
import type { DateRange } from "react-day-picker";

export function ChartSelectors() {
	const { params, setParams } = useSalesDashboardParams();
	const [isWideCalendar, setIsWideCalendar] = useState(false);

	useEffect(() => {
		const query = window.matchMedia("(min-width: 768px)");
		const handleChange = () => setIsWideCalendar(query.matches);

		handleChange();
		query.addEventListener("change", handleChange);
		return () => query.removeEventListener("change", handleChange);
	}, []);

	const handleChangePeriod = (
		range: DateRange | undefined,
		period?: string,
	) => {
		const newRange = {
			from: range?.from
				? formatISO(range.from, { representation: "date" })
				: params.from,
			to: range?.to
				? formatISO(range.to, { representation: "date" })
				: params.to,
			period: period || params.period,
		};
		setParams(newRange);
	};

	const handleCalendarSelect = (selectedRange: DateRange | undefined) => {
		handleChangePeriod(selectedRange);
	};

	return (
		<div className="mt-4 flex flex-col gap-2 sm:mt-6 sm:flex-row sm:items-center sm:justify-between">
			<div className="flex min-w-0">
				<Select
					defaultValue={params.chart}
					onValueChange={(value) => {
						if (value) {
							setParams({
								...params,
								chart: value as NonNullable<typeof params.chart>,
							});
						}
					}}
				>
					<SelectTrigger className="w-full min-w-0 space-x-1 font-medium sm:w-[140px]">
						<span>Revenue</span>
					</SelectTrigger>
					<SelectContent>
						<SelectGroup>
							<SelectItem value="revenue">Revenue</SelectItem>
							{/* Add more chart types here */}
						</SelectGroup>
					</SelectContent>
				</Select>
			</div>

			<div className="flex min-w-0">
				<Popover>
					<PopoverTrigger asChild>
						<Button
							variant="outline"
							className="w-full min-w-0 justify-start gap-2 text-left font-medium sm:w-auto"
						>
							<span className="min-w-0 flex-1 truncate">
								{params.from && params.to
									? formatDateRange(
											new Date(params.from),
											new Date(params.to),
											{
												includeTime: false,
											},
										)
									: "Select date range"}
							</span>
							<Icons.ChevronDown className="size-4 shrink-0" />
						</Button>
					</PopoverTrigger>
					<PopoverContent
						className="flex w-[calc(100vw-1.5rem)] max-w-[550px] flex-col space-y-4 p-0"
						align="end"
						sideOffset={10}
					>
						<div className="p-4 pb-0">
							<Select
								value={params.period ?? undefined}
								onValueChange={(value) =>
									handleChangePeriod(
										chartPeriodOptions.find((p) => p.value === value)?.range,
										value,
									)
								}
							>
								<SelectTrigger className="w-full">
									<SelectValue placeholder="Select a period" />
								</SelectTrigger>
								<SelectContent>
									<SelectGroup>
										{chartPeriodOptions.map((period) => (
											<SelectItem key={period.value} value={period.value}>
												{period.label}
											</SelectItem>
										))}
									</SelectGroup>
								</SelectContent>
							</Select>
						</div>

						<Calendar
							mode="range"
							numberOfMonths={isWideCalendar ? 2 : 1}
							selected={{
								from: params.from ? new Date(params.from) : undefined,
								to: params.to ? new Date(params.to) : undefined,
							}}
							defaultMonth={
								params.from
									? new Date(params.from)
									: new Date(new Date().setMonth(new Date().getMonth() - 1))
							}
							initialFocus
							toDate={new Date()}
							onSelect={handleCalendarSelect}
						/>
					</PopoverContent>
				</Popover>
			</div>
		</div>
	);
}
