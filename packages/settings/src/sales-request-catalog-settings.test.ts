import { describe, expect, it } from "bun:test";
import {
	beginSalesRequestCatalogRegeneration,
	completeSalesRequestCatalogRegeneration,
	failSalesRequestCatalogRegeneration,
	getSalesRequestCatalogSettings,
	updateSalesRequestCatalogPolicy,
} from "./sales-request-catalog-settings";

const settingId = 17;

function fakeDatabase(initialMeta: unknown) {
	let meta = initialMeta;
	const settings = {
		findFirst: async () => ({ id: settingId, meta }),
		update: async ({ data }: { data: { meta: unknown } }) => {
			meta = data.meta;
		},
	};
	const tx = { $queryRaw: async () => [{ id: settingId }], settings };
	const db = {
		settings,
		$transaction: async (callback: (client: typeof tx) => unknown) =>
			callback(tx),
	};
	return {
		db: db as never,
		getDb: db as never,
		getMeta: () => meta,
	};
}

describe("sales request catalog settings", () => {
	it("defaults to a 90-day grace period and stale generation zero", async () => {
		const fixture = fakeDatabase({ route: { preserved: true } });
		await expect(
			getSalesRequestCatalogSettings(fixture.getDb, settingId),
		).resolves.toEqual({
			settingId,
			policy: {
				gracePeriodDays: 90,
				pinnedComponentUids: [],
				excludedComponentUids: [],
			},
			publication: { generation: 0, status: "stale" },
		});
	});

	it("normalizes policy and marks the published artifact stale", async () => {
		const fixture = fakeDatabase({
			unrelated: true,
			requestGeneration: {
				catalogPublication: {
					generation: 3,
					status: "published",
					publishedRevision: "rev-3",
				},
			},
		});
		const result = await updateSalesRequestCatalogPolicy(fixture.db, {
			settingId,
			policy: {
				gracePeriodDays: 45,
				pinnedComponentUids: ["b", "a", "a"],
				excludedComponentUids: ["z"],
			},
		});
		expect(result.policy.pinnedComponentUids).toEqual(["a", "b"]);
		expect(result.publication).toMatchObject({
			generation: 3,
			status: "stale",
			publishedRevision: "rev-3",
		});
		expect(fixture.getMeta()).toMatchObject({ unrelated: true });
	});

	it("publishes only the current generation and preserves the last good revision on failure", async () => {
		const fixture = fakeDatabase({});
		const pending = await beginSalesRequestCatalogRegeneration(fixture.db, {
			settingId,
			requestedBy: 42,
			requestedAt: new Date("2026-09-11T12:00:00.000Z"),
		});
		expect(pending.publication).toEqual({
			generation: 1,
			requestedAt: "2026-09-11T12:00:00.000Z",
			requestedBy: 42,
			status: "pending",
		});

		await completeSalesRequestCatalogRegeneration(fixture.db, {
			settingId,
			generation: 1,
			publishedRevision: "revision-one",
			counts: { finalTupleCount: 123 },
		});
		const second = await beginSalesRequestCatalogRegeneration(fixture.db, {
			settingId,
			requestedBy: 42,
		});
		await failSalesRequestCatalogRegeneration(fixture.db, {
			settingId,
			generation: second.publication.generation,
			error: "build failed",
		});
		await expect(
			getSalesRequestCatalogSettings(fixture.getDb, settingId),
		).resolves.toMatchObject({
			publication: {
				generation: 2,
				status: "failed",
				publishedRevision: "revision-one",
				error: "build failed",
			},
		});
	});
});
