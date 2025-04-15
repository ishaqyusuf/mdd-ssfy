"use client";

import * as React from "react";
import { useDataSkeleton } from "@/hooks/use-data-skeleton";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { ControllerProps, FieldPath, FieldValues } from "react-hook-form";

import { Button } from "@gnd/ui/button";
import { Calendar } from "@gnd/ui/calendar";
import {
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@gnd/ui/form";
import { Popover, PopoverContent, PopoverTrigger } from "@gnd/ui/popover";
import { Skeleton } from "@gnd/ui/skeleton";

interface Props<T> {
    label?: string;
    placeholder?: string;
    description?: string;
    className?: string;
    // suffix?: string;
    // type?: string;
    list?: boolean;
    size?: "sm" | "default" | "xs";
    prefix?: string;
    // defaultValue?:boolean
}
export function DatePicker<
    TFieldValues extends FieldValues = FieldValues,
    TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
    TOptionType = any,
>({
    label,
    placeholder,
    size,
    description,
    ...props
}: Partial<ControllerProps<TFieldValues, TName>> & Props<TOptionType>) {
    // const [date, setDate] = React.useState<Date>();
    const [opened, setOpened] = React.useState(false);
    const load = useDataSkeleton();
    return (
        <FormField
            {...(props as any)}
            render={({ field }) => (
                <FormItem className="flex flex-col">
                    {label && <FormLabel>{label}</FormLabel>}
                    <Popover open={opened} onOpenChange={setOpened}>
                        <PopoverTrigger asChild>
                            <FormControl>
                                {load?.loading ? (
                                    <>
                                        <Skeleton className="h-8 w-full" />
                                    </>
                                ) : (
                                    <Button
                                        variant={"outline"}
                                        className={cn(
                                            "pl-3 text-left font-normal",
                                            !field.value &&
                                                "text-muted-foreground",
                                            size == "sm" && "h-8",
                                        )}
                                    >
                                        {field.value ? (
                                            format(field.value, "PPP")
                                        ) : (
                                            <span>
                                                {placeholder || "Pick a date"}
                                            </span>
                                        )}
                                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                    </Button>
                                )}
                            </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                                mode="single"
                                selected={field.value}
                                onSelect={(e) => {
                                    field.onChange(e);
                                    setTimeout(() => {
                                        setOpened(false);
                                    }, 100);
                                }}
                                // disabled={(date) =>
                                //     date > new Date() ||
                                //     date < new Date("1900-01-01")
                                // }
                                initialFocus
                            />
                        </PopoverContent>
                    </Popover>
                    {description && (
                        <FormDescription>{description}</FormDescription>
                    )}
                    <FormMessage />
                </FormItem>
            )}
        />
    );
}
