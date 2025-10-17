import { InputHTMLAttributes, useState } from "react";
import { useDataSkeleton } from "@/hooks/use-data-skeleton";
import { cn } from "@/lib/utils";
import { ControllerProps, FieldPath, FieldValues } from "react-hook-form";

import { Button } from "@gnd/ui/button";
import { FormControl, FormField, FormItem, FormLabel } from "@gnd/ui/form";
import { Input } from "@gnd/ui/input";
import { Label } from "@gnd/ui/label";
import { Skeleton } from "@gnd/ui/skeleton";
import { Textarea } from "@gnd/ui/textarea";
import { NumericFormat, NumericFormatProps } from "react-number-format";
import { Popover, PopoverContent, PopoverTrigger } from "@gnd/ui/popover";
import { formatDate } from "@gnd/utils/dayjs";
import { Calendar, CalendarProps } from "@gnd/ui/calendar";
import { CalendarIcon } from "lucide-react";

interface Props<T> {
    label?: string;
    placeholder?: string;
    className?: string;
    suffix?: string;
    type?: string;
    list?: boolean;
    size?: "sm" | "default" | "xs";
    prefix?: string;
    tabIndex?;
    format?;
    calendarProps?: CalendarProps;
}
export default function FormDate<
    TFieldValues extends FieldValues = FieldValues,
    TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
    TOptionType = any,
>({
    label,
    placeholder,
    className,
    suffix,
    type,
    list,
    prefix,
    tabIndex,
    size = "default",
    calendarProps,
    format,
    ...props
}: Partial<ControllerProps<TFieldValues, TName>> & Props<TOptionType>) {
    const load = useDataSkeleton();
    const [open, setOpen] = useState(false);
    return (
        <FormField
            {...(props as any)}
            render={({ field, fieldState }) => (
                <FormItem
                    className={cn(
                        className,
                        props.disabled && "text-muted-foreground",
                        "mx-1",
                        "flex flex-col",
                    )}
                >
                    {label && (
                        <FormLabel
                            className={cn(fieldState.error && "border-red-400")}
                        >
                            {label}
                        </FormLabel>
                    )}
                    {/* <FormControl {...inputProps}> */}
                    {load?.loading ? (
                        <Skeleton className="h-8 w-full" />
                    ) : (
                        <Popover open={open} onOpenChange={setOpen}>
                            <PopoverTrigger asChild>
                                <FormControl>
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
                                            formatDate(field.value, format)
                                        ) : (
                                            <span>
                                                {placeholder || "Pick a date"}
                                            </span>
                                        )}
                                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                    </Button>
                                </FormControl>
                            </PopoverTrigger>
                            <PopoverContent
                                className="w-auto p-0"
                                align="start"
                            >
                                <Calendar
                                    selected={field.value}
                                    disabled={(date) =>
                                        date < new Date("1900-01-01")
                                    }
                                    initialFocus
                                    {...calendarProps}
                                    mode="single"
                                    onSelect={(e) => {
                                        field.onChange(e);
                                        setOpen(false);
                                    }}
                                />
                            </PopoverContent>
                        </Popover>
                    )}
                    {/* </FormControl> */}
                </FormItem>
            )}
        />
    );
}
