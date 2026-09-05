import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { QueryClient, dehydrate, hydrate } from "@tanstack/react-query";
import { initTRPC } from "@trpc/server";
import { createTRPCOptionsProxy } from "@trpc/tanstack-react-query";
import {
	type SalesProductionCalendarQuery,
	salesProductionCalendarQuerySchema,
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
function calendarInput(source: string, filters: Record<string, unknown>) {
	const input = source.match(
		/trpc\.sales\.productionCalendar\.queryOptions\(\s*(\{[^}]*\})/,
	)?.[1];
	if (!input) throw new Error("Production Calendar query input was not found");
	return new Function("period", "filters", `return (${input});`)(
		period,
		filters,
	) as SalesProductionCalendarQuery;
}

describe("Production Calendar hydration contract", () => {
	it.each([
		{ q: null, assignedToId: null, priority: null },
		{ q: "09502PC", assignedToId: null, priority: null },
		{ q: null, assignedToId: 44, priority: "HIGH" },
	])("reuses server-prefetched Calendar data for %j", async (filters) => {
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
});
