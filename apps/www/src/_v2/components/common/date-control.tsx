import { useState } from "react";
import { formatDate } from "@/lib/use-day";
import { cn } from "@/lib/utils";
import { FieldPath, useFormContext } from "react-hook-form";

import { Button } from "@gnd/ui/button";
import { Calendar } from "@gnd/ui/calendar";
import { FormControl, FormField, FormItem } from "@gnd/ui/form";
import { Popover, PopoverContent, PopoverTrigger } from "@gnd/ui/popover";

interface Props<T> {
    // @ts-ignore
    name: FieldPath<T>;
    placeholder?;
    className?;
    format?;
    switchInput?: Boolean;
}
export default function DateControl<T>({
    name,
    placeholder,
    format = "YYYY-MM-DD",
    className,
    ...props
}: Props<T>) {
    const form = useFormContext();

    const [open, setOpen] = useState(false);
    return (
        <div>
            <FormField
                name={name}
                control={form.control}
                render={({ field }) => (
                    <FormItem>
                        <Popover open={open} onOpenChange={setOpen}>
                            <PopoverTrigger asChild>
                                <FormControl>
                                    <Button
                                        variant={"outline"}
                                        className={cn(
                                            "w-[240px] pl-3 text-left font-normal",
                                            !field.value &&
                                                "text-muted-foreground",
                                            className,
                                        )}
                                    >
                                        {field.value ? (
                                            formatDate(field.value, format)
                                        ) : (
                                            <span>{placeholder}</span>
                                        )}
                                        {/* <CalendarIcon className="ml-auto h-4 w-4 opacity-50" /> */}
                                    </Button>
                                </FormControl>
                            </PopoverTrigger>
                            <PopoverContent
                                className="w-auto p-0"
                                align="start"
                            >
                                <Calendar
                                    mode="single"
                                    selected={field.value}
                                    onSelect={(e) => {
                                        field.onChange(e);
                                        setOpen(false);
                                    }}
                                    disabled={(date) =>
                                        // date > new Date() ||
                                        date < new Date("1900-01-01")
                                    }
                                    initialFocus
                                />
                            </PopoverContent>
                        </Popover>
                    </FormItem>
                )}
            />
        </div>
    );
}
