import { useTRPC } from "@/trpc/client";
import {
    Command,
    CommandEmpty,
    CommandInput,
    CommandList,
} from "@gnd/ui/command";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useRef, useState } from "react";
import { useDebounceValue } from "usehooks-ts";
interface SearchItem {
    id: string;
    type: string;
    title: string;
    data?: {
        name?: string;
        email?: string;
        invoice_number?: string;
        status?: string;
        amount?: number;
        currency?: string;
        date?: string;
        display_name?: string;
        file_name?: string;
        file_path?: string[];
        path_tokens?: string[];
        title?: string;
        metadata?: {
            mimetype?: string;
        };
        template?: {
            size?: string;
        };
        url?: string;
    };
    action?: () => void;
}
export function Search({}) {
    const searchInputRef = useRef<HTMLInputElement>(null);
    const ref = useRef<HTMLDivElement>(null);
    const [debounceDelay, setDebounceDelay] = useState(200);
    const height = useRef<HTMLDivElement>(null);
    const [debouncedSearch, setDebouncedSearch] = useDebounceValue(
        "",
        debounceDelay,
    );
    const trpc = useTRPC();
    const sectionActions: SearchItem[] = [
        // {
        //     id: "sc-create-invoice",
        //     type: "invoice",
        //     title: "Create invoice",
        //     action: nav.createInvoice,
        // },
        // {
        //     id: "sc-create-customer",
        //     type: "customer",
        //     title: "Create customer",
        //     action: nav.createCustomer,
        // },
        // {
        //     id: "sc-create-transaction",
        //     type: "transaction",
        //     title: "Create transaction",
        //     action: nav.createTransaction,
        // },
        // {
        //     id: "sc-create-project",
        //     type: "tracker_project",
        //     title: "Create project",
        //     action: nav.createProject,
        // },
        // {
        //     id: "sc-track-time",
        //     type: "tracker_project",
        //     title: "Track time",
        //     action: nav.trackTime,
        // },
        // {
        //     id: "sc-view-documents",
        //     type: "vault",
        //     title: "View vault",
        //     action: () => nav.navigateToPath("/vault"),
        // },
        // {
        //     id: "sc-view-customers",
        //     type: "customer",
        //     title: "View customers",
        //     action: () => nav.navigateToPath("/customers"),
        // },
        // {
        //     id: "sc-view-transactions",
        //     type: "transaction",
        //     title: "View transactions",
        //     action: () => nav.navigateToPath("/transactions"),
        // },
        // {
        //     id: "sc-view-inbox",
        //     type: "inbox",
        //     title: "View inbox",
        //     action: () => nav.navigateToPath("/inbox"),
        // },
        // {
        //     id: "sc-view-invoices",
        //     type: "invoice",
        //     title: "View invoices",
        //     action: () => nav.navigateToPath("/invoices"),
        // },
        // {
        //     id: "sc-view-tracker",
        //     type: "tracker_project",
        //     title: "View tracker",
        //     action: () => nav.navigateToPath("/tracker"),
        // },
    ];
    const {
        data: queryResult,
        isLoading,
        isFetching,
    } = useQuery({
        ...trpc.search.global.queryOptions({
            searchTerm: debouncedSearch,
        }),
        placeholderData: (previousData) => previousData,
    }); // Extract search results array from queryResult
    const searchResults: SearchItem[] = queryResult || [];

    const combinedData = useMemo(() => {
        // Type assertion for searchResults from DB to ensure they have actions if needed,
        // or map them to include default actions. For now, assuming they come with 'type' and 'title'.
        const mappedSearchResults = searchResults.map((res) => ({
            ...res,
            action: () => {},
        }));
        return [...mappedSearchResults];
    }, [debouncedSearch, searchResults]);
    const groupedData = useMemo(() => {
        const groups: Record<string, SearchItem[]> = {};
        // Group search results first
        for (const item of combinedData) {
            const groupKey = item.type || "other";
            if (!groups[groupKey]) {
                groups[groupKey] = [];
            }
            groups[groupKey].push(item);
        }

        // Filter sectionActions based on debouncedSearch
        const filteredSectionActions = debouncedSearch
            ? sectionActions.filter((action) =>
                  action.title
                      .toLowerCase()
                      .includes(debouncedSearch.toLowerCase()),
              )
            : sectionActions;

        // Add filtered sectionActions to their respective groups
        for (const actionItem of filteredSectionActions) {
            const groupKey = actionItem.type;
            if (!groups[groupKey]) {
                groups[groupKey] = [];
            }
            groups[groupKey].push(actionItem);
        }

        const definedGroupOrder = [
            "vault",
            "customer",
            "invoice",
            "transaction",
            "tracker_project",
            "inbox",
        ];

        const allGroupKeysInOrder: string[] = [];
        const addedKeys = new Set<string>();

        // Add groups based on defined order if they exist
        for (const key of definedGroupOrder) {
            if (groups[key]) {
                allGroupKeysInOrder.push(key);
                addedKeys.add(key);
            }
        }
        // Add any remaining groups that weren't in the defined order
        for (const key in groups) {
            if (groups[key] && groups[key].length > 0 && !addedKeys.has(key)) {
                allGroupKeysInOrder.push(key);
                addedKeys.add(key);
            }
        }

        const orderedGroups: Record<string, SearchItem[]> = {};
        for (const key of allGroupKeysInOrder) {
            if (groups[key] && groups[key].length > 0) {
                // Ensure group is not empty before adding
                orderedGroups[key] = groups[key];
            }
        }
        return orderedGroups;
    }, [combinedData, debouncedSearch]);
    return (
        <Command
            shouldFilter={false}
            className="search-container overflow-hidden p-0 relative w-full bg-background backdrop-filter dark:border-[#2C2C2C] backdrop-blur-lg dark:bg-[#151515]/[99] h-auto border border-border"
        >
            <div className="border-b border-border relative">
                <CommandInput
                    ref={searchInputRef}
                    placeholder="Type a command or search..."
                    onValueChange={(value: string) => {
                        setDebouncedSearch(value);

                        // If the search term is longer than 1 word, increase the debounce delay
                        if (value.trim().split(/\s+/).length > 1) {
                            setDebounceDelay(700);
                        } else {
                            setDebounceDelay(200);
                        }
                    }}
                    className="px-4 h-[55px] py-0"
                />
                {isFetching && (
                    <div className="absolute bottom-0 h-[2px] w-full overflow-hidden">
                        <div className="absolute top-[1px] h-full w-40 animate-slide-effect bg-gradient-to-r dark:from-gray-800 dark:via-white dark:via-80% dark:to-gray-800 from-gray-200 via-black via-80% to-gray-200" />
                    </div>
                )}
            </div>

            <div className="px-2 global-search-list" ref={ref}>
                <CommandList ref={height} className="scrollbar-hide">
                    {!isLoading &&
                        combinedData.length === 0 &&
                        debouncedSearch && (
                            <CommandEmpty>
                                No results found for {`"`}
                                {debouncedSearch}
                                {`"`}.
                            </CommandEmpty>
                        )}
                    {/* {!isLoading &&
                        Object.entries(groupedData).map(
                            ([groupName, items]) => (
                                <CommandGroup
                                    key={groupName}
                                    heading={formatGroupName(groupName)}
                                >
                                    {items.map((item: SearchItem) => (
                                        <SearchResultItemDisplay
                                            key={item.id}
                                            item={item}
                                            dateFormat={
                                                user?.dateFormat ?? undefined
                                            }
                                        />
                                    ))}
                                </CommandGroup>
                            ),
                        )} */}
                </CommandList>
            </div>
        </Command>
    );
}

