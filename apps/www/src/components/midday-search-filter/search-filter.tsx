"use client";

import { useEffect, useRef, useState } from "react";
import { useDebounce } from "@/hooks/use-debounce";
import { cn } from "@/lib/utils";
import { useQueryStates } from "nuqs";
import { useHotkeys } from "react-hotkeys-hook";
import { formatISO } from "date-fns";
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
import { Input } from "@gnd/ui/input";

import { Icon, Icons } from "../_v1/icons";
import { searchParamsParser } from "../(clean-code)/data-table/search-params";
import { SelectTag } from "../select-tag";
import { FilterList } from "./filter-list";
import { searchIcons } from "./search-icons";
import { Calendar } from "@gnd/ui/calendar";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@gnd/ui/select";
import { PageFilterData } from "@/types/type";

interface Props {
    // filters;
    // setFilters;
    defaultSearch?;
    placeholder?;
    filterList?: PageFilterData[];
}

const isSearch = (k) => ["search", "_q", "q"].includes(k);
export function MiddaySearchFilter({
    // filters,
    placeholder,
    // setFilters,
    defaultSearch = {},
    filterList: _filters,
}: Props) {
    const filterList = _filters?.map((s) => {
        if (typeof s === "object") return s;
        return { value: s, label: s } as any;
    });
    const queryParams = Object.fromEntries(
        Object.entries(searchParamsParser).filter(([k, v]) =>
            filterList?.find((a) => a?.value === k),
        ),
    );

    const [filters, setFilters] = useQueryStates(queryParams, {
        shallow: false,
    });
    const [prompt, setPrompt] = useState("");
    const inputRef = useRef<HTMLInputElement>(null);
    const [isOpen, setIsOpen] = useState(false);
    const [streaming, setStreaming] = useState(false);

    useHotkeys(
        "esc",
        () => {
            setPrompt("");
            setFilters(defaultSearch);
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
            setFilters(defaultSearch);
            setPrompt("");
        }
    };
    const deb = useDebounce(prompt, 1500);
    const hasMounted = useRef(false);
    useEffect(() => {
        if (!hasMounted.current) {
            hasMounted.current = true;
            return;
        }
        setFilters({
            search: deb.length > 0 ? deb : null,
        });
    }, [deb]);
    const handleSubmit = async () => {
        // If the user is typing a query with multiple words, we want to stream the results

        setFilters({ search: prompt.length > 0 ? prompt : null });
    };
    const hasValidFilters =
        Object.entries(filters).filter(
            ([key, value]) => value !== null && !isSearch(value),
        ).length > 0;
    function optionSelected(qk, { label, value }) {
        setFilters({
            [qk]: filters?.[qk]?.includes(value)
                ? filters?.[qk].filter((s) => s !== value)
                : [...(filters?.[qk] ?? []), value],
        });
    }
    const __label = (name) =>
        name
            .split(".")
            .map(
                (part) =>
                    part
                        .replace(/([A-Z])/g, " $1") // insert space before capital letters
                        .replace(/^./, (c) => c.toUpperCase()), // capitalize first letter
            )
            .join(" ");
    const __filters = filterList?.filter((a) => !isSearch(a.value));
    return (
        <>
            <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
                <div className="flex items-center space-x-4">
                    <form
                        className="relative"
                        onSubmit={(e) => {
                            e.preventDefault();
                            handleSubmit();
                        }}
                    >
                        <Icons.Search className="pointer-events-none absolute left-3 top-[11px] size-4" />
                        <Input
                            ref={inputRef}
                            placeholder={placeholder}
                            className="w-full pl-9 pr-8 md:w-[350px]"
                            value={prompt}
                            onChange={handleSearch}
                            autoComplete="off"
                            autoCapitalize="none"
                            autoCorrect="off"
                            spellCheck="false"
                        />
                        <DropdownMenuTrigger
                            className={cn(__filters.length || "hidden")}
                            asChild
                        >
                            <button
                                onClick={() => setIsOpen((prev) => !prev)}
                                type="button"
                                className={cn(
                                    "absolute right-3 top-[10px] z-10 opacity-50 transition-opacity duration-300 hover:opacity-100",
                                    hasValidFilters && "opacity-100",
                                    isOpen && "opacity-100",
                                )}
                            >
                                <Icons.Filter className="size-4" />
                            </button>
                        </DropdownMenuTrigger>
                    </form>
                    <FilterList
                        loading={streaming}
                        onRemove={(obj) => {
                            setFilters(obj);
                            const clearPrompt = Object.entries(obj).find(
                                ([k, v]) => isSearch(k),
                            );
                            if (clearPrompt) setPrompt("");
                        }}
                        filters={filters}
                        filterList={filterList}
                    />
                </div>
                <DropdownMenuContent
                    className="w-[350px]"
                    sideOffset={19}
                    alignOffset={-11}
                    side="bottom"
                    align="end"
                >
                    {__filters?.map((f) => (
                        <DropdownMenuGroup key={f.value}>
                            <DropdownMenuSub>
                                <DropdownMenuSubTrigger>
                                    <Icon
                                        name={searchIcons[f.value]}
                                        className={"mr-2 size-4"}
                                    />
                                    <span className="capitalize">
                                        {__label(f.value)}
                                    </span>
                                </DropdownMenuSubTrigger>
                                <DropdownMenuPortal>
                                    <DropdownMenuSubContent
                                        sideOffset={14}
                                        alignOffset={-4}
                                        className="p-0"
                                    >
                                        {f.type == "date-range" ||
                                        f.type == "date" ? (
                                            <>
                                                <CalendarForm
                                                    value={filters?.[f.value]}
                                                    setFilters={setFilters}
                                                    filter={f}
                                                />
                                            </>
                                        ) : (
                                            <>
                                                {f.options?.length > 20 ? (
                                                    <>
                                                        <SelectTag
                                                            headless
                                                            data={f.options?.map(
                                                                (opt) => ({
                                                                    label: opt.label,
                                                                    id: opt.value,
                                                                }),
                                                            )}
                                                            onChange={(
                                                                selected,
                                                            ) => {
                                                                optionSelected(
                                                                    f.value,
                                                                    {
                                                                        ...selected,
                                                                        value: selected.id,
                                                                    },
                                                                );
                                                            }}
                                                        />
                                                    </>
                                                ) : (
                                                    f.options?.map(
                                                        (
                                                            { label, value },
                                                            _i,
                                                        ) => (
                                                            <DropdownMenuCheckboxItem
                                                                onCheckedChange={() => {
                                                                    optionSelected(
                                                                        f.value,
                                                                        {
                                                                            value,
                                                                            label,
                                                                        },
                                                                    );
                                                                }}
                                                                key={_i}
                                                            >
                                                                {label}
                                                            </DropdownMenuCheckboxItem>
                                                        ),
                                                    )
                                                )}
                                            </>
                                        )}
                                    </DropdownMenuSubContent>
                                </DropdownMenuPortal>
                            </DropdownMenuSub>
                        </DropdownMenuGroup>
                    ))}
                </DropdownMenuContent>
            </DropdownMenu>
        </>
    );
}
function CalendarForm({ value, filter, setFilters }) {
    const { value: filterKey, options } = filter;
    const [start, end] = value || [];
    return (
        <>
            <Select
                onValueChange={(value) => {
                    setFilters({
                        [filterKey]: [value],
                    });
                }}
            >
                <SelectTrigger>
                    <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent position="popper">
                    <SelectItem value="yesterday">Yesterday</SelectItem>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="tomorrow">Tomorrow</SelectItem>
                    {/* <SelectGroup */}
                    <SelectItem value="this week">This Week</SelectItem>
                    <SelectItem value="last week">Last Week</SelectItem>
                    <SelectItem value="next week">Next Week</SelectItem>
                    <SelectItem value="this month">This Month</SelectItem>
                    <SelectItem value="last month">Last Month</SelectItem>
                    <SelectItem value="next month">Next Month</SelectItem>
                </SelectContent>
            </Select>
            <Calendar
                mode="range"
                initialFocus
                // toDate={new Date()}
                selected={{
                    from: start ? new Date(start) : undefined,
                    to: end ? new Date(end) : undefined,
                }}
                onSelect={({ from, to }) => {
                    const value = [
                        from
                            ? formatISO(from, {
                                  representation: "date",
                              })
                            : null,
                        to
                            ? formatISO(to, {
                                  representation: "date",
                              })
                            : null,
                    ];
                    setFilters({
                        [filterKey]: value,
                    });
                }}
            />
        </>
    );
}
