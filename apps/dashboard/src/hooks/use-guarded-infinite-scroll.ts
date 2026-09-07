"use client";

import { type RefObject, useCallback, useEffect, useRef } from "react";

type RequestKey = string | number;
type RequestToken = {
	generation: number;
	requestKey: RequestKey;
};
type NextPageResult = {
	isError: boolean;
};
type FetchNextPage = () => PromiseLike<NextPageResult>;

export type GuardedRequestGate = ReturnType<
	typeof createGuardedInfiniteScrollRequestGate
>;

export function createGuardedInfiniteScrollRequestGate() {
	let generation = 0;
	let inFlight = false;
	let lastRequestedKey: RequestKey | null = null;

	return {
		reset() {
			generation += 1;
			inFlight = false;
			lastRequestedKey = null;
		},
		tryStart(requestKey: RequestKey) {
			if (inFlight || lastRequestedKey === requestKey) return null;

			inFlight = true;
			lastRequestedKey = requestKey;
			return { generation, requestKey } satisfies RequestToken;
		},
		finish(request: RequestToken, succeeded: boolean) {
			if (
				request.generation !== generation ||
				lastRequestedKey !== request.requestKey
			) {
				return;
			}

			inFlight = false;
			if (!succeeded) lastRequestedKey = null;
		},
	};
}

export async function executeGuardedNextPageRequest({
	requestGate,
	requestKey,
	fetchNextPage,
}: {
	requestGate: GuardedRequestGate;
	requestKey: RequestKey;
	fetchNextPage: FetchNextPage;
}) {
	const request = requestGate.tryStart(requestKey);
	if (!request) return false;

	try {
		const result = await fetchNextPage();
		const succeeded = !result.isError;
		requestGate.finish(request, succeeded);
		return succeeded;
	} catch {
		requestGate.finish(request, false);
		return false;
	}
}

export function shouldRequestFromGuardedSentinel({
	isIntersecting,
	hasUserScrolled,
}: {
	isIntersecting: boolean;
	hasUserScrolled: boolean;
}) {
	return isIntersecting && hasUserScrolled;
}

interface UseGuardedInfiniteScrollProps<
	TScrollElement extends HTMLElement = HTMLElement,
> {
	scrollRef: RefObject<TScrollElement | null>;
	sentinelRef: RefObject<Element | null>;
	hasNextPage: boolean;
	isFetchingNextPage: boolean;
	fetchNextPage: FetchNextPage;
	requestKey: RequestKey | null | undefined;
	resetKey: string;
}

export function useGuardedInfiniteScroll<
	TScrollElement extends HTMLElement = HTMLElement,
>({
	scrollRef,
	sentinelRef,
	hasNextPage,
	isFetchingNextPage,
	fetchNextPage,
	requestKey,
	resetKey,
}: UseGuardedInfiniteScrollProps<TScrollElement>) {
	const requestGateRef = useRef(createGuardedInfiniteScrollRequestGate());
	const requestGateResetKeyRef = useRef(resetKey);

	useEffect(() => {
		if (requestGateResetKeyRef.current === resetKey) return;

		requestGateRef.current.reset();
		requestGateResetKeyRef.current = resetKey;
	}, [resetKey]);

	const requestNextPage = useCallback(() => {
		if (!hasNextPage || isFetchingNextPage || requestKey == null) return;

		void executeGuardedNextPageRequest({
			requestGate: requestGateRef.current,
			requestKey,
			fetchNextPage,
		});
	}, [fetchNextPage, hasNextPage, isFetchingNextPage, requestKey]);

	useEffect(() => {
		const scrollElement = scrollRef.current;
		const sentinelElement = sentinelRef.current;
		if (!scrollElement || !sentinelElement) return;

		let isIntersecting = false;
		let hasUserScrolled = false;
		const maybeRequestNextPage = () => {
			if (
				!shouldRequestFromGuardedSentinel({
					isIntersecting,
					hasUserScrolled,
				})
			) {
				return;
			}

			hasUserScrolled = false;
			requestNextPage();
		};
		const observer = new IntersectionObserver(
			([entry]) => {
				isIntersecting = entry?.isIntersecting ?? false;
				maybeRequestNextPage();
			},
			{
				root: scrollElement,
				rootMargin: "0px 0px 320px 0px",
			},
		);
		const handleScroll = () => {
			if (scrollElement.scrollTop <= 0) return;

			hasUserScrolled = true;
			maybeRequestNextPage();
		};

		observer.observe(sentinelElement);
		scrollElement.addEventListener("scroll", handleScroll, { passive: true });

		return () => {
			observer.disconnect();
			scrollElement.removeEventListener("scroll", handleScroll);
		};
	}, [requestNextPage, scrollRef, sentinelRef]);

	return requestNextPage;
}
