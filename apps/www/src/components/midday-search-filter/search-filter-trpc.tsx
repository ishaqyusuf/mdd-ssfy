"use client";

import { useDebounce } from "@/hooks/use-debounce";
import { useSearchFilterContext } from "@/hooks/use-search-filter";
import type { PageFilterData } from "@api/type";
import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import { cn } from "@gnd/ui/cn";
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuPortal,
    DropdownMenuSub,
    DropdownMenuSubContent,
    DropdownMenuSubTrigger,
    DropdownMenuTrigger,
} from "@gnd/ui/dropdown-menu";
import {
    HoverCard,
    HoverCardContent,
    HoverCardTrigger,
} from "@gnd/ui/hover-card";
import { Icon, Icons } from "@gnd/ui/icons";
import { Input } from "@gnd/ui/input";
import { transformFilterDateToQuery } from "@gnd/utils";
import { type DaysFilters, daysFilters } from "@gnd/utils/constants";
import { formatISO } from "date-fns";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { useHotkeys } from "react-hotkeys-hook";
import { PageTabs } from "../page-tabs";
import { SavePageTabButton } from "../page-tabs/save-page-tab-button";
import { SelectTag } from "../select-tag";
import {
    type FilterDefinition,
    buildOptionLabelLookup,
    normalizeFilterDefinitions,
} from "./filter-definitions";
import { FilterList } from "./filter-list";
import { FilterOptionColor } from "./filter-option-color";
import { isSearchKey, searchIcons } from "./search-utils";

const CALENDAR_SKELETON_DAYS = Array.from({ length: 35 }, (_, index) => ({
    id: `calendar-day-${index}`,
}));
const FILTER_MENU_SKELETON_ROWS = Array.from({ length: 5 }, (_, index) => ({
    id: `filter-menu-row-${index}`,
}));

const Calendar = dynamic(
    () => import("@gnd/ui/calendar").then((mod) => mod.Calendar),
    {
        loading: () => <CalendarSkeleton />,
    },
);

interface Props {
    defaultSearch?: Record<string, unknown>;
    placeholder?: string;
    filterList?: Array<PageFilterData | FilterDefinition>;
    loading?: boolean;
    SearchTips?: ReactNode;
    searchKey?: string;
    debounceMs?: number;
    afterSearch?: ReactNode;
    pageTabs?: ReactNode;
}

function CalendarSkeleton() {
    return (
        <div className="grid gap-2 p-3">
            <div className="h-8 animate-pulse rounded-md bg-muted" />
            <div className="grid grid-cols-7 gap-1.5">
                {CALENDAR_SKELETON_DAYS.map((item) => (
                    <div
                        key={item.id}
                        className="size-8 animate-pulse rounded-md bg-muted"
                    />
                ))}
            </div>
        </div>
    );
}

