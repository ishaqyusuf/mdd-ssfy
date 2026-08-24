import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

const queryClient = readFileSync(
	new URL("../../../trpc/query-client.ts", import.meta.url),
	"utf8",
);
const invalidation = readFileSync(
	new URL("./dispatch-query-invalidation.ts", import.meta.url),
	"utf8",
);

describe("mobile dispatch freshness", () => {
	test("binds query focus/online managers without persisting customer caches", () => {
		expect(queryClient).toContain("onlineManager.setEventListener");
		expect(queryClient).toContain("focusManager.setEventListener");
		expect(queryClient).toContain("NetInfo.addEventListener");
		expect(queryClient).not.toContain("persistQueryClient");
	});

	test("invalidates every dispatch projection and notification feed centrally", () => {
		for (const key of [
			"driverManifest",
			"driverWorkQueue",
			"driverWorkQueueSummary",
			"manifest",
			"detail",
			"dispatchOverviewV2",
			"packingList",
			"packingListSummary",
			"packingReports.context",
			"notes.list",
		]) {
			expect(invalidation).toContain(key);
		}
	});
});
