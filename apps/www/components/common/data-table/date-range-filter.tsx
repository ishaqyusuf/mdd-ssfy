"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { CalendarIcon } from "@radix-ui/react-icons";
import { addDays, format } from "date-fns";
import type { DateRange } from "react-day-picker";

import { Button } from "@gnd/ui/button";
import { Calendar } from "@gnd/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@gnd/ui/popover";

interface DateRangePickerProps
    extends React.ComponentPropsWithoutRef<typeof PopoverContent> {
    dateRange?: DateRange;
    dayCount?: number;
}

export function DateRangePicker({
    dateRange,
    dayCount,
    className,
    ...props
}: DateRangePickerProps) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const [from, to] = React.useMemo(() => {
        let fromDay: Date | undefined;
        let toDay: Date | undefined;

        if (dateRange) {
            fromDay = dateRange.from;
            toDay = dateRange.to;
        } else if (dayCount) {
            toDay = new Date();
            fromDay = addDays(toDay, -dayCount);
        }

        return [fromDay, toDay];
    }, [dateRange, dayCount]);

    const [date, setDate] = React.useState<DateRange | undefined>({ from, to });

    // Create query string
    const createQueryString = React.useCallback(
        (params: Record<string, string | number | null>) => {
            const newSearchParams = new URLSearchParams(
                searchParams?.toString(),
            );

            for (const [key, value] of Object.entries(params)) {
                if (value === null) {
                    newSearchParams.delete(key);
                } else {
                    newSearchParams.set(key, String(value));
                }
            }

            return newSearchParams.toString();
        },
        [searchParams],
    );

    // Update query string
    React.useEffect(() => {
        router.push(
            `${pathname}?${createQueryString({
                from: date?.from ? format(date.from, "yyyy-MM-dd") : null,
                to: date?.to ? format(date.to, "yyyy-MM-dd") : null,
            })}`,
            {
                scroll: false,
            },
        );
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [date?.from, date?.to]);

    return (
        <div className="grid gap-2">
            <Popover>
                <PopoverTrigger asChild>
                    <Button
                        id="date"
                        variant={"outline"}
                        className={cn(
                            "xs:w-[300px] w-full justify-start truncate text-left font-normal",
                            !date && "text-muted-foreground",
                        )}
                    >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {date?.from ? (
                            date.to ? (
                                <>
                                    {format(date.from, "LLL dd, y")} -{" "}
                                    {format(date.to, "LLL dd, y")}
                                </>
                            ) : (
                                format(date.from, "LLL dd, y")
                            )
                        ) : (
                            <span>Pick a date</span>
                        )}
                    </Button>
                </PopoverTrigger>
                <PopoverContent
                    className={cn("w-auto p-0", className)}
                    {...props}
                >
                    <Calendar
                        initialFocus
                        mode="range"
                        defaultMonth={date?.from}
                        selected={date}
                        onSelect={setDate}
                        numberOfMonths={2}
                    />
                </PopoverContent>
            </Popover>
        </div>
    );
}

