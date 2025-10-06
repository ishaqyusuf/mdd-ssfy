import { useTRPC } from "@/trpc/client";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@gnd/ui/command";
import { useQuery } from "@gnd/ui/tanstack";
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
const formatGroupName = (name: string): string | null => {
    switch (name) {
        case "shortcut":
            return "Shortcuts";
        case "customer":
            return "Customers";
        case "vault":
            return "Vault";
        case "invoice":
            return "Invoices";
        case "tracker_project":
            return "Tracker Projects";
        case "transaction":
            return "Transactions";
        case "inbox":
            return "Inbox";

        default:
            return null;
    }
};
const SearchResultItemDisplay = ({
    item,
    dateFormat,
}: {
    item: SearchItem;
    dateFormat?: string;
}) => {
    // const nav = useSearchNavigation();

    // let icon: ReactNode | undefined;
    // let resultDisplay: ReactNode;
    // let onSelect: () => void;

    // if (!item.data) {
    //     // This is an action item (e.g., "Create Invoice", "View Documents")
    //     icon = (
    //         <Icons.Shortcut className="size-4 dark:text-[#666] text-primary" />
    //     );
    //     resultDisplay = item.title;
    // } else {
    //     icon = null;
    //     resultDisplay = item.title;

    //     switch (item.type) {
    //         case "vault": {
    //             onSelect = () =>
    //                 nav.navigateToDocument({ documentId: item.id });

    //             icon = (
    //                 <FilePreviewIcon
    //                     mimetype={item.data?.metadata?.mimetype}
    //                     className="size-4 dark:text-[#666] text-primary"
    //                 />
    //             );
    //             resultDisplay = (
    //                 <div className="flex items-center justify-between w-full">
    //                     <span className="flex-grow truncate">
    //                         {
    //                             (item.data?.title ||
    //                                 (item.data?.name as string)
    //                                     ?.split("/")
    //                                     .at(-1) ||
    //                                 "") as string
    //                         }
    //                     </span>
    //                     <div className="flex items-center gap-2 invisible group-hover/item:visible group-focus/item:visible group-aria-selected/item:visible">
    //                         <CopyButton path={`?documentId=${item.id}`} />
    //                         <DownloadButton
    //                             href={`/api/download/file?path=${item.data?.path_tokens?.join("/")}&filename=${
    //                                 (item.data?.title ||
    //                                     (item.data?.name as string)
    //                                         ?.split("/")
    //                                         .at(-1) ||
    //                                     "") as string
    //                             }`}
    //                             filename={
    //                                 (item.data?.title ||
    //                                     (item.data?.name as string)
    //                                         ?.split("/")
    //                                         .at(-1) ||
    //                                     "") as string
    //                             }
    //                         />
    //                         <Icons.ArrowOutward className="size-4 dark:text-[#666] text-primary hover:!text-primary cursor-pointer" />
    //                     </div>
    //                 </div>
    //             );
    //             break;
    //         }
    //         case "customer": {
    //             onSelect = () =>
    //                 nav.navigateToCustomer({ customerId: item.id });

    //             icon = (
    //                 <Icons.Customers className="size-4 dark:text-[#666] text-primary" />
    //             );
    //             resultDisplay = (
    //                 <div className="flex items-center w-full">
    //                     <div className="flex-grow truncate flex gap-2 items-center">
    //                         <span>{item.data.name as string}</span>
    //                         <span className="text-xs text-muted-foreground">
    //                             {item.data.email as string}
    //                         </span>
    //                     </div>
    //                     <div className="flex items-center gap-2 invisible group-hover/item:visible group-focus/item:visible group-aria-selected/item:visible">
    //                         <CopyButton path={`?customerId=${item.id}`} />
    //                         <Icons.ArrowOutward className="size-4 dark:text-[#666] text-primary hover:!text-primary cursor-pointer" />
    //                     </div>
    //                 </div>
    //             );

    //             break;
    //         }
    //         case "invoice": {
    //             onSelect = () =>
    //                 nav.navigateToInvoice({
    //                     invoiceId: item.id,
    //                     type: "details",
    //                 });

    //             icon = (
    //                 <Icons.Invoice className="size-4 dark:text-[#666] text-primary" />
    //             );
    //             resultDisplay = (
    //                 <div className="flex items-center w-full">
    //                     <div className="flex-grow truncate flex gap-2 items-center">
    //                         <span>{item.data.invoice_number as string}</span>
    //                         {/* @ts-expect-error - Unstructured data */}
    //                         <InvoiceStatus status={item.data?.status} />
    //                     </div>
    //                     <div className="flex items-center gap-2 invisible group-hover/item:visible group-focus/item:visible group-aria-selected/item:visible">
    //                         <CopyButton
    //                             path={`?invoiceId=${item.id}&type=details`}
    //                         />
    //                         <DownloadButton
    //                             href={`/api/download/invoice?id=${item.id}&size=${item?.data?.template?.size}`}
    //                             filename={`${item.data.invoice_number || "invoice"}.pdf`}
    //                         />
    //                         <Icons.ArrowOutward className="size-4 dark:text-[#666] text-primary hover:!text-primary cursor-pointer" />
    //                     </div>
    //                 </div>
    //             );
    //             break;
    //         }
    //         case "inbox": {
    //             onSelect = () =>
    //                 nav.navigateToPath(`/inbox?inboxId=${item.id}`);

    //             icon = (
    //                 <Icons.Inbox2
    //                     size={14}
    //                     className="dark:text-[#666] text-primary"
    //                 />
    //             );
    //             resultDisplay = (
    //                 <div className="flex items-center justify-between w-full">
    //                     <div className="flex-grow truncate flex gap-2 items-center">
    //                         <span>
    //                             {
    //                                 (item.data?.display_name ||
    //                                     (item.data?.file_name as string)
    //                                         ?.split("/")
    //                                         .at(-1) ||
    //                                     "") as string
    //                             }
    //                         </span>
    //                         {item.data?.amount && item.data?.currency && (
    //                             <span className="text-xs text-muted-foreground">
    //                                 <FormatAmount
    //                                     currency={item.data.currency}
    //                                     amount={item.data.amount}
    //                                 />
    //                             </span>
    //                         )}
    //                         <span className="text-xs text-muted-foreground">
    //                             {item.data?.date &&
    //                                 formatDate(item.data.date, dateFormat)}
    //                         </span>
    //                     </div>
    //                     <div className="flex items-center gap-2 invisible group-hover/item:visible group-focus/item:visible group-aria-selected/item:visible">
    //                         <CopyButton path={`/inbox?inboxId=${item.id}`} />
    //                         <DownloadButton
    //                             href={`/api/download/file?path=${item.data?.file_path?.join("/")}&filename=${item.data?.file_name || ""}`}
    //                             filename={item.data?.file_name || "download"}
    //                         />
    //                         <Icons.ArrowOutward className="size-4 dark:text-[#666] text-primary hover:!text-primary cursor-pointer" />
    //                     </div>
    //                 </div>
    //             );
    //             break;
    //         }
    //         case "tracker_project": {
    //             onSelect = () =>
    //                 nav.navigateToTracker({ projectId: item.id, update: true });

    //             icon = (
    //                 <Icons.Tracker className="size-4 dark:text-[#666] text-primary" />
    //             );
    //             resultDisplay = (
    //                 <div className="flex items-center w-full">
    //                     <div className="flex-grow truncate flex gap-2 items-center">
    //                         <span>{item.data.name as string}</span>
    //                     </div>
    //                     <div className="flex items-center gap-2 invisible group-hover/item:visible group-focus/item:visible group-aria-selected/item:visible">
    //                         <CopyButton
    //                             path={`?projectId=${item.id}&update=true`}
    //                         />
    //                         <Icons.ArrowOutward className="size-4 dark:text-[#666] text-primary hover:!text-primary cursor-pointer" />
    //                     </div>
    //                 </div>
    //             );
    //             break;
    //         }
    //         case "transaction": {
    //             onSelect = () =>
    //                 nav.navigateToTransaction({ transactionId: item.id });

    //             icon = (
    //                 <Icons.Transactions className="size-4 dark:text-[#666] text-primary" />
    //             );
    //             resultDisplay = (
    //                 <div className="flex items-center justify-between w-full">
    //                     <div className="flex-grow truncate flex gap-2 items-center">
    //                         <span>{(item.data?.name || "") as string}</span>
    //                         <span className="text-xs text-muted-foreground">
    //                             <FormatAmount
    //                                 currency={item.data?.currency as string}
    //                                 amount={item.data?.amount as number}
    //                             />
    //                         </span>
    //                         <span className="text-xs text-muted-foreground">
    //                             {item.data?.date
    //                                 ? formatDate(item.data.date, dateFormat)
    //                                 : null}
    //                         </span>
    //                     </div>
    //                     <div className="flex items-center gap-2 invisible group-hover/item:visible group-focus/item:visible group-aria-selected/item:visible">
    //                         <CopyButton path={item.data?.url as string} />
    //                         <Icons.ArrowOutward className="size-4 dark:text-[#666] text-primary hover:!text-primary cursor-pointer" />
    //                     </div>
    //                 </div>
    //             );
    //             break;
    //         }
    //         default:
    //             // For types not explicitly handled but have data,
    //             // icon remains the default data icon, and resultDisplay remains item.title.
    //             // This is fine.
    //             break;
    //     }
    // }

    // const handleSelect = () => {
    //     item.action?.();
    //     onSelect?.();
    // };
    const handleSelect = () => {};
    return (
        <CommandItem
            key={item.id}
            value={item.id}
            onSelect={handleSelect}
            className="text-sm flex flex-col items-start gap-1 py-2 group/item"
        >
            <div className="flex items-center gap-2 w-full">
                {/* {icon}
                {resultDisplay} */}
            </div>
        </CommandItem>
    );
};
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
        {
            id: "sc-create-invoice",
            type: "invoice",
            title: "Create invoice",
            // action: nav.createInvoice,
        },
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
                    {!isLoading &&
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
                                            // dateFormat={
                                            //     user?.dateFormat ?? undefined
                                            // }
                                        />
                                    ))}
                                </CommandGroup>
                            ),
                        )}
                </CommandList>
            </div>
        </Command>
    );
}

