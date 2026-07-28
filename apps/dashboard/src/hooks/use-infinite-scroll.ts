"use client";

import type { Virtualizer } from "@tanstack/react-virtual";
import { type RefObject, useEffect } from "react";

interface UseInfiniteScrollProps<
    TScrollElement extends HTMLElement = HTMLElement,
> {
    scrollRef: RefObject<TScrollElement | null>;
    rowVirtualizer: Virtualizer<TScrollElement, Element>;
    rowCount: number;
    hasNextPage: boolean;
    isFetchingNextPage: boolean;
    fetchNextPage: () => void;
    threshold?: number;
}

export function useInfiniteScroll<
    TScrollElement extends HTMLElement = HTMLElement,
>({
    scrollRef,
    rowVirtualizer,
    rowCount,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
    threshold = 20,
}: UseInfiniteScrollProps<TScrollElement>) {
    useEffect(() => {
        const scrollElement = scrollRef.current;
        if (!scrollElement) return;

        const checkLoadMore = () => {
            if (isFetchingNextPage) return;

            const virtualItems = rowVirtualizer.getVirtualItems();
            const lastItem = virtualItems[virtualItems.length - 1];

            if (
                lastItem &&
                lastItem.index >= rowCount - threshold &&
                hasNextPage
            ) {
                fetchNextPage();
            }
        };

        checkLoadMore();
        scrollElement.addEventListener("scroll", checkLoadMore);

        return () => scrollElement.removeEventListener("scroll", checkLoadMore);
    }, [
        scrollRef,
        rowVirtualizer,
        rowCount,
        hasNextPage,
        isFetchingNextPage,
        fetchNextPage,
        threshold,
    ]);
}
