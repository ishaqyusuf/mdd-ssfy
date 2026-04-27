"use client";

import { useEffect, useRef, useState } from "react";
import { useDebounce } from "@/hooks/use-debounce";

import { useHotkeys } from "react-hotkeys-hook";

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
import { Icons } from "@gnd/ui/icons";
import { Input } from "@gnd/ui/input";
import { formatISO } from "date-fns";
import { SelectTag } from "../select-tag";
import { FilterList } from "./filter-list";
import { getSearchKey, isSearchKey, searchIcons } from "./search-utils";
import { useSearchFilterContext } from "@/hooks/use-search-filter";
import { Icon } from "@gnd/ui/icons";
import { PageFilterData } from "@api/type";
import { Calendar } from "@gnd/ui/calendar";
import {
    HoverCard,
    HoverCardContent,
    HoverCardTrigger,
} from "@gnd/ui/hover-card";
import { Button } from "@gnd/ui/button";
import { Table, TableBody, TableCell, TableRow } from "@gnd/ui/table";
import { DaysFilters, daysFilters } from "@gnd/utils/constants";
import { SuperAdminGuard } from "../auth-guard";
import { transformFilterDateToQuery } from "@gnd/utils";
interface Props {
    // filters;
    // setFilters;
    defaultSearch?;
    placeholder?;
    filterList?: PageFilterData[];
    SearchTips?;
}

