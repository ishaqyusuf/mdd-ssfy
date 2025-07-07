"use client";

import { useCallback, useEffect, useState } from "react";
import { DateFormats, formatDate } from "@/lib/use-day";
import { cn } from "@/lib/utils";
import { CalendarIcon } from "@radix-ui/react-icons";
import { DateRange } from "react-day-picker";

import { Button } from "@gnd/ui/button";
import { Calendar, CalendarProps } from "@gnd/ui/calendar";

import { Menu } from "../(clean-code)/menu";

interface Props {
    range?: boolean;
    hideIcon?: boolean;
    value?: any;
    setValue?: any;
    format?: DateFormats;
    placeholder?;
}
export function DatePicker({
    className,
    value,
    range,
    setValue,
    hideIcon,
    format = "YYYY-MM-DD",
    placeholder = "Pick a date",
    ...calendarProps
}: CalendarProps & Props) {
    const [date, setDate] = useState<DateRange | undefined | Date>();

    // value
    //     ? typeof value == "string"
    //         ? new Date(value)
    //         : value
    //     : range
    //     ? { form: null, to: null }
    //     : null
    useEffect(() => {
        setDate(
            value
                ? typeof value == "string"
                    ? new Date(value)
                    : value
                : range
                  ? { form: null, to: null }
                  : null,
        );
    }, [value, range]);
    // const [date, setDate] = React.useState<DateRange | undefined>({
    //   from: new Date(2023, 0, 20),
    //   to: addDays(new Date(2023, 0, 20), 20),
    // });
    function from() {
        if (!range) return null;
        return (date as any).from;
    }
    function to() {
        if (!range) return null;
        return (date as any).from;
    }

    function _date() {
        if (range) return null;
        return date as any;
    }
    function __format(d) {
        return formatDate(d, format);
    }
    // React.useEffect(() => {
    //   console.log(value);
    // }, []);
    const [open, setOpen] = useState(false);
    const openChanged = useCallback(
        (e) => {
            console.log(e);

            setOpen(e);
        },
        [open],
    );
    return (
        <div className={cn("grid gap-2")}>
            <Menu
                noSize
                open={open}
                onOpenChanged={openChanged}
                Trigger={
                    <Button
                        id="date"
                        variant={"outline"}
                        disabled={!!calendarProps.disabled}
                        className={cn(
                            "w-[260px] justify-start text-left font-normal",
                            !date && "text-muted-foreground",
                            className,
                        )}
                    >
                        {!hideIcon && <CalendarIcon className="mr-2 h-4 w-4" />}
                        {range &&
                            (from() ? (
                                to() ? (
                                    <>
                                        {__format(from())} - {__format(to())}
                                    </>
                                ) : (
                                    __format(from())
                                )
                            ) : (
                                <span className="whitespace-nowrap">
                                    {placeholder}
                                </span>
                            ))}
                        {!range &&
                            (!date ? (
                                <span className="whitespace-nowrap">
                                    {placeholder}
                                </span>
                            ) : (
                                __format(_date())
                            ))}
                    </Button>
                }
            >
                <div className="">
                    <Calendar
                        {...(calendarProps as any)}
                        initialFocus
                        mode={(range ? "range" : "single") as any}
                        defaultMonth={range ? from() : date}
                        selected={date}
                        onSelect={(v) => {
                            setDate(v);
                            setValue?.(v);
                            setOpen(false);
                        }}
                        numberOfMonths={range ? 2 : 1}
                    />
                </div>
                {/* <PopoverContent className="w-auto z-10 p-0" align="end"> */}
                {/* </PopoverContent> */}
            </Menu>
        </div>
    );
}
