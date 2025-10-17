"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { SEPARATOR } from "@/app/(clean-code)/(sales)/_common/utils/contants";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { cn } from "@/lib/utils";
import { useInfiniteQuery } from "@gnd/ui/tanstack";
import { formatDistanceToNow } from "date-fns";
import { LoaderCircle, Search, X } from "lucide-react";
import type { z } from "zod";

import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
    CommandSeparator,
} from "@gnd/ui/command";
import { Separator } from "@gnd/ui/separator";

import { Kbd } from "../../kbd";
import { searchSchema } from "../search-params";
import { DataTableFilterField } from "../type";
import { useDataTableContext } from "../use-data-table";
import { deserialize, serializeColumFilters } from "../utils";
import {
    __filterKeyInSearch,
    __findFilterField,
    __getTableCol,
} from "./filters";
import {
    getFieldOptions,
    getFilterValue,
    getWordByCaretPosition,
    replaceInputByFieldType,
} from "./utils";

// FIXME: there is an issue on cmdk if I wanna only set a single slider value...

interface DataTableFilterCommandProps<TData, TSchema extends z.AnyZodObject> {
    // table: Table<TData>;
    // schema: TSchema;
    filterFields?: DataTableFilterField<TData>[];
    isLoading?: boolean;
}

export function DataTableFilterCommand<TData, TSchema extends z.AnyZodObject>({
    // schema,
    // table,
    // filterFields: _filterFields,
    isLoading,
}: DataTableFilterCommandProps<TData, TSchema>) {
    const { table, filterFields: _filterFields } = useDataTableContext();
    const columnFilters = table.getState().columnFilters;
    const inputRef = useRef<HTMLInputElement>(null);
    const [open, setOpen] = useState<boolean>(false);
    const [currentWord, setCurrentWord] = useState<string>("");
    const filterFields = useMemo(
        () => _filterFields?.filter((i) => !i.commandDisabled),
        [_filterFields],
    );
    const [inputValue, setInputValue] = useState<string>(
        serializeColumFilters(columnFilters, filterFields),
    );
    const [lastSearches, setLastSearches] = useLocalStorage<
        {
            search: string;
            timestamp: number;
        }[]
    >("data-table-command", []);

    useEffect(() => {
        // TODO: we could check for ARRAY_DELIMITER or SLIDER_DELIMITER to auto-set filter when typing
        if (currentWord !== "" && open) return;
        // reset
        if (currentWord !== "" && !open) setCurrentWord("");
        // avoid recursion
        if (inputValue.trim() === "" && !open) return;

        // FIXME: that stuff is BAD!
        const searchParams = deserialize(searchSchema)(inputValue);
        const currentFilters = table.getState().columnFilters;
        const currentEnabledFilters = currentFilters.filter((filter) => {
            const field = _filterFields?.find((field) =>
                __findFilterField(field, filter),
            );
            return !field?.commandDisabled;
        });
        const currentDisabledFilters = currentFilters.filter((filter) => {
            const field = _filterFields?.find((field) =>
                __findFilterField(field, filter),
            );
            return field?.commandDisabled;
        });

        const commandDisabledFilterKeys = currentDisabledFilters.reduce(
            (prev, curr) => {
                prev[curr.id] = curr.value;
                return prev;
            },
            {} as Record<string, unknown>,
        );
        if (searchParams.success && !inputValue?.endsWith(" ")) {
            for (const key of Object.keys(searchParams.data)) {
                const value =
                    searchParams.data[key as keyof typeof searchParams.data];
                const col = __getTableCol(table, key);

                col?.setFilterValue(value);
            }
            const currentFiltersToReset = currentEnabledFilters.filter(
                (filter) => {
                    return !__filterKeyInSearch(filter.id, searchParams.data);
                    // return !(dotFilterKey(filter.id) in searchParams.data);
                },
            );
            for (const filter of currentFiltersToReset) {
                table.getColumn(filter.id)?.setFilterValue(undefined);
            }
        } else {
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [inputValue, open, currentWord]);

    useEffect(() => {
        // REMINDER: only update the input value if the command is closed (avoids jumps while open)
        if (!open) {
            // const _colFilters = columnFilters?.map((f) => {
            //     f.id = f.id?.split("_")?.join(".");
            //     return f;
            // });
            const ser = serializeColumFilters(columnFilters, filterFields);

            setInputValue(ser);
        }
    }, [columnFilters, filterFields, open]);

    useEffect(() => {
        const down = (e: KeyboardEvent) => {
            if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                setOpen((open) => !open);
            }
        };
        document.addEventListener("keydown", down);
        return () => document.removeEventListener("keydown", down);
    }, []);

    useEffect(() => {
        if (open) {
            inputRef?.current?.focus();
        }
    }, [open]);
    const [currentFilter, setCurrentFilter] = useState(null);
    useEffect(() => {
        setCurrentFilter(
            currentWord
                ?.split(SEPARATOR)
                ?.reverse()?.[0]
                ?.split(":")?.[0]
                ?.trim(),
        );
    }, [currentWord]);
    return (
        <div>
            {/* <div>
                <p>currentWord:{currentWord}</p>
                <p>inputValue:{inputValue}</p>
            </div> */}
            <button
                type="button"
                className={cn(
                    "group flex w-full items-center rounded-lg border border-input bg-background px-3 text-muted-foreground ring-offset-background focus-within:outline-none focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 hover:bg-accent hover:text-accent-foreground",
                    open ? "hidden" : "visible",
                )}
                onClick={() => setOpen(true)}
            >
                {isLoading ? (
                    <LoaderCircle className="mr-2 h-4 w-4 shrink-0 animate-spin text-muted-foreground opacity-50 group-hover:text-popover-foreground" />
                ) : (
                    <Search className="mr-2 h-4 w-4 shrink-0 text-muted-foreground opacity-50 group-hover:text-popover-foreground" />
                )}
                <span className="h-11 w-full max-w-sm truncate py-3 text-left text-sm outline-none disabled:cursor-not-allowed disabled:opacity-50 md:max-w-xl lg:max-w-4xl xl:max-w-5xl">
                    {inputValue.trim() ? (
                        <span className="text-foreground">{inputValue}</span>
                    ) : (
                        <span>Search data table...</span>
                    )}
                </span>
                <Kbd className="ml-auto text-muted-foreground group-hover:text-accent-foreground">
                    <span className="mr-0.5">⌘</span>
                    <span>K</span>
                </Kbd>
            </button>
            <Command
                className={cn(
                    "overflow-visible rounded-lg border shadow-md [&>div]:border-none",
                    open ? "visible" : "hidden",
                )}
                filter={
                    ((value, search, keywords) =>
                        getFilterValue({
                            value,
                            search,
                            keywords,
                            currentWord,
                            currentFilter,
                        })) as any
                }
                // loop
            >
                <CommandInput
                    ref={inputRef}
                    value={inputValue}
                    onValueChange={setInputValue}
                    onPaste={(e) => {
                        const pv = e.clipboardData.getData("text");

                        const value = inputValue;
                        if (!value && pv) {
                            setInputValue(`search:${pv}`);
                            setCurrentWord(`search:${pv}`);
                            e.preventDefault(); // Block the input
                        }
                    }}
                    onKeyDown={(e) => {
                        // if (e.metaKey && e.key.toLowerCase() === "v") return; // Allow paste (Meta+V)
                        // if (e.ctrlKey && e.key.toLowerCase() === "v") return;
                        const allowedKeys = /^[a-zA-Z0-9]*$/; // Alphanumeric characters
                        const value = inputValue;
                        // Check if the key is not alphanumeric or a control key

                        if (
                            allowedKeys.test(e.key) &&
                            !value &&
                            !e.metaKey &&
                            !e.ctrlKey &&
                            !e.altKey
                        ) {
                            setInputValue(`search:${e.key}`);
                            setCurrentWord(`search:${e.key}`);
                            e.preventDefault(); // Block the input
                        }
                        if (e.key === "Escape") inputRef?.current?.blur();
                        else if (e.key === "Backspace") {
                            const caretPosition =
                                inputRef?.current?.selectionStart || 0;
                            if (value.endsWith("&")) {
                                const precedingWordIndex = value.lastIndexOf(
                                    " &",
                                    caretPosition - 2,
                                );
                                if (precedingWordIndex !== -1) {
                                    const updatedValue =
                                        value.slice(0, precedingWordIndex) +
                                        value.slice(caretPosition);
                                    setInputValue(updatedValue);
                                    setCurrentWord(updatedValue);
                                    e.preventDefault(); // Prevent default backspace behavior
                                }
                            }
                            if (value.endsWith(":")) {
                                const lastColonIndex = value.lastIndexOf(
                                    ":",
                                    caretPosition - 1,
                                );
                                const precedingWordIndex =
                                    value.lastIndexOf(" ", lastColonIndex - 1) +
                                        1 || 0;
                                const isSeparatorBefore =
                                    value[precedingWordIndex] === "&";
                                // console.log({
                                //     isSeparatorBefore,
                                //     i: value[precedingWordIndex - 1],
                                //     is: value[precedingWordIndex],
                                //     value,
                                // });

                                const updatedValue = isSeparatorBefore
                                    ? value.slice(0, precedingWordIndex + 1) +
                                      value.slice(caretPosition)
                                    : "" + value.slice(caretPosition);
                                setInputValue(updatedValue);

                                setCurrentWord("");
                                e.preventDefault(); // Prevent default backspace behavior
                            }
                        }
                    }}
                    onBlur={() => {
                        setOpen(false);
                        // FIXME: doesnt reflect the jumps
                        // FIXME: will save non-existing searches
                        // TODO: extract into function
                        const search = inputValue.trim();
                        if (!search) return;
                        const timestamp = Date.now();
                        const searchIndex = lastSearches.findIndex(
                            (item) => item.search === search,
                        );
                        if (searchIndex !== -1) {
                            lastSearches[searchIndex].timestamp = timestamp;
                            setLastSearches(lastSearches);
                            return;
                        }
                        setLastSearches([
                            ...lastSearches,
                            { search, timestamp },
                        ]);
                        return;
                    }}
                    onInput={(e) => {
                        const caretPosition =
                            e.currentTarget?.selectionStart || -1;
                        const value = e.currentTarget?.value || "";
                        const filteredValue = value.replace(
                            /[^a-zA-Z0-9,\-_.\s]/g,
                            "",
                        );

                        if (filteredValue == value) {
                            setInputValue(filteredValue);
                            return;
                        }
                        const word = getWordByCaretPosition({
                            value,
                            caretPosition,
                        });

                        setCurrentWord(word);
                    }}
                    placeholder="Search data table..."
                    className="text-foreground"
                />
                <div className="relative">
                    <div className="absolute top-2 z-10 w-full overflow-hidden rounded-lg border border-accent-foreground/30 bg-popover text-popover-foreground shadow-md outline-none animate-in">
                        {/* default height is 300px but in case of more, we'd like to tease the user */}
                        <CommandList className="max-h-[310px]">
                            <CommandGroup heading="Filter">
                                {filterFields?.map((field) => {
                                    if (typeof field.value !== "string")
                                        return null;
                                    if (inputValue.includes(`${field.value}:`))
                                        return null;
                                    return (
                                        <CommandItem
                                            key={field.value}
                                            value={field.value}
                                            onMouseDown={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                            }}
                                            onSelect={(value) => {
                                                setInputValue((prev) => {
                                                    if (
                                                        currentWord.trim() ===
                                                        ""
                                                    ) {
                                                        const input = `${prev}${value}`;
                                                        return `${input}:`;
                                                    }
                                                    // lots of cheat
                                                    const isStarting =
                                                        currentWord === prev;
                                                    const prefix = isStarting
                                                        ? ""
                                                        : " ";
                                                    const input = prev.replace(
                                                        `${prefix}${currentWord}`,
                                                        `${prefix}${value}`,
                                                    );
                                                    return `${input}:`;
                                                });
                                                setCurrentWord(`${value}:`);
                                            }}
                                            className="group"
                                        >
                                            {field.value}
                                            <CommandItemSuggestions
                                                field={field}
                                            />
                                        </CommandItem>
                                    );
                                })}
                            </CommandGroup>
                            <CommandSeparator />
                            <CommandGroup heading="Query">
                                {filterFields?.map((field, findex) => {
                                    if (typeof field.value !== "string") {
                                        return null;
                                    }

                                    if (currentFilter != field.value) {
                                        return null;
                                    }

                                    const column = table.getColumn(field.value);
                                    const facetedValue =
                                        column?.getFacetedUniqueValues();

                                    const options = getFieldOptions({ field });

                                    // Track if the current word exists in the options
                                    const optionExists = options.some(
                                        (optionValue) =>
                                            `${
                                                (field as any).value
                                            }:${optionValue}` === currentWord,
                                    );
                                    const createWord = currentWord
                                        ?.split(":")
                                        ?.reverse()?.[0];

                                    return (
                                        <>
                                            {!optionExists && createWord && (
                                                <CommandItem
                                                    key={`${currentWord}`}
                                                    value={currentWord?.trim()}
                                                    onMouseDown={(e) => {
                                                        e.preventDefault();
                                                        e.stopPropagation();
                                                    }}
                                                    onSelect={(value) => {
                                                        setInputValue(
                                                            (prev) => {
                                                                const input = `${value}${SEPARATOR}`;

                                                                return prev.includes(
                                                                    input,
                                                                )
                                                                    ? prev
                                                                    : `${prev}${SEPARATOR}`.trim();
                                                            },
                                                        );
                                                        setCurrentWord("");
                                                        setTimeout(() => {
                                                            setOpen(false);
                                                        }, 500);
                                                        // Optionally, you can add logic here to handle adding this new option to the options array if needed
                                                    }}
                                                >
                                                    Click Enter to search {'"'}
                                                    {createWord}
                                                    {'"'}
                                                </CommandItem>
                                            )}

                                            <InfinityScroll
                                                filterQuery={createWord}
                                                filterKey={currentFilter}
                                                options={options}
                                                valuePrefix={`${field.value}:`}
                                                onMouseDown={(e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                }}
                                                onSelect={(
                                                    value,
                                                    optionValue,
                                                ) => {
                                                    setInputValue((prev) =>
                                                        replaceInputByFieldType(
                                                            {
                                                                prev,
                                                                currentWord,
                                                                optionValue,
                                                                value,
                                                                field,
                                                            },
                                                        ),
                                                    );
                                                    setCurrentWord("");
                                                }}
                                                RenderItem={({
                                                    optionValue,
                                                }) => (
                                                    <>
                                                        {`${optionValue}`}
                                                        {facetedValue?.has(
                                                            optionValue,
                                                        ) ? (
                                                            <span className="ml-auto font-mono$ text-muted-foreground">
                                                                {facetedValue?.get(
                                                                    optionValue,
                                                                )}
                                                                sa
                                                            </span>
                                                        ) : null}
                                                    </>
                                                )}
                                            />
                                        </>
                                    );
                                })}
                            </CommandGroup>

                            <CommandSeparator />
                            <CommandGroup
                                className="hidden"
                                heading="Suggestions"
                            >
                                {lastSearches
                                    ?.sort((a, b) => b.timestamp - a.timestamp)
                                    .slice(0, 5)
                                    .map((item) => {
                                        return (
                                            <CommandItem
                                                key={`suggestion:${item.search}`}
                                                value={`suggestion:${item.search}`}
                                                onMouseDown={(e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                }}
                                                onSelect={(value) => {
                                                    const search =
                                                        value.replace(
                                                            "suggestion:",
                                                            "",
                                                        );
                                                    setInputValue(`${search} `);
                                                    setCurrentWord("");
                                                }}
                                                className="group"
                                            >
                                                {item.search}
                                                <span className="ml-auto truncate text-muted-foreground/80 group-aria-[selected=true]:block">
                                                    {formatDistanceToNow(
                                                        item.timestamp,
                                                        {
                                                            addSuffix: true,
                                                        },
                                                    )}
                                                </span>
                                                <button
                                                    type="button"
                                                    onMouseDown={(e) => {
                                                        e.preventDefault();
                                                        e.stopPropagation();
                                                    }}
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        e.stopPropagation();
                                                        // TODO: extract into function
                                                        setLastSearches(
                                                            lastSearches.filter(
                                                                (i) =>
                                                                    i.search !==
                                                                    item.search,
                                                            ),
                                                        );
                                                    }}
                                                    className="ml-1 hidden rounded-md p-0.5 hover:bg-background group-aria-[selected=true]:block"
                                                >
                                                    <X className="h-4 w-4" />
                                                </button>
                                            </CommandItem>
                                        );
                                    })}
                            </CommandGroup>
                            <CommandEmpty>No results found.</CommandEmpty>
                        </CommandList>
                        <div
                            className="flex flex-wrap justify-between gap-3 border-t bg-accent/50 px-2 py-1.5 text-sm text-accent-foreground"
                            cmdk-footer=""
                        >
                            <div className="flex flex-wrap gap-3">
                                <span>
                                    Use <Kbd variant="outline">↑</Kbd>{" "}
                                    <Kbd variant="outline">↓</Kbd> to navigate
                                </span>
                                <span>
                                    <Kbd variant="outline">Enter</Kbd> to query
                                </span>
                                <span>
                                    <Kbd variant="outline">Esc</Kbd> to close
                                </span>
                                <Separator
                                    orientation="vertical"
                                    className="my-auto h-3"
                                />
                                {/* <span>
                                    Union:{" "}
                                    <Kbd variant="outline">regions:a,b</Kbd>
                                </span>
                                <span>
                                    Range:{" "}
                                    <Kbd variant="outline">p95:59-340</Kbd>
                                </span> */}
                            </div>
                            {lastSearches.length ? (
                                <button
                                    type="button"
                                    className="text-muted-foreground hover:text-accent-foreground"
                                    onMouseDown={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                    }}
                                    onClick={() => setLastSearches([])}
                                >
                                    Clear suggestions
                                </button>
                            ) : null}
                        </div>
                    </div>
                </div>
            </Command>
        </div>
    );
}

