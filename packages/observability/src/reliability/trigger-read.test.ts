import { expect, it } from "bun:test";
import { fetchTriggerRunPage, fetchWatchedTriggerRun } from "./trigger-read";

const source = {
	token: "tr_prod_sk_local_fixture",
	account: "account",
	project: "project",
	environmentId: "env-prod",
	fallbackOperation: "jobs.unknown",
	operations: [],
	service: {
		id: "jobs",
		owner: "platform",
		operations: ["jobs.unknown"],
		sources: [{ provider: "trigger", account: "account", project: "project" }],
	},
} as const;
const now = new Date("2026-09-09T12:00:00Z");
const window = {
	windowStart: "2026-09-09T10:00:00Z",
	windowEnd: now.toISOString(),
	cursor: null,
};
const run = {
	id: "run_fixture",
	taskIdentifier: "save-sale",
	status: "EXECUTING",
	isTest: false,
	env: { id: "env-prod" },
	createdAt: "2026-09-09T11:00:00Z",
	updatedAt: "2026-09-09T11:00:00Z",
};
it("discovers every state with creation-time filters and explicit cursor pagination", async () => {
	const page = await fetchTriggerRunPage(
		source,
		window,
		now,
		async (url, init) => {
			expect(url.pathname).toBe("/api/v1/runs");
			expect(url.searchParams.get("filter[createdAt][from]")).toBe(
				String(Date.parse(window.windowStart)),
			);
			expect(url.searchParams.has("filter[status]")).toBe(false);
			expect(init.redirect).toBe("error");
			return Response.json({ data: [run], pagination: { next: "run_next" } });
		},
	);
	expect(page.runs[0]?.terminal).toBe(false);
	expect(page.nextCursor).toBe("run_next");
});
it("retrieves an old known run without a creation-time filter", async () => {
	const result = await fetchWatchedTriggerRun(
		source,
		run.id,
		now,
		async (url) => {
			expect(url.pathname).toBe("/api/v3/runs/run_fixture");
			expect(url.search).toBe("");
			return Response.json({
				...run,
				env: undefined,
				createdAt: "2026-09-07T11:00:00Z",
				status: "CRASHED",
			});
		},
	);
	expect(result.intake?.incident.severity).toBe("P2");
});
it("does not retire discovery on rate limits or malformed pagination", async () => {
	await expect(
		fetchTriggerRunPage(
			source,
			window,
			now,
			async () => new Response(null, { status: 429 }),
		),
	).rejects.toThrow("TRIGGER_RATE_LIMITED");
	await expect(
		fetchTriggerRunPage(source, window, now, async () =>
			Response.json({ data: [] }),
		),
	).rejects.toThrow("TRIGGER_PAGINATION_INVALID");
	await expect(
		fetchTriggerRunPage(
			{ ...source, token: "tr_dev_sk_fixture" },
			window,
			now,
			async () => {
				throw new Error("Must not request");
			},
		),
	).rejects.toThrow("TRIGGER_CONFIGURATION_INVALID");
});
