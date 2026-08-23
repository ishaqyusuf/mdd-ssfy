import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

const pageSource = readFileSync(new URL("./page.tsx", import.meta.url), "utf8");
const alertSource = readFileSync(
	new URL(
		"../../../../../components/sales-handoff-actions-alert.tsx",
		import.meta.url,
	),
	"utf8",
);

function serverBatchPrefetchSource() {
	const match = pageSource.match(/batchPrefetch\(\[([\s\S]*?)\]\);/);
	if (!match?.[1])
		throw new Error("Sales Orders batchPrefetch call not found.");
	return match[1];
}

describe("Sales Handoff alert hydration boundary", () => {
	test("keeps the client-owned handoff query out of server batch prefetch", () => {
		const prefetchSource = serverBatchPrefetchSource();

		expect(prefetchSource).toContain("getOrders.infiniteQueryOptions");
		expect(prefetchSource).toContain("getOrdersSummary.queryOptions");
		expect(prefetchSource).not.toContain("getSalesHandoffActions");
		expect(pageSource).toContain("<SalesHandoffActionsAlert />");
		expect(pageSource).toContain(
			"fallback={<SalesHandoffActionsAlertSkeleton />}",
		);
	});

	test("retains compact client loading and explicit retry behavior", () => {
		expect(alertSource).toContain("const actionsQuery = useQuery(");
		expect(alertSource).toContain("if (actionsQuery.isPending)");
		expect(alertSource).toContain("<SalesHandoffActionsAlertSkeleton />");
		expect(alertSource).toContain("{focusFallback}");
		expect(alertSource).toContain("Unable to load paid sales actions");
		expect(alertSource).toContain("actionsQuery.refetch()");
		expect(alertSource).toContain("Retry");
	});
});