function InfinityScroll({
    options,
    filterQuery,
    valuePrefix,
    onMouseDown,
    onSelect,
    RenderItem,
    filterKey,
}) {
    const [searchQuery, setSearchQuery] = useState(filterQuery);
    const debounceTimeout = 300; // 300ms debounce time
    useEffect(() => {
        const handler = setTimeout(() => {
            setSearchQuery(filterQuery);
        }, debounceTimeout);

        return () => clearTimeout(handler);
    }, [filterQuery]);
    const fetchItems = ({ pageParam = 0, query = "" }) => {
        const pageSize = 20;
        const filtered = query
            ? options.filter((item) =>
                  item.toLowerCase().includes(query.toLowerCase()),
              )
            : options;
        const items = filtered.slice(pageParam, pageParam + pageSize);

        return {
            items,
            nextPage: pageParam + pageSize,
            hasNextPage: pageParam + pageSize < filtered.length,
        };
    };
    const fetchItemsMemoized = useMemo(
        () => fetchItems,
        [options, filterQuery],
    );
    // useEffect(() => {
    //     refetch();

    // }, [filterQuery]);
    const queryKey = ["items", filterKey, searchQuery];

    const { data, fetchNextPage, hasNextPage, isFetchingNextPage, refetch } =
        useInfiniteQuery({
            queryKey,
            queryFn: ({ pageParam = 0 }) =>
                fetchItemsMemoized({ pageParam, query: filterQuery }),
            initialPageParam: 0,
            // getNextPageParam: (lastPage) =>
            //     lastPage.hasNextPage ? lastPage.nextPage : undefined,
            getNextPageParam: (_lastGroup, groups) => groups.length,
            refetchOnWindowFocus: false,

            // initialData: () =>
            //     ({
            //         pages: [
            //             {
            //                 items: itemList.slice(0, 20),
            //                 nextPage: 20,
            //                 hasNextPage: true,
            //             },
            //         ] as any,
            //     } as any),
            // initialData: {
            //     pages: [
            //         {
            //             items: itemList.slice(0, 20),
            //             nextPage: 20,

            //             hasNextPage: itemList.length > 20,
            //         },
            //     ],
            // },
            // initialData: {
            //     pages: [
            //         {

            //         }
            //     ]
            // },
        });
    return (
        <>
            {data?.pages?.map((page, pageIndex) =>
                page.items.map((item, index) => (
                    <CommandItem
                        onMouseDown={onMouseDown}
                        onSelect={(e) => onSelect(e, item)}
                        value={`${String(valuePrefix)}${item}`}
                        key={`${pageIndex}-${index}`}
                    >
                        {RenderItem ? <RenderItem optionValue={item} /> : item}
                    </CommandItem>
                )),
            )}
            {isFetchingNextPage && (
                <div className="loading-spinner">Loading more...</div>
            )}
        </>
    );
}
// function CommandItemType<TData>

function CommandItemSuggestions<TData>({
    field,
}: {
    field: DataTableFilterField<TData>;
}) {
    switch (field.type) {
        case "checkbox": {
            return (
                <span className="ml-1 hidden truncate text-muted-foreground/80 group-aria-[selected=true]:block">
                    {field.options?.map(({ value }) => `[${value}]`).join(" ")}
                </span>
            );
        }
        case "slider": {
            return (
                <span className="ml-1 hidden truncate text-muted-foreground/80 group-aria-[selected=true]:block">
                    [{field.min} - {field.max}]
                </span>
            );
        }
        case "input": {
            return (
                <span className="ml-1 hidden truncate text-muted-foreground/80 group-aria-[selected=true]:block">
                    [{`${String(field.value)}`} input]
                </span>
            );
        }
        default: {
            return null;
        }
    }
}