export function SearchFilterTRPC({
    placeholder,
    defaultSearch = {},
    filterList,
    SearchTips,
}: Props) {
    const [prompt, setPrompt] = useState("");
    const inputRef = useRef<HTMLInputElement>(null);

    const [streaming, setStreaming] = useState(false);

    const {
        isFocused,
        isOpen,
        setIsOpen,
        shouldFetch,
        filters,
        setFilters,
        optionSelected,
    } = useSearchFilterContext();
    useHotkeys(
        "esc",
        () => {
            setPrompt("");
            setFilters(null);
            setIsOpen(false);
        },
        {
            enableOnFormTags: true,
            enabled: Boolean(prompt),
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

    const handleSearch = (evt: React.ChangeEvent<HTMLInputElement>) => {
        const value = evt.target.value;
        if (value) {
            setPrompt(value);
        } else {
            setFilters(null);
            setPrompt("");
        }
    };
    const deb = useDebounce(prompt, 200);
    const hasMounted = useRef(false);
    useEffect(() => {
        if (!hasMounted.current) {
            hasMounted.current = true;
            return;
        }
        const searchKey = getSearchKey(filters);

        if (searchKey)
            setFilters({
                [searchKey]: deb.length > 0 ? deb : null,
            });
    }, [deb]);

    const handleSubmit = async () => {
        // If the user is typing a query with multiple words, we want to stream the results
        const searchKey = getSearchKey(filters);

        if (searchKey)
            setFilters({
                [searchKey]: prompt.length > 0 ? prompt : null,
            });
    };
    const hasValidFilters = Object.entries(filters).filter(([key, value]) => {
        if (isSearchKey(key)) return false;
        if (value === null || value === undefined || value === "") return false;
        if (Array.isArray(value)) return value.length > 0;
        return true;
    }).length > 0;

    const __filters = (filterList || [])?.filter((a) => !isSearchKey(a.value));

    return (
        <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
            <div className="flex w-full flex-col gap-3 lg:flex-row lg:items-center lg:gap-4">
                <form
                    className="relative w-full lg:w-auto"
                    onSubmit={(e) => {
                        e.preventDefault();
                        handleSubmit();
                    }}
                >
                    <Icons.Search className="pointer-events-none absolute left-3 top-[11px] size-4" />
                    <Input
                        ref={inputRef}
                        placeholder={placeholder}
                        className="w-full pl-9 pr-24 lg:w-[350px] lg:pr-10"
                        value={prompt}
                        onChange={handleSearch}
                        autoComplete="off"
                        autoCapitalize="none"
                        autoCorrect="off"
                        spellCheck="false"
                    />
                    {!SearchTips || <SearchTip>{SearchTips}</SearchTip>}
                    <DropdownMenuTrigger
                        // className={cn(__filters.length || "hidden")}
                        asChild
                    >
                        <Button
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
                <FilterList
                    loading={streaming}
                    onRemove={(obj) => {
                        setFilters(obj);
                        const clearPrompt = Object.entries(obj).find(([k, v]) =>
                            isSearchKey(k),
                        )?.[0];
                        if (clearPrompt) setPrompt("");
                    }}
                    onClearAll={() => {
                        setFilters(null);
                        setPrompt("");
                    }}
                    filters={filters}
                    filterList={__filters}
                />
            </div>
            <DropdownMenuContent
                className={cn("w-[min(22rem,calc(100vw-2rem))] lg:w-[350px]")}
                sideOffset={19}
                alignOffset={-11}
                side="bottom"
                align="end"
            >
                {__filters?.map((f, i) => (
                    <DropdownMenuGroup key={i}>
                        <DropdownMenuSub>
                            <DropdownMenuSubTrigger>
                                <Icon
                                    name={searchIcons[f.value] as any}
                                    className={"mr-2 size-4"}
                                />
                                <span className="capitalize">
                                    {f.label || f.value?.split(".").join(" ")}
                                </span>
                            </DropdownMenuSubTrigger>
                            <DropdownMenuPortal>
                                <DropdownMenuSubContent
                                    sideOffset={14}
                                    alignOffset={-4}
                                    className="p-0"
                                >
                                    {f.type == "date-range" ? (
                                        <CalendarFilter filter={f} />
                                    ) : f.options?.length > 20 ? (
                                        <>
                                            <SelectTag
                                                headless
                                                data={f.options?.map((opt) => ({
                                                    ...opt,
                                                    label: opt.label,
                                                    id: opt.value,
                                                }))}
                                                onChange={(selected) => {
                                                    optionSelected(f.value, {
                                                        ...selected,
                                                        value: selected.id,
                                                    });
                                                }}
                                            />
                                        </>
                                    ) : (
                                        f.options?.map(
                                            ({ label, value }, _i) => (
                                                <DropdownMenuCheckboxItem
                                                    onCheckedChange={() => {
                                                        optionSelected(
                                                            f.value,
                                                            { value, label },
                                                        );
                                                    }}
                                                    key={_i}
                                                >
                                                    {label}
                                                </DropdownMenuCheckboxItem>
                                            ),
                                        )
                                    )}
                                </DropdownMenuSubContent>
                            </DropdownMenuPortal>
                        </DropdownMenuSub>
                    </DropdownMenuGroup>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
interface CalendarFilterProps {
    filter: PageFilterData;
}
function CalendarFilter({ filter }: CalendarFilterProps) {
    const {
        isFocused,
        isOpen,
        setIsOpen,
        shouldFetch,
        filters,
        setFilters,
        optionSelected,
    } = useSearchFilterContext();
    const isCurrentFilter = (_) => {
        const f = filters?.[filter.value];
        if (Array.isArray(f)) return _ === f?.[0];

        return false;
    };
    const dateValue = (filter, index) => {
        const f = filters?.[filter.value];
        if (Array.isArray(f) && f?.length > index) {
            const dates = transformFilterDateToQuery(f);
            const dv = index == 0 ? dates?.gte : dates?.lte; ///dates[index];
            // const dv = dates?.[index];
            if (index > 0)
                switch (f?.[0] as DaysFilters) {
                    case "today":
                    // case "tomorrow":
                    case "yesterday":
                        return undefined;
                        break;
                }
            return dv ? new Date(dv) : undefined;
        }
        return undefined;
    };
    return (
        <div className="flex">
            <Table className="">
                <TableBody>
                    {daysFilters.map((df) => (
                        <TableRow
                            onClick={(e) => {
                                setFilters({
                                    [filter.value]: [df],
                                });
                            }}
                            key={df}
                        >
                            <TableCell
                                className={cn(
                                    "capitalize flex gap-4 pr-12 cursor-pointer items-center",
                                    isCurrentFilter(df) && "font-semibold",
                                )}
                            >
                                <Icons.CheckCircle
                                    className={cn(
                                        "size-3",
                                        !isCurrentFilter(df)
                                            ? "opacity-20"
                                            : "",
                                    )}
                                />
                                {df}
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>

            <Calendar
                mode="range"
                initialFocus
                selected={{
                    from: dateValue(filter, 0),
                    to: dateValue(filter, 1),
                }}
                onSelect={(range) => {
                    let value = [
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
                    console.log([value, filter]);
                    setFilters({
                        [filter.value]: value, //.join(","),
                    });
                }}
            />
        </div>
    );
}
function SearchTip({ children }) {
    return (
        <HoverCard>
            <HoverCardTrigger asChild>
                <button
                    type="button"
                    className="absolute opacity-50 transition-opacity duration-300 hover:opacity-100 right-10 top-[10px] z-10"
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
