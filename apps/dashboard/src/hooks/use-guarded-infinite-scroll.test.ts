import { describe, expect, it } from "bun:test";

import {
	createGuardedInfiniteScrollRequestGate,
	executeGuardedNextPageRequest,
	shouldRequestFromGuardedSentinel,
} from "./use-guarded-infinite-scroll";

function requireRequestToken<T>(request: T | null): T {
	if (!request) throw new Error("Expected the request gate to start.");
	return request;
}

describe("guarded infinite-scroll requests", () => {
	it("executes one request for an in-flight cursor", async () => {
		const requestGate = createGuardedInfiniteScrollRequestGate();
		let requestCount = 0;
		let releaseRequest = () => {};
		const fetchNextPage = () => {
			requestCount += 1;
			return new Promise<{ isError: boolean }>((resolve) => {
				releaseRequest = () => resolve({ isError: false });
			});
		};

		const first = executeGuardedNextPageRequest({
			requestGate,
			requestKey: "cursor-20",
			fetchNextPage,
		});
		const duplicate = executeGuardedNextPageRequest({
			requestGate,
			requestKey: "cursor-20",
			fetchNextPage,
		});

		expect(requestCount).toBe(1);
		expect(await duplicate).toBe(false);
		releaseRequest();
		expect(await first).toBe(true);
	});

	it("does not repeat a completed cursor and permits the next cursor", async () => {
		const requestGate = createGuardedInfiniteScrollRequestGate();
		let requestCount = 0;
		const fetchNextPage = async () => {
			requestCount += 1;
			return { isError: false };
		};

		expect(
			await executeGuardedNextPageRequest({
				requestGate,
				requestKey: "cursor-20",
				fetchNextPage,
			}),
		).toBe(true);
		expect(
			await executeGuardedNextPageRequest({
				requestGate,
				requestKey: "cursor-20",
				fetchNextPage,
			}),
		).toBe(false);
		expect(
			await executeGuardedNextPageRequest({
				requestGate,
				requestKey: "cursor-40",
				fetchNextPage,
			}),
		).toBe(true);
		expect(requestCount).toBe(2);
	});

	it("allows a failed cursor to be retried", async () => {
		const requestGate = createGuardedInfiniteScrollRequestGate();
		let requestCount = 0;
		const fetchNextPage = async () => {
			requestCount += 1;
			if (requestCount === 1) throw new Error("temporary failure");
			return { isError: false };
		};

		expect(
			await executeGuardedNextPageRequest({
				requestGate,
				requestKey: "cursor-20",
				fetchNextPage,
			}),
		).toBe(false);
		expect(
			await executeGuardedNextPageRequest({
				requestGate,
				requestKey: "cursor-20",
				fetchNextPage,
			}),
		).toBe(true);
		expect(requestCount).toBe(2);
	});

	it("resets cursor history when the query identity changes", async () => {
		const requestGate = createGuardedInfiniteScrollRequestGate();
		let requestCount = 0;
		const fetchNextPage = async () => {
			requestCount += 1;
			return { isError: false };
		};

		await executeGuardedNextPageRequest({
			requestGate,
			requestKey: "cursor-20",
			fetchNextPage,
		});
		requestGate.reset();
		await executeGuardedNextPageRequest({
			requestGate,
			requestKey: "cursor-20",
			fetchNextPage,
		});

		expect(requestCount).toBe(2);
	});

	it("ignores a stale completion after the query identity resets", () => {
		const requestGate = createGuardedInfiniteScrollRequestGate();
		const staleRequest = requireRequestToken(requestGate.tryStart("cursor-20"));

		requestGate.reset();
		const currentRequest = requireRequestToken(
			requestGate.tryStart("cursor-20"),
		);

		requestGate.finish(staleRequest, true);
		expect(Boolean(requestGate.tryStart("cursor-40"))).toBe(false);

		requestGate.finish(currentRequest, true);
		expect(Boolean(requestGate.tryStart("cursor-40"))).toBe(true);
	});
});

describe("guarded infinite-scroll sentinel", () => {
	it("does not fetch merely because the sentinel is visible on first render", () => {
		expect(
			shouldRequestFromGuardedSentinel({
				isIntersecting: true,
				hasUserScrolled: false,
			}),
		).toBe(false);
	});

	it("fetches after user scrolling reaches the sentinel", () => {
		expect(
			shouldRequestFromGuardedSentinel({
				isIntersecting: true,
				hasUserScrolled: true,
			}),
		).toBe(true);
	});
});
