import { expect, spyOn, test } from "bun:test";
import { RedisCache } from "./redis-client";
import {
	SALES_WORKFLOW_CATALOG_CACHE_SCHEMA_VERSION,
	getSalesWorkflowCatalogSnapshot,
	getSalesWorkflowUsageRanks,
	setSalesWorkflowCatalogSnapshot,
	setSalesWorkflowUsageRanks,
} from "./sales-workflow-catalog-cache";

test("reuses a local catalog fill during Redis outage and misses after revision changes", async () => {
	const get = spyOn(RedisCache.prototype, "get").mockResolvedValue(undefined);
	const set = spyOn(RedisCache.prototype, "set").mockResolvedValue(undefined);
	try {
		const input = {
			kind: "components" as const,
			scope: "local-process-probe",
			revision: 987654,
			stepId: 61,
			isCustom: false,
		};
		const snapshot = { revision: input.revision, schemaVersion: SALES_WORKFLOW_CATALOG_CACHE_SCHEMA_VERSION, data: [{ title: "first" }] };
		await setSalesWorkflowCatalogSnapshot(input, snapshot);
		snapshot.data[0]!.title = "mutated";
		expect((await getSalesWorkflowCatalogSnapshot<typeof snapshot.data>(input))?.data).toEqual([{ title: "first" }]);
		expect(get).toHaveBeenCalledTimes(0);
		expect(await getSalesWorkflowCatalogSnapshot({ ...input, revision: input.revision + 1 })).toBeUndefined();
		expect(get).toHaveBeenCalledTimes(1);
	} finally {
		get.mockRestore();
		set.mockRestore();
	}
});

test("reuses and replaces short-lived usage ranks in the same process", async () => {
	const get = spyOn(RedisCache.prototype, "get").mockResolvedValue(undefined);
	const set = spyOn(RedisCache.prototype, "set").mockResolvedValue(undefined);
	try {
		const input = { kind: "usage-ranks" as const, scope: "local-ranks-probe", revision: 987654, stepId: 61 };
		await setSalesWorkflowUsageRanks(input, [{ id: 1, statistics: 2 }]);
		expect(await getSalesWorkflowUsageRanks<Array<{ id: number; statistics: number }>>(input)).toEqual([{ id: 1, statistics: 2 }]);
		await setSalesWorkflowUsageRanks(input, [{ id: 1, statistics: 3 }]);
		expect(await getSalesWorkflowUsageRanks<Array<{ id: number; statistics: number }>>(input)).toEqual([{ id: 1, statistics: 3 }]);
		expect(get).toHaveBeenCalledTimes(0);
	} finally {
		get.mockRestore();
		set.mockRestore();
	}
});
