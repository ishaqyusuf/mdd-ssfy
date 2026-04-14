"use client";

import { useProductVariants } from "./context";
import { Button } from "@gnd/ui/button";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@gnd/ui/command";
import { Icons } from "@gnd/ui/icons";
import { Popover, PopoverContent, PopoverTrigger } from "@gnd/ui/popover";
import { cn } from "@gnd/ui/cn";
import type { ReactNode } from "react";
import { useMemo } from "react";

type FilterItem = {
    label?: string;
    value: string;
    type?: string;
    options?: Array<{ label: string; value: string }>;
};

function pillLabel(filter: FilterItem) {
    return filter.label || filter.value.replaceAll("_", " ");
}

function selectedLabel(filter: FilterItem, selectedValue: string | null | undefined) {
    if (filter.value === "_variantShow" && !selectedValue) return "Priced";
    if (!selectedValue) return "";
    if (filter.type === "input") return selectedValue;
    return (
        filter.options?.find((option) => String(option.value) === String(selectedValue))
            ?.label || selectedValue
    );
}

export function VariantFilters() {
    const ctx = useProductVariants();
    const filterList = (ctx.filter.filterList || []) as FilterItem[];
    const optionFilters = filterList;

    const hasFilters = useMemo(
        () =>
            Object.entries(ctx.filter.params || {}).some(([key, value]) => {
                if (key === "_variantShow") {
                    return value != null && String(value) === "all";
                }
                return value != null && String(value).trim() !== "";
            }),
        [ctx.filter.params],
    );

    const clearFilters = () => {
        const cleared = Object.fromEntries(
            Object.keys(ctx.filter.paramsSchema || {}).map((key) => [key, null]),
        );
        ctx.filter.setParams(cleared);
    };

    return (
        <div className="mb-4 flex flex-wrap items-center gap-2">
            {optionFilters.map((filter) => {
                const currentValue = ctx.filter.params?.[filter.value];
                const isLocked = (filter.options || []).length <= 1;
                return (
                    <Popover key={filter.value}>
                        <PopoverTrigger asChild>
                            <Button
                                type="button"
                                variant="outline"
                                disabled={isLocked}
                                className="h-11 min-w-[124px] items-start justify-start rounded-xl px-3 py-1.5 text-left"
                            >
                                <FilterPillContent
                                    label={pillLabel(filter)}
                                    value={selectedLabel(
                                        filter,
                                        currentValue as string | null | undefined,
                                    )}
                                    active={Boolean(currentValue)}
                                    icon={
                                        isLocked ? null : (
                                            <Icons.ChevronDown className="size-3.5" />
                                        )
                                    }
                                />
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent
                            className="w-64 p-0"
                            align="start"
                            hidden={isLocked}
                        >
                            <Command>
                                <CommandInput
                                    placeholder={`Search ${pillLabel(filter)}`}
                                />
                                <CommandList>
                                    <CommandEmpty>No option found.</CommandEmpty>
                                    <CommandGroup>
                                        {(filter.options || []).map((option) => {
                                            const selected =
                                                String(currentValue || "") ===
                                                String(option.value);
                                            return (
                                                <CommandItem
                                                    key={`${filter.value}-${option.value}`}
                                                    value={option.label}
                                                    onSelect={() =>
                                                        ctx.filter.setParams({
                                                            [filter.value]: selected
                                                                ? null
                                                                : filter.value ===
                                                                    "_variantShow" &&
                                                                  option.value ===
                                                                      "priced"
                                                                  ? null
                                                                  : option.value,
                                                        })
                                                    }
                                                >
                                                    <div
                                                        className={cn(
                                                            "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                                                            selected
                                                                ? "bg-primary text-primary-foreground"
                                                                : "opacity-50 [&_svg]:invisible",
                                                        )}
                                                    >
                                                        <Icons.Check className="h-4 w-4" />
                                                    </div>
                                                    <span>{option.label}</span>
                                                </CommandItem>
                                            );
                                        })}
                                    </CommandGroup>
                                </CommandList>
                            </Command>
                        </PopoverContent>
                    </Popover>
                );
            })}

            {!hasFilters ? null : (
                <Button
                    type="button"
                    variant="ghost"
                    className="h-10 rounded-full px-3 text-sm"
                    onClick={clearFilters}
                >
                    <Icons.X className="mr-2 size-4" />
                    Clear Filters
                </Button>
            )}
        </div>
    );
}

function FilterPillContent(props: {
    label: string;
    value: string;
    active?: boolean;
    icon?: ReactNode;
}) {
    const hasValue = Boolean(props.value);
    return (
        <div
            className={cn(
                "flex w-full justify-between gap-3",
                hasValue ? "items-start" : "items-center",
            )}
        >
            <div
                className={cn(
                    "flex min-w-0",
                    hasValue ? "flex-col" : "items-center",
                )}
            >
                <span
                    className={cn(
                        "font-semibold uppercase tracking-wide text-muted-foreground",
                        hasValue
                            ? "text-[9px] leading-3"
                            : "text-[10px] leading-4",
                    )}
                >
                    {props.label}
                </span>
                {!props.value ? null : (
                    <span
                        className={cn(
                            "truncate text-xs leading-4 text-foreground",
                            !props.active && "text-muted-foreground/80",
                        )}
                    >
                        {props.value}
                    </span>
                )}
            </div>
            {props.icon}
        </div>
    );
}
