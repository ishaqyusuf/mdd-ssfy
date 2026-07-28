import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { loadCoreProductionOverview } from "./sales-production-overview";

const routerSource = readFileSync(resolve(import.meta.dir, "sales.route.ts"), {
	encoding: "utf8",
});
const providerSource = readFileSync(
	resolve(
		import.meta.dir,
		"../../../../dashboard/src/components/sheets/sales-overview-sheet/context.tsx",
	),
	{
		encoding: "utf8",
	},
);

describe("sales production overview query boundary", () => {
	it("preserves production items when independent readiness fails", async () => {
		const overview = {
			orderId: 24_339,
			items: [{ controlUid: "door-59950-2-4 x 8-0" }],
		};

		const [overviewResult, readinessResult] = await Promise.allSettled([
			loadCoreProductionOverview(async () => overview),
			Promise.reject(new Error("readiness table is unavailable")),
		]);

		expect(overviewResult).toEqual({
			status: "fulfilled",
			value: overview,
		});
		expect(readinessResult.status).toBe("rejected");
	});

	it("keeps readiness out of the core production items endpoint wiring", () => {
		const overviewStart = routerSource.indexOf("\tproductionOverview:");
		const readinessStart = routerSource.indexOf(
			"\tproductionReadiness:",
			overviewStart,
		);
		const productionOverviewSource = routerSource.slice(
			overviewStart,
			readinessStart,
		);

		expect(productionOverviewSource).toContain("loadCoreProductionOverview");
		expect(productionOverviewSource).not.toContain("getProductionReadiness");
	});

	it("loads readiness independently after production items resolve", () => {
		expect(providerSource).toContain(
			"trpc.sales.productionReadiness.queryOptions",
		);
		expect(providerSource).toContain("readiness: readinessQuery.data");
		expect(providerSource).toContain(
			"readinessUnavailable: readinessQuery.isError",
		);
	});

	it("protects every production queue and detail route", () => {
		for (const route of [
			"productions",
			"productionTasks",
			"productionDashboard",
			"productionsV2",
			"productionDashboardV2",
			"productionOrderDetailV2",
		]) {
			const routeStart = routerSource.indexOf(`\t${route}: protectedProcedure`);
			expect(routeStart, route).toBeGreaterThan(-1);
			expect(
				routerSource
					.slice(routeStart, routeStart + 900)
					.includes("requireProductionOverviewViewer(props.ctx)"),
				route,
			).toBe(true);
		}
	});
});
