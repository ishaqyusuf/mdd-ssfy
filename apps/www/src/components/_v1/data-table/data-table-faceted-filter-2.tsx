import * as React from "react";
import { cn } from "@/lib/utils";
import { DataTableFilterableColumn } from "@/types/data-table";
import { CheckIcon, PlusCircledIcon } from "@radix-ui/react-icons";
import { Table, type Column } from "@tanstack/react-table";
import { Check } from "lucide-react";

import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
    CommandSeparator,
} from "@gnd/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@gnd/ui/popover";
import { Separator } from "@gnd/ui/separator";

export interface Option {
    label: string;
    value: string;
    icon?: React.ComponentType<{ className?: string }>;
}
// interface DataTableFacetedFilter<TData, TValue> {
//   column?: Column<TData, TValue>
//   title?: string
//   single?: Boolean
//   options: Option[]
// }
interface DataTableFacetedFilter<TData, TValue> {
    title?: string;
    options: (Option | any)[];
    filter?: DataTableFilterableColumn<TData, TValue>;
    range?;
    single?: Boolean;
    column?: Column<TData, TValue>;
    dateTypeColumn?: Column<TData, TValue>;
    rangeSwitch?: Boolean;
    defaultValue?: String;
    value?;
    setValue?;
    labelKey?;
    valueKey?;
}
export function DataTableFacetedFilter2<TData, TValue>({
    title,
    value,
    setValue,
    options,
    single,
    column,
    defaultValue,
    labelKey = "label",
    valueKey = "value",
}: DataTableFacetedFilter<TData, TValue>) {
    const facets = column?.getFacetedUniqueValues();
    // const selectedValues = new Set();
    const [_selectedValues, setSelectedValue] = React.useState(new Set());
    const fv = column?.getFilterValue();
    React.useEffect(() => {
        const v = fv; // as string[];

        const isArray = Array.isArray(v);
        // selectedValues.clear();
        if (v) {
            const ns = new Set(_selectedValues);
            if (single) {
                ns.add(isArray ? v[0] : v);
            } else {
                (isArray ? v : [v]).map((_v) => ns.add(_v));
            }
            setSelectedValue(ns);
        } else setSelectedValue(new Set());
    }, [fv]);

    const [open, setOpen] = React.useState(false);
    if (!column || !column.id) {
        return null;
    }
    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    size="sm"
                    className="h-8 border-dashed"
                >
                    {/* <PlusCircle className="mr-2 h-4 w-4" /> */}
                    {title}
                    {_selectedValues?.size > 0 && (
                        <>
                            <Separator
                                orientation="vertical"
                                className="mx-2 h-4"
                            />
                            <Badge
                                variant="secondary"
                                className="rounded-sm px-1 font-normal lg:hidden"
                            >
                                {_selectedValues.size}
                            </Badge>
                            <div className="hidden space-x-1 lg:flex">
                                {_selectedValues.size > 2 ? (
                                    <Badge
                                        variant="secondary"
                                        className="rounded-sm px-1 font-normal"
                                    >
                                        {_selectedValues.size} selected
                                    </Badge>
                                ) : (
                                    options
                                        .filter((option) =>
                                            _selectedValues.has(
                                                option[valueKey]?.toString(),
                                            ),
                                        )
                                        .map((option) => (
                                            <Badge
                                                variant="secondary"
                                                key={option[valueKey]}
                                                className="rounded-sm px-1 font-normal"
                                            >
                                                {option[labelKey]}
                                            </Badge>
                                        ))
                                )}
                            </div>
                        </>
                    )}
                    {_selectedValues.size == 0 && defaultValue && (
                        <Badge>{defaultValue}</Badge>
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[200px] p-0" align="start">
                <Command>
                    {options?.length > 5 && (
                        <CommandInput placeholder={title} />
                    )}
                    <CommandList>
                        <CommandEmpty>No results found.</CommandEmpty>
                        <CommandGroup>
                            {options?.map((option) => {
                                const isSelected = _selectedValues.has(
                                    option[valueKey],
                                );

                                return (
                                    <CommandItem
                                        className="max-w-[250px]"
                                        key={option[valueKey]?.toString()}
                                        onSelect={() => {
                                            let _value =
                                                option[valueKey]?.toString();
                                            const ns = new Set(_selectedValues);
                                            if (single) {
                                                if (isSelected) {
                                                    setOpen(false);
                                                    return;
                                                }
                                                ns.clear();
                                                ns.add(_value);
                                                setOpen(false);
                                            } else {
                                                if (isSelected) {
                                                    ns.delete(_value);
                                                } else {
                                                    ns.add(_value);
                                                }
                                            }
                                            const filterValues = Array.from(ns);

                                            // const fv = filterValues.length
                                            //     ? single
                                            //       ? [filterValues[0]]
                                            //       : filterValues
                                            //     : undefined

                                            column?.setFilterValue(
                                                filterValues,
                                            );
                                            setSelectedValue(ns);
                                            setValue &&
                                                setValue(
                                                    single
                                                        ? filterValues?.[0]
                                                        : filterValues,
                                                );
                                        }}
                                    >
                                        {!single && (
                                            <div
                                                className={cn(
                                                    "mr-2  flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                                                    isSelected
                                                        ? "bg-primary text-primary-foreground"
                                                        : "opacity-50 [&_svg]:invisible",
                                                )}
                                            >
                                                <Check
                                                    className={cn("h-4 w-4")}
                                                />
                                            </div>
                                        )}
                                        {option.icon && (
                                            <option.icon className="mr-2 h-4 w-4 text-muted-foreground" />
                                        )}
                                        <span>{option[labelKey]}</span>
                                        {facets?.get(option[valueKey]) && (
                                            <span className="ml-auto flex h-4 w-4 items-center justify-center font-mono text-xs">
                                                {facets.get(option[valueKey])}
                                            </span>
                                        )}
                                    </CommandItem>
                                );
                            })}
                        </CommandGroup>

                        {_selectedValues.size > 0 && (
                            <div className="h-[34px]">
                                <div className="absolute bottom-0 w-full bg-white">
                                    <CommandSeparator />
                                    <CommandGroup>
                                        <CommandItem
                                            onSelect={() => {
                                                setSelectedValue(new Set());
                                                column?.setFilterValue(
                                                    undefined,
                                                );
                                                setValue && setValue(undefined);
                                            }}
                                            className="justify-center text-center"
                                        >
                                            Clear filters
                                        </CommandItem>
                                    </CommandGroup>
                                </div>
                            </div>
                        )}
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
}
