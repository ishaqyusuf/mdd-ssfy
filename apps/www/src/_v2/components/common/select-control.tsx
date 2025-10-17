import { cn } from "@/lib/utils";
import { FieldPath, useFormContext } from "react-hook-form";

import { FormControl, FormField, FormItem, FormLabel } from "@gnd/ui/form";
import { Label } from "@gnd/ui/label";
import { ScrollArea } from "@gnd/ui/scroll-area";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@gnd/ui/select";

interface Props<T> {
    // @ts-ignore
    name: FieldPath<T>;
    placeholder?;
    options?: ({ text; value } | any)[];
    className?;
    label?;
}
export default function SelectControl<T>({
    name,
    placeholder,
    className,
    options,
    label,
}: Props<T>) {
    const form = useFormContext();
    function itemText(option) {
        if (typeof option === "object") {
            return option.text;
        }
        return option;
    }
    function itemValue(option) {
        if (typeof option === "object") {
            return option.value;
        }
        return option;
    }
    return (
        <div>
            <FormField
                name={name}
                control={form.control}
                render={({ field }) => (
                    <FormItem>
                        {label && (
                            <FormLabel>
                                <Label>{label}</Label>
                            </FormLabel>
                        )}
                        <Select
                            defaultValue={field.value}
                            onValueChange={(e) => {
                                field.onChange(e);
                            }}
                        >
                            <FormControl>
                                <SelectTrigger className={cn("", className)}>
                                    <SelectValue placeholder={placeholder} />
                                </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                <ScrollArea className="max-h-[40vh] overflow-auto">
                                    {options?.map((option, index) => (
                                        <SelectItem
                                            key={index}
                                            value={itemValue(option)}
                                        >
                                            {itemText(option)}
                                        </SelectItem>
                                    ))}
                                </ScrollArea>
                            </SelectContent>
                        </Select>
                    </FormItem>
                )}
            />
        </div>
    );
}
