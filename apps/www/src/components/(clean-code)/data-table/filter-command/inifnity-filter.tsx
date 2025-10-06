import React, { useState } from "react";
import { useInfiniteQuery } from "@gnd/ui/tanstack";

import {
    Command,
    CommandInput,
    CommandItem,
    CommandList,
} from "@gnd/ui/command";

// Simulated already fetched items
const itemList = Array.from({ length: 100 }, (_, i) => `Item ${i + 1}`);

const fetchItems = ({ pageParam = 0, query = "" }) => {
    const pageSize = 20;
    const filtered = query
        ? itemList.filter((item) =>
              item.toLowerCase().includes(query.toLowerCase()),
          )
        : itemList;
    const items = filtered.slice(pageParam, pageParam + pageSize);
    return {
        items,
        nextPage: pageParam + pageSize,
        hasNextPage: pageParam + pageSize < filtered.length,
    };
};

const InfiniteScrollCommand = () => {
    const [filterQuery, setFilterQuery] = useState("");

    const { data, fetchNextPage, hasNextPage, isFetchingNextPage, refetch } =
        useInfiniteQuery({
            queryKey: ["items", filterQuery],
            queryFn: ({ pageParam = 0 }) =>
                fetchItems({ pageParam, query: filterQuery }),
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

    const handleScroll = (event) => {
        const { scrollTop, scrollHeight, clientHeight } = event.target;
        if (scrollHeight - scrollTop <= clientHeight + 50 && hasNextPage) {
            fetchNextPage();
        }
    };

    const handleFilter = (query) => {
        setFilterQuery(query);
        refetch();
    };
    const [open, setOpen] = React.useState(false);
    return (
        <Command
            onScroll={handleScroll}
            // style={{ maxHeight: "400px", overflowY: "auto" }}
        >
            <CommandInput
                placeholder="Search or filter items..."
                onInput={(e) => handleFilter((e.target as any)?.value)}
            />
            <CommandList>
                {data?.pages?.map((page, pageIndex) =>
                    page.items.map((item, index) => (
                        <CommandItem key={`${pageIndex}-${index}`}>
                            {item}
                        </CommandItem>
                    )),
                )}
                {isFetchingNextPage && (
                    <div className="loading-spinner">Loading more...</div>
                )}
            </CommandList>
        </Command>
    );
};

export default InfiniteScrollCommand;
