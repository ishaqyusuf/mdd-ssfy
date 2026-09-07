/** @jsxImportSource react */
import { it } from "bun:test";
import assert from "node:assert/strict";
import { QueryObserver, QueryClient } from "@tanstack/react-query";
import { renderToStaticMarkup } from "react-dom/server";
import { PlanningQueryState } from "./planning-query-state";

it("announces a failed query, hides stale cards, and Retry recovers through the same query", async () => {
	const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
	let attempts = 0;
	const observer = new QueryObserver(client, {
		queryKey: ["productionPlanningCalendar", { from: "2024-04-01" }],
		queryFn: async () => {
			if (++attempts === 1) throw new Error("test-only unavailable source");
			return { count: 1 };
		},
	});
	const render = () => {
		const state = observer.getCurrentResult();
		return PlanningQueryState({ pending: state.isPending, failed: state.isError,
			retry: () => { void observer.refetch(); }, children: "Matching planning card" });
	};
	try {
		assert.ok(renderToStaticMarkup(render()).includes('role="status"'));
		await observer.refetch();
		const failure = render();
		const html = renderToStaticMarkup(failure);
		assert.ok(html.includes('role="alert"'));
		assert.ok(html.includes("Retry"));
		assert.ok(!html.includes("Matching planning card"));
		assert.ok(!html.includes("test-only unavailable source"));
		// Invoke the actual rendered Retry button, not a replacement handler.
		const retryButton = failure.props.children[1];
		retryButton.props.onClick();
		await client.getQueryCache().find({ queryKey: observer.options.queryKey })?.promise;
		observer.updateResult();
		assert.equal(attempts, 2);
		assert.ok(renderToStaticMarkup(render()).includes("Matching planning card"));
	} finally {
		observer.destroy();
		client.clear();
	}
});
