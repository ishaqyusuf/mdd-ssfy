"use client";

import React, { useState } from "react";
import { useDebounce } from "@/hooks/use-debounce";
import { cn } from "@/lib/utils";
import { UseFormReturn } from "react-hook-form";

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

export interface ComboboxProps<T> {
    list?;
    selected?(T);
    form?: UseFormReturn<any>;
    keyName?;
    labelKey?;
    valueKey?;
    align?: "start" | "end" | "center" | undefined;
    id?;
    placeholder?;
    searchFn?(q): Promise<{ items: T[] }>;
    allowCreate?: Boolean;
    className?;
    prompSize?: "sm" | "md" | "lg" | "auto";
    onFocus?;
    value?;
    setValue?;
    uppercase?: Boolean;
}
export default function Combobox<T>({
    list = [],
    form,
    keyName,
    allowCreate = false,
    prompSize = "auto",
    className,
    searchFn,
    labelKey,
    align = "end",
    selected,
    valueKey,
    onFocus,
    value,
    uppercase,
    setValue,
    ...props
}: ComboboxProps<T>) {
    interface IItem {
        label?;
        value;
        data?: T;
        hidden?;
    }
    const [open, setOpen] = React.useState(false);
    const [items, setItems] = React.useState<IItem[]>([]);
    function selectItem(v: IItem) {
        setOpen(false);
        if (form) form.setValue(keyName, v.value);
        setValue && setValue(v.value);
        setQ("");
        selected && selected(v.data);
    }
    function getLabel(v) {
        return typeof v === "string" ? v : labelKey ? v[labelKey] : v?.label;
    }
    function getValue(v) {
        return typeof v === "string" ? v : labelKey ? v[labelKey] : v?.value;
    }
    const watch = form && keyName ? form.watch(keyName) : value;
    const [q, setQ] = React.useState("");
    React.useEffect(() => {
        setItems(list?.map(transformItem));
    }, [watch]);
    function search(v) {
        const res = {};
        const isEmpty = v.trim()?.length > 0 == false;
        // RegExp.escape = function (pattern) {
        //   return pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        // };
        const pattern = new RegExp(
            v?.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
            "i",
        );
        setItems(
            items.map((item) => {
                if (isEmpty) item.hidden = false;
                else {
                    item.hidden = pattern.test(item.label) == false;
                }
                res[item.label] = [item.hidden, isEmpty];

                return item;
            }),
        );
    }
    function transformItem(item) {
        return {
            label: getLabel(item),
            value: getValue(item),
            raw: item,
        };
    }
    const debouncedQuery = useDebounce(q, 800);
    async function dynamicSearch() {
        if (searchFn) {
            const resp = await searchFn(q);

            setItems(resp.items.map(transformItem) as any);
        }
    }

    const [searchable, setSearchable] = useState(false);
    React.useEffect(() => {
        // if (debouncedSearch) {
        // fetch(`/api/search?q=${debouncedSearch}`);
        if (searchable) dynamicSearch();
        //  fetchData();
        // table.getColumn(key)?.setFilterValue(debouncedSearch);
        // }
    }, [debouncedQuery, searchable]);
    // const [q, setQ] = React.useState("");
    function onOpen(e) {
        setOpen(e);
        if (e) {
            setQ("");
            dynamicSearch();
        }
    }
    return (
        <>
            <Popover open={open} onOpenChange={onOpen}>
                <PopoverTrigger asChild>
                    {/* <div className={className}> */}
                    {/* <Input className="h-8 p-1" {...props} {...form.register(keyName)} /> */}
                    <Button
                        variant="outline"
                        className="line-clamp-1 h-8 w-full justify-start px-2 text-start"
                    >
                        {form ? form.getValues(keyName) : value}
                    </Button>
                    {/* </div> */}
                </PopoverTrigger>
                <PopoverContent
                    className={`w-auto 
        p-0 
          `}
                    align={align}
                >
                    <Command shouldFilter={false}>
                        <CommandInput
                            onFocus={() => {
                                setQ(form ? form.getValues(keyName) : value);
                                setSearchable(true);
                            }}
                            onBlur={() => {
                                setSearchable(false);
                            }}
                            className={cn(uppercase && "uppercase")}
                            value={q}
                            onValueChange={(v) => {
                                setQ(v);
                                // setNewItem(v.trim());

                                search(v);
                            }}
                            placeholder={props.placeholder || "..."}
                        />
                        <CommandList className="h-28">
                            <CommandEmpty>No results found.</CommandEmpty>
                            <CommandGroup>
                                {allowCreate && q?.length > 0 && (
                                    <>
                                        <CommandItem
                                            key={0}
                                            onSelect={() =>
                                                selectItem({ value: q })
                                            }
                                        >
                                            <span
                                                className={cn(
                                                    uppercase && "uppercase",
                                                )}
                                            >
                                                {q}
                                            </span>
                                        </CommandItem>
                                        <CommandSeparator />
                                    </>
                                )}
                                {items?.map(
                                    (item, index) =>
                                        !item.hidden && (
                                            <CommandItem
                                                onSelect={() =>
                                                    selectItem(item)
                                                }
                                                key={index + 1}
                                            >
                                                <span>{item.label}</span>
                                            </CommandItem>
                                        ),
                                )}
                            </CommandGroup>
                        </CommandList>
                    </Command>
                </PopoverContent>
            </Popover>
        </>
    );
}
