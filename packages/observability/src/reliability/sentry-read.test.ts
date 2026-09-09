import { expect, it } from "bun:test";
import { fetchSentryErrorPage } from "./sentry-read";

const source = {
	account: "org",
	projectId: "123",
	apiOrigin: "https://sentry.io",
	token: "test-read-token",
	operation: "runtime.error",
	service: {
		id: "web",
		owner: "platform",
		operations: ["runtime.error"],
		sources: [{ provider: "sentry", account: "org", project: "123" }],
	},
} as const;
const window = {
	windowStart: "2026-09-09T10:00:00.000Z",
	windowEnd: "2026-09-09T12:00:00.000Z",
	cursor: null,
};
const event = {
	eventID: "event-1",
	groupID: "issue-1",
	projectID: "123",
	dateCreated: "2026-09-09T11:00:00Z",
	tags: [{ key: "environment", value: "production" }],
	user: { email: "private@example.test" },
};
it("uses the fixed scoped window and reconstructs safe events and next cursor", async () => {
	const page = await fetchSentryErrorPage(source, window, async (url, init) => {
		expect(url.pathname).toBe("/api/0/projects/org/123/events/");
		expect(url.searchParams.get("start")).toBe(window.windowStart);
		expect(init.redirect).toBe("error");
		return Response.json([event], {
			headers: {
				link: '<https://sentry.io/api/0/projects/org/123/events/?cursor=0:100:0>; rel="next"; results="true"',
			},
		});
	});
	expect(page.nextCursor).toBe("0:100:0");
	expect(page.events[0]?.occurrence.eventId).toBe("event-1");
	expect(JSON.stringify(page)).not.toContain("private");
});
it("does not treat a failed or ambiguous page as the end of discovery", async () => {
	await expect(
		fetchSentryErrorPage(
			source,
			window,
			async () =>
				new Response(null, { status: 429, headers: { "retry-after": "60" } }),
		),
	).rejects.toThrow("SENTRY_RATE_LIMITED");
	await expect(
		fetchSentryErrorPage(source, window, async () => Response.json([event])),
	).rejects.toThrow("SENTRY_PAGINATION_INVALID");
	await expect(
		fetchSentryErrorPage(source, window, async () =>
			Response.json([event], {
				headers: {
					link: '<https://other.example/steal>; rel="next"; results="true"',
				},
			}),
		),
	).rejects.toThrow("SENTRY_PAGINATION_INVALID");
});
it("skips explicitly nonproduction events while rejecting missing environment evidence", async () => {
	const read = (events: unknown[]) =>
		fetchSentryErrorPage(source, window, async () =>
			Response.json(events, {
				headers: {
					link: '<https://sentry.io/api/0/projects/org/123/events/?cursor=0:0:0>; rel="next"; results="false"',
				},
			}),
		);
	expect(
		(
			await read([
				{ ...event, tags: [{ key: "environment", value: "preview" }] },
			])
		).events,
	).toHaveLength(0);
	await expect(read([{ ...event, tags: [] }])).rejects.toThrow(
		"SENTRY_ENVIRONMENT_MISSING",
	);
});
