import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
import { QueryClient, dehydrate, hydrate } from "@tanstack/react-query";
import { initTRPC } from "@trpc/server";
import { createTRPCOptionsProxy } from "@trpc/tanstack-react-query";
import {
	type SalesProductionCalendarQuery,
	salesProductionCalendarQuerySchema,
	salesProductionPlanningCalendarQuerySchema,
} from "@sales/schema";

const pageSource = readFileSync(
	new URL(
		"../../app/(sidebar)/(sales)/sales-book/productions/page.tsx",
		import.meta.url,
	),
	"utf8",
);
const calendarSource = readFileSync(
	new URL("./calendar.tsx", import.meta.url),
	"utf8",
);
const period = { from: "2026-08-31", to: "2026-09-06" };

// Exercise the actual flat input literals at both call sites without mounting
// their unrelated Next.js, table, drag-and-drop, or authentication providers.
function calendarInput(source: string, filters: Record<string, unknown>, route = "productionCalendar") {
	const input = source.match(
		new RegExp(`trpc\\.sales\\.${route}\\.queryOptions\\(\\s*(\\{[^}]*\\})`),
	)?.[1];
	if (!input) throw new Error("Production Calendar query input was not found");
	return new Function("period", "filters", `return (${input});`)(
		period,
		filters,
	) as SalesProductionCalendarQuery;
}

describe("Production Calendar hydration contract", () => {
	it("offers only implemented Planning filters and preserves Schedule worker filtering", () => {
		const header = readFileSync(new URL("./header.tsx", import.meta.url), "utf8");
		const expression = header.split("const activeServerFilters = ")[1]?.split("const hiddenFilterKeys")[0];
		const supported = ["q", "assignedToId", "priority", "invoice"].map(value => ({ value }));
		const resolve = new Function("isReview", "isCalendar", "isPlanning", "supportedServerFilters", `return ${expression}`);
		expect(resolve(false, true, true, supported)).toEqual([{ value: "q" }, { value: "priority" }]);
		expect(resolve(false, true, false, supported)).toEqual(supported.slice(0, 3));
		assert.ok(header.includes('...(isPlanning ? ["assignedToId"] : [])'));
	});
	it("keeps calendar mode out of data-filter chips", () => {
		const header = readFileSync(new URL("./header.tsx", import.meta.url), "utf8");
		const hiddenKeys = header.split("const hiddenFilterKeys = [")[1]?.split("...(isReview")[0];
		assert.ok(hiddenKeys?.includes('"calendarMode"'));
		const worker = readFileSync(new URL("../sales-production-search-filter.tsx", import.meta.url), "utf8");
		assert.ok(worker.split("hiddenFilterKeys=")[1]?.includes('"calendarMode"'));
	});
	it("shares the Planning input between server prefetch and its independently loaded view", () => {
		const planningSource = readFileSync(new URL("./planning-calendar.tsx", import.meta.url), "utf8");
		const filters = { q: "09502PC", priority: "HIGH" };
		const server = calendarInput(pageSource, filters, "productionPlanningCalendar");
		const client = calendarInput(planningSource, filters, "productionPlanningCalendar");
		expect(salesProductionPlanningCalendarQuerySchema.parse(server)).toEqual(salesProductionPlanningCalendarQuerySchema.parse(client));
		expect("assignedToId" in client).toBe(false);
	});
	for (const filters of [
		{ q: null, assignedToId: null, priority: null },
		{ q: "09502PC", assignedToId: null, priority: null },
		{ q: null, assignedToId: 44, priority: "HIGH" },
	]) {
	it(`reuses server-prefetched Calendar data for ${JSON.stringify(filters)}`, async () => {
		const t = initTRPC.create();
		const calendar = { scheduled: [{ orderNo: "09502PC" }] };
		const router = t.router({
			sales: t.router({
				productionCalendar: t.procedure
					.input(salesProductionCalendarQuerySchema)
					.query(() => calendar),
			}),
		});
		const server = new QueryClient();
		const client = new QueryClient();
		const trpc = createTRPCOptionsProxy({ router, ctx: {}, queryClient: server });
		try {
			await server.fetchQuery(
				trpc.sales.productionCalendar.queryOptions(
					calendarInput(pageSource, filters),
				),
			);
			hydrate(client, dehydrate(server));
			const clientKey = trpc.sales.productionCalendar.queryOptions(
				calendarInput(calendarSource, filters),
			).queryKey;
			expect(client.getQueryData<typeof calendar>(clientKey)).toEqual(calendar);
		} finally {
			server.clear();
			client.clear();
		}
	});
	}
});