export function SearchFilterTRPC({
    placeholder,
    filterList,
    loading,
    SearchTips,
    searchKey: searchKeyProp,
    debounceMs = 400,
    afterSearch,
    pageTabs,
}: Props) {
    const inputRef = useRef<HTMLInputElement>(null);
    const searchParams = useSearchParams();
    const {
        isOpen,
        setIsOpen,
        setIsFocused,
        filters,
        setFilters,
        clearAll,
        setSearch,
        optionSelected,
        isOptionSelected,
        searchKey: contextSearchKey,
    } = useSearchFilterContext();

    const definitions = useMemo(
        () => normalizeFilterDefinitions(filterList),
        [filterList],
    );
    const optionLookup = useMemo(
        () => buildOptionLabelLookup(definitions),
        [definitions],
    );
    const searchKey =
        searchKeyProp ||
        definitions.find((definition) => isSearchKey(definition.key))?.key ||
        contextSearchKey;
    const searchValue = filters?.[searchKey];
    const [prompt, setPrompt] = useState(
        typeof searchValue === "string" ? searchValue : "",
    );
    const debouncedPrompt = useDebounce(prompt, debounceMs);
    const hasMounted = useRef(false);
    const hasPendingDebouncedSearch = useRef(false);
    const nonSearchDefinitions = definitions.filter(
        (definition) => !isSearchKey(definition.key),
    );
    const activeSortLabel = useMemo(
        () => getSortLabel(searchParams.get("sort")),
        [searchParams],
    );

    useEffect(() => {
        const nextPrompt = typeof searchValue === "string" ? searchValue : "";
        hasPendingDebouncedSearch.current = false;

        setPrompt((currentPrompt) =>
            currentPrompt === nextPrompt ? currentPrompt : nextPrompt,
        );
    }, [searchValue]);

    useEffect(() => {
        if (!hasMounted.current) {
            hasMounted.current = true;
            return;
        }

        if (!hasPendingDebouncedSearch.current) return;
        if (debouncedPrompt !== prompt) return;

        hasPendingDebouncedSearch.current = false;
        setSearch(debouncedPrompt.length > 0 ? debouncedPrompt : null);
    }, [debouncedPrompt, prompt, setSearch]);

    useHotkeys(
        "esc",
        () => {
            hasPendingDebouncedSearch.current = false;
            setPrompt("");
            clearAll();
            setIsOpen(false);
        },
        {
            enableOnFormTags: true,
            enabled: Boolean(prompt) || isOpen,
        },
    );

    useHotkeys("meta+s", (evt) => {
        evt.preventDefault();
        inputRef.current?.focus();
    });

    useHotkeys("meta+f", (evt) => {
        evt.preventDefault();
        setIsOpen((prev) => !prev);
    });

    const hasValidFilters = Object.entries(filters || {}).some(
        ([key, value]) => {
            if (isSearchKey(key)) return false;
            if (value === null || value === undefined || value === "")
                return false;
            if (Array.isArray(value)) return value.length > 0;
            return true;
        },
    );

    const handleSearch = (evt: React.ChangeEvent<HTMLInputElement>) => {
        const value = evt.target.value;
        setPrompt(value);

        if (!value) {
            hasPendingDebouncedSearch.current = false;
            setSearch(null);
            return;
        }

        hasPendingDebouncedSearch.current = true;
    };

    const handleSubmit = (evt?: React.FormEvent) => {
        evt?.preventDefault();
        hasPendingDebouncedSearch.current = false;
        setSearch(prompt.length > 0 ? prompt : null);
    };

    return (
        <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
            <div className="flex w-full flex-col gap-3 lg:flex-row lg:items-center lg:gap-4">
                {pageTabs === undefined ? (
                    <PageTabs
                        portal={false}
                        action={
                            <SavePageTabButton
                                definitions={definitions}
                                filters={filters}
                                optionLookup={optionLookup}
                                buttonClassName="rounded-sm border-0"
                            />
                        }
                    />
                ) : (
                    pageTabs
                )}
                <form
                    className="relative w-full lg:w-auto"
                    onSubmit={handleSubmit}
                >
                    <Icons.Search className="pointer-events-none absolute left-3 top-[11px] size-4" />
                    <Input
                        ref={inputRef}
                        aria-label={placeholder || "Search"}
                        placeholder={placeholder}
                        className="w-full pl-9 pr-24 lg:w-[350px] lg:pr-10"
                        value={prompt}
                        onChange={handleSearch}
                        onFocus={() => setIsFocused(true)}
                        onBlur={() => setIsFocused(false)}
                        autoComplete="off"
                        autoCapitalize="none"
                        autoCorrect="off"
                        spellCheck="false"
                    />
                    {!SearchTips || <SearchTip>{SearchTips}</SearchTip>}
                    <DropdownMenuTrigger asChild>
                        <Button
                            aria-expanded={isOpen}
                            aria-label="Open filters"
                            onClick={() => setIsOpen((prev) => !prev)}
                            type="button"
                            variant="ghost"
                            size="sm"
                            className={cn(
                                "absolute right-1 top-1 z-10 h-8 gap-1.5 rounded-md px-2 text-muted-foreground opacity-70 transition-opacity duration-300 hover:opacity-100 lg:w-8 lg:px-0",
                                hasValidFilters && "opacity-100",
                                isOpen && "opacity-100",
                            )}
                        >
                            <Icons.Filter className="size-4" />
                            <span className="text-xs lg:hidden">Filters</span>
                            <span className="sr-only">Open filters</span>
                        </Button>
                    </DropdownMenuTrigger>
                </form>
                {afterSearch}
                <FilterList
                    loading={loading}
                    onRemove={(obj) => {
                        setFilters(obj);

                        if (Object.keys(obj).some((key) => isSearchKey(key))) {
                            hasPendingDebouncedSearch.current = false;
                            setPrompt("");
                        }
                    }}
                    onClearAll={() => {
                        hasPendingDebouncedSearch.current = false;
                        setPrompt("");
                        clearAll();
                    }}
                    filters={filters}
                    definitions={definitions}
                    optionLookup={optionLookup}
                />
                {activeSortLabel ? (
                    <Badge
                        variant="secondary"
                        className="h-8 shrink-0 gap-1.5 rounded-md px-2 font-normal"
                    >
                        <Icons.Sort className="size-3.5" />
                        {activeSortLabel}
                    </Badge>
                ) : null}
            </div>
            <DropdownMenuContent
                className={cn("w-[min(22rem,calc(100vw-2rem))] lg:w-[350px]")}
                sideOffset={4}
                alignOffset={0}
                side="bottom"
                align="end"
            >
                {loading ? (
                    <FilterMenuSkeleton />
                ) : (
                    nonSearchDefinitions.map((definition) => (
                        <DropdownMenuGroup key={definition.key}>
                            <DropdownMenuSub>
                                <DropdownMenuSubTrigger>
                                    <Icon
                                        name={
                                            (definition.icon ||
                                                searchIcons[definition.key] ||
                                                "Search") as never
                                        }
                                        className="mr-2 size-4"
                                    />
                                    <span className="capitalize">
                                        {definition.label}
                                    </span>
                                </DropdownMenuSubTrigger>
                                <DropdownMenuPortal>
                                    <DropdownMenuSubContent
                                        sideOffset={14}
                                        alignOffset={-4}
                                        className="p-0"
                                    >
                                        {definition.renderControl ? (
                                            <definition.renderControl
                                                definition={definition}
                                                value={filters?.[definition.key]}
                                                filters={filters}
                                                setFilter={setFilters}
                                                toggleOption={optionSelected}
                                            />
                                        ) : definition.type === "date-range" ||
                                          definition.type === "date" ? (
                                            <CalendarFilter filter={definition} />
                                        ) : (definition.options?.length ?? 0) >
                                          20 ? (
                                            <SelectTag
                                                headless
                                                data={definition.options?.map(
                                                    (option) => ({
                                                        ...option,
                                                        id: option.value,
                                                    }),
                                                )}
                                                renderListItem={({ item }) => (
                                                    <div className="flex items-center gap-2">
                                                        <FilterOptionColor
                                                            color={
                                                                (item as { color?: string })
                                                                    .color
                                                            }
                                                        />
                                                        <span className="line-clamp-1">
                                                            {item.label}
                                                        </span>
                                                    </div>
                                                )}
                                                onChange={(selected) => {
                                                    optionSelected(
                                                        definition.key,
                                                        {
                                                            label: selected.label,
                                                            value: selected.id,
                                                            color: (
                                                                selected as {
                                                                    color?: string;
                                                                }
                                                            ).color,
                                                        },
                                                    );
                                                }}
                                            />
                                        ) : (
                                            definition.options?.map((option) => (
                                                <DropdownMenuCheckboxItem
                                                    checked={isOptionSelected(
                                                        definition.key,
                                                        option.value,
                                                    )}
                                                    onSelect={(event) =>
                                                        event.preventDefault()
                                                    }
                                                    onCheckedChange={() => {
                                                        optionSelected(
                                                            definition.key,
                                                            option,
                                                        );
                                                    }}
                                                    key={option.value}
                                                >
                                                    <span className="flex items-center gap-2">
                                                        <FilterOptionColor
                                                            color={option.color}
                                                        />
                                                        <span>{option.label}</span>
                                                    </span>
                                                </DropdownMenuCheckboxItem>
                                            ))
                                        )}
                                    </DropdownMenuSubContent>
                                </DropdownMenuPortal>
                            </DropdownMenuSub>
                        </DropdownMenuGroup>
                    ))
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

function getSortLabel(sort: string | null) {
    if (!sort) return null;

    const [field, direction] = sort.split(".");
    const fieldLabel = SORT_FIELD_LABELS[field] ?? field;
    const directionLabel =
        direction === "asc"
            ? "ascending"
            : direction === "desc"
              ? "descending"
              : null;

    return directionLabel ? `${fieldLabel}, ${directionLabel}` : fieldLabel;
}

const SORT_FIELD_LABELS: Record<string, string> = {
    amountDue: "Balance",
    createdAt: "Date",
    date: "Date",
    latestPaymentAt: "Recent invoices",
    lotBlock: "Lot / block",
    orderId: "Order",
    project: "Project",
};

function FilterMenuSkeleton() {
    return (
        <div className="grid gap-1 p-1.5" aria-label="Loading filters">
            {FILTER_MENU_SKELETON_ROWS.map((item) => (
                <div
                    key={item.id}
                    className="flex h-8 items-center gap-2 rounded-sm px-2"
                >
                    <div className="size-4 animate-pulse rounded bg-muted" />
                    <div className="h-3 w-28 animate-pulse rounded bg-muted" />
                </div>
            ))}
        </div>
    );
}

interface CalendarFilterProps {
    filter: FilterDefinition;
}

function CalendarFilter({ filter }: CalendarFilterProps) {
    const { filters, setFilters } = useSearchFilterContext();

    const isCurrentFilter = (value: string) => {
        const filterValue = filters?.[filter.key];
        if (Array.isArray(filterValue)) return value === filterValue?.[0];

        return false;
    };

    const dateValue = (index: number) => {
        const filterValue = filters?.[filter.key];

        if (Array.isArray(filterValue) && filterValue.length > index) {
            const dates = transformFilterDateToQuery(filterValue);
            const date = index === 0 ? dates?.gte : dates?.lte;

            if (index > 0) {
                switch (filterValue?.[0] as DaysFilters) {
                    case "today":
                    case "yesterday":
                        return undefined;
                }
            }

            return date ? new Date(date) : undefined;
        }

        return undefined;
    };

    return (
        <div className="flex max-w-[calc(100vw-2rem)] overflow-x-auto">
            <div className="w-32 shrink-0 border-r border-border py-1">
                {daysFilters.map((dayFilter) => {
                    const selected = isCurrentFilter(dayFilter);

                    return (
                        <button
                            type="button"
                            className={cn(
                                "flex h-8 w-full items-center gap-2 px-2 text-left text-sm capitalize text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground",
                                selected &&
                                    "bg-accent font-medium text-accent-foreground",
                            )}
                            onClick={() => {
                                setFilters({
                                    [filter.key]: [dayFilter],
                                });
                            }}
                            key={dayFilter}
                        >
                            <Icons.CheckCircle
                                className={cn(
                                    "size-3 shrink-0",
                                    selected ? "opacity-100" : "opacity-20",
                                )}
                            />
                            <span className="truncate">{dayFilter}</span>
                        </button>
                    );
                })}
            </div>

            <div className="min-w-max">
                <Calendar
                    mode="range"
                    initialFocus
                    selected={{
                        from: dateValue(0),
                        to: dateValue(1),
                    }}
                    onSelect={(range) => {
                        const value = [
                            range?.from
                                ? formatISO(range.from, {
                                      representation: "date",
                                  })
                                : "-",
                            range?.to
                                ? formatISO(range.to, {
                                      representation: "date",
                                  })
                                : "-",
                        ];

                        setFilters({
                            [filter.key]: value,
                        });
                    }}
                />
            </div>
        </div>
    );
}

function SearchTip({ children }: { children: ReactNode }) {
    return (
        <HoverCard>
            <HoverCardTrigger asChild>
                <button
                    type="button"
                    className="absolute right-10 top-[10px] z-10 opacity-50 transition-opacity duration-300 hover:opacity-100"
                >
                    <Icons.HelpCircle className="size-4" />
                </button>
            </HoverCardTrigger>
            <HoverCardContent className="w-80">
                <div className="flex justify-between gap-4">
                    <div className="space-y-1">
                        <h4 className="text-sm font-semibold">Search tips</h4>
                        <div className="text-sm">{children}</div>
                    </div>
                </div>
            </HoverCardContent>
        </HoverCard>
    );
}
