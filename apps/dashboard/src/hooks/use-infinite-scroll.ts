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

export function isNearInfiniteScrollBoundary({
	scrollTop,
	clientHeight,
	scrollHeight,
	rowCount,
	virtualSize,
	threshold,
}: {
	scrollTop: number;
	clientHeight: number;
	scrollHeight: number;
	rowCount: number;
	virtualSize: number;
	threshold: number;
}) {
	if (rowCount <= 0) return true;

	const estimatedRowHeight = virtualSize / rowCount;
	const thresholdPixels = Math.max(0, threshold) * estimatedRowHeight;
	const remainingPixels = scrollHeight - scrollTop - clientHeight;

	return remainingPixels <= thresholdPixels;
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

			if (
				hasNextPage &&
				isNearInfiniteScrollBoundary({
					scrollTop: scrollElement.scrollTop,
					clientHeight: scrollElement.clientHeight,
					scrollHeight: scrollElement.scrollHeight,
					rowCount,
					virtualSize: rowVirtualizer.getTotalSize(),
					threshold,
				})
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
