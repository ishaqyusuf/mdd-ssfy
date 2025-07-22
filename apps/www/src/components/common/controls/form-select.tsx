import { useEffect, useState } from "react";
import { useDataSkeleton } from "@/hooks/use-data-skeleton";
import { cn, generateRandomString } from "@/lib/utils";
import { CheckIcon, ChevronsUpDown } from "lucide-react";
import { ControllerProps, FieldPath, FieldValues } from "react-hook-form";

import { Button } from "@gnd/ui/button";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
} from "@gnd/ui/command";
import { FormControl, FormField, FormItem, FormLabel } from "@gnd/ui/form";
import { Popover, PopoverContent, PopoverTrigger } from "@gnd/ui/popover";
import { ScrollArea } from "@gnd/ui/scroll-area";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@gnd/ui/select";
import { Skeleton } from "@gnd/ui/skeleton";

export interface FormSelectProps<T> {
    label?;
    placeholder?: string;
    options?: T[];
    SelectItem?({ option }: { option: T });
    Item?({ option }: { option: T });
    valueKey?: keyof T;
    titleKey?: keyof T;
    onSelect?(selection: T);
    loader?;
    className?: string;
    type?: "select" | "combo";
    transformValue?(value?);
    size?: "sm" | "default" | "xs";
    listMode?: boolean;
    prefix?;
}
export default function FormSelect<
    TFieldValues extends FieldValues = FieldValues,
    TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
    TOptionType = any,
>({
    label,
    prefix,
    placeholder,
    options = [],
    loader,
    SelectItem: SelItem,
    valueKey = "value" as any,
    titleKey = "label" as any,
    type = "select",
    onSelect,
    className,
    Item,
    transformValue,
    size = "default",
    listMode,
    ...props
}: Partial<ControllerProps<TFieldValues, TName>> &
    FormSelectProps<TOptionType>) {
    const [list, setList] = useState<any>(options || []);
    const load = useDataSkeleton();

    useEffect(() => {
        if (loader) {
            (async () => {
                const ls = await loader();

                setList(ls);
            })();
        }
    }, []);
    function itemValue(option) {
        if (!option) return option;
        if (Number.isInteger(option)) option = String(option);

        return typeof option == "object" ? option[valueKey] : option;
    }
    function itemText(option) {
        if (!option) return option;
        return typeof option == "string"
            ? option
            : titleKey == "label"
              ? option[titleKey] || option["text"]
              : option[titleKey];
    }
    const k = generateRandomString();
    return (
        <FormField
            {...(props as any)}
            render={({ field }) => (
                <FormItem className={cn(className, "mx-1")}>
                    {label && (
                        <FormLabel
                            className={cn(
                                props.disabled && "text-muted-foreground",
                            )}
                        >
                            {label}
                        </FormLabel>
                    )}
                    <FormControl>
                        {load?.loading ? (
                            <Skeleton className="h-8 w-full" />
                        ) : type == "combo" ? (
                            <ControlledCombox
                                size={size}
                                field={field}
                                key={k}
                                placeholder={placeholder}
                                onSelect={(s) => {
                                    let value = itemValue(s);
                                    if (transformValue)
                                        value = transformValue(value);

                                    field?.onChange(value);
                                    onSelect && onSelect(value);
                                    // onSelect;
                                }}
                                options={list}
                                itemValue={itemValue}
                                itemText={itemText}
                            />
                        ) : (
                            <Select
                                disabled={props.disabled}
                                onValueChange={field.onChange}
                                {...(listMode
                                    ? {
                                          defaultValue: field.value,
                                      }
                                    : {
                                          value: field.value,
                                      })}
                            >
                                <SelectTrigger
                                    className={cn(size == "sm" && "h-8")}
                                >
                                    <div className="inline-flex gap-1">
                                        {prefix && (
                                            <span className="text-muted-foreground">
                                                {prefix}
                                                {": "}
                                            </span>
                                        )}
                                        <SelectValue
                                            className="whitespace-nowrap"
                                            placeholder={placeholder}
                                        ></SelectValue>
                                    </div>
                                </SelectTrigger>
                                <SelectContent className="">
                                    <ScrollArea className="max-h-[40vh] overflow-auto">
                                        {(loader ? list : options)?.map(
                                            (option, index) =>
                                                SelItem ? (
                                                    <SelItem
                                                        option={option}
                                                        key={index}
                                                    />
                                                ) : (
                                                    <SelectItem
                                                        key={index}
                                                        value={itemValue(
                                                            option,
                                                        )}
                                                    >
                                                        {Item ? (
                                                            <Item
                                                                option={option}
                                                            />
                                                        ) : (
                                                            <>
                                                                {itemText(
                                                                    option,
                                                                )}
                                                            </>
                                                        )}
                                                    </SelectItem>
                                                ),
                                        )}
                                    </ScrollArea>
                                </SelectContent>
                            </Select>
                        )}
                    </FormControl>
                </FormItem>
            )}
        />
    );
}
export function ControlledCombox({
    field,
    placeholder,
    onSelect,
    options,
    itemText,
    size,
    itemValue,
}) {
    const [show, setShow] = useState(false);
    return (
        <Popover open={show} onOpenChange={setShow}>
            <PopoverTrigger asChild>
                <FormControl>
                    <Button
                        onClick={() => {
                            setShow(!show);
                        }}
                        variant="outline"
                        role="combobox"
                        className={cn(
                            size == "sm" && "h-8",
                            "w-full justify-between",
                            !field?.value && "text-muted-foreground",
                        )}
                    >
                        <span className="">
                            {field?.value
                                ? itemText(
                                      options?.find(
                                          (o) => itemValue?.(o) == field?.value,
                                      ),
                                  )
                                : placeholder}
                        </span>
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                </FormControl>
            </PopoverTrigger>
            <PopoverContent className="min-w-[250px] max-w-[400px] p-0 ">
                <Command>
                    <CommandInput
                        onValueChange={(e) => {
                            // setValue(e);
                        }}
                        placeholder={placeholder}
                        className="h-9"
                    />
                    <CommandEmpty>Nothing to display.</CommandEmpty>
                    <CommandGroup className="max-h-[35vh] overflow-auto">
                        {(options || [])?.map((opt, index) => (
                            <CommandItem
                                value={itemValue(opt)}
                                key={index}
                                onSelect={() => {
                                    onSelect && onSelect(opt);
                                    setShow(false);
                                }}
                            >
                                {itemText(opt)}
                                <CheckIcon
                                    className={cn(
                                        "ml-auto h-4 w-4",
                                        itemValue(opt) === field?.value
                                            ? "opacity-100"
                                            : "opacity-0",
                                    )}
                                />
                            </CommandItem>
                        ))}
                    </CommandGroup>
                </Command>
            </PopoverContent>
        </Popover>
    );
}
