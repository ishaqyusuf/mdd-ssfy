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
import { Icon } from "@gnd/ui/custom/icons";
import { PageFilterData } from "@api/type";
import { Calendar } from "@gnd/ui/calendar";

interface Props {
    // filters;
    // setFilters;
    defaultSearch?;
    placeholder?;
    filterList?: PageFilterData[];
}

export function SearchFilterTRPC({
    placeholder,
    defaultSearch = {},
    filterList,
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
    const hasValidFilters =
        Object.entries(filters).filter(
            ([key, value]) => value !== null && !isSearchKey(key),
        ).length > 0;

    const __filters = (filterList || [])?.filter((a) => !isSearchKey(a.value));
    return (
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
                        // className={cn(__filters.length || "hidden")}
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
                        const clearPrompt = Object.entries(obj).find(([k, v]) =>
                            isSearchKey(k),
                        )?.[0];
                        if (clearPrompt) setPrompt("");
                    }}
                    filters={filters}
                    filterList={__filters}
                />
            </div>
            <DropdownMenuContent
                className={cn("w-[350px]")}
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
                                        <Calendar
                                            mode="range"
                                            initialFocus
                                            selected={{
                                                from: filters?.[f.value]?.split(
                                                    ",",
                                                )?.[0]
                                                    ? new Date(
                                                          filters?.[
                                                              f.value
                                                          ]?.split(",")?.[0],
                                                      )
                                                    : undefined,
                                                to: filters?.[f.value]?.split(
                                                    ",",
                                                )?.[1]
                                                    ? new Date(
                                                          filters?.[
                                                              f.value
                                                          ]?.split(",")?.[1],
                                                      )
                                                    : undefined,
                                            }}
                                            onSelect={(range) => {
                                                let value = [
                                                    range?.from
                                                        ? formatISO(
                                                              range.from,
                                                              {
                                                                  representation:
                                                                      "date",
                                                              },
                                                          )
                                                        : "-",
                                                    range?.to
                                                        ? formatISO(range.to, {
                                                              representation:
                                                                  "date",
                                                          })
                                                        : "-",
                                                ];

                                                setFilters({
                                                    [f.value]: value.join(","),
                                                });
                                            }}
                                        />
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
