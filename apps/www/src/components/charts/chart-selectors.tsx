
"use client";

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
import type { DateRange } from "react-day-picker";
import { ChevronDown } from 'lucide-react';

export function ChartSelectors() {
  const { params, setParams } = useSalesDashboardParams();

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
    <div className="flex justify-between mt-6 space-x-2">
      <div className="flex space-x-2">
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
          <SelectTrigger className="flex-1 space-x-1 font-medium">
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

      <div className="flex space-x-2">
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="justify-start text-left font-medium space-x-2"
            >
              <span className="line-clamp-1 text-ellipsis">
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
              <ChevronDown />
            </Button>
          </PopoverTrigger>
          <PopoverContent
            className="w-screen md:w-[550px] p-0 flex-col flex space-y-4"
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
              numberOfMonths={2}
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
