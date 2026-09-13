import { describe, expect, it } from "bun:test";

import {
	DEFAULT_SALES_REQUEST_PILOT_SETTINGS,
	getSalesRequestPilotSettings,
	normalizeSalesRequestPilotSettingsInput,
	salesRequestPilotSettingsInputSchema,
	updateSalesRequestPilotSettings,
} from "./sales-request-pilot-settings";

const settingId = 7;

function fakeDatabase(initialMeta: unknown) {
	let meta = initialMeta;
	let updateCount = 0;
	let transactionCount = 0;
	const events: string[] = [];
	const settings = {
		findFirst: async () => {
			events.push("read");
			return { id: settingId, meta };
		},
		update: async ({ data }: { data: { meta: unknown } }) => {
			events.push("update");
			updateCount += 1;
			meta = data.meta;
		},
	};
	const transactionClient = {
		$queryRaw: async () => {
			events.push("lock");
			return [{ id: settingId }];
		},
		settings,
	};
	const db = {
		settings,
		$transaction: async (
			callback: (tx: typeof transactionClient) => unknown,
			options: unknown,
		) => {
			transactionCount += 1;
			events.push("transaction");
			expect(options).toEqual({
				isolationLevel: "Serializable",
				timeout: 60_000,
			});
			return callback(transactionClient);
		},
	};

	return {
		db: db as unknown as Parameters<typeof updateSalesRequestPilotSettings>[0],
		getDb: db as unknown as Parameters<typeof getSalesRequestPilotSettings>[0],
		getMeta: () => meta,
		getEvents: () => events,
		getTransactionCount: () => transactionCount,
		getUpdateCount: () => updateCount,
	};
}

describe("sales request pilot settings", () => {
	it("defaults to a disabled, empty cohort when absent", async () => {
		const fixture = fakeDatabase({ route: { preserved: true } });

		await expect(
			getSalesRequestPilotSettings(fixture.getDb, settingId),
		).resolves.toEqual({
			settingId,
			settings: DEFAULT_SALES_REQUEST_PILOT_SETTINGS,
			source: "default",
		});
	});

	it("normalizes duplicate and unsorted user IDs", () => {
		expect(
			normalizeSalesRequestPilotSettingsInput({
				enabled: false,
				cohortUserIds: [8, 2, 8],
				reviewerUserIds: [4, 3, 4],
			}),
		).toEqual({
			enabled: false,
			cohortUserIds: [2, 8],
			reviewerUserIds: [3, 4],
		});
	});

	it("rejects an enabled pilot without both named lists", () => {
		expect(
			salesRequestPilotSettingsInputSchema.safeParse({
				enabled: true,
				cohortUserIds: [],
				reviewerUserIds: [],
			}).success,
		).toBe(false);
	});

	it("returns invalid persisted data as disabled and repairable", async () => {
		const fixture = fakeDatabase({
			requestGeneration: {
				pilot: { enabled: true, cohortUserIds: [7] },
			},
		});

		await expect(
			getSalesRequestPilotSettings(fixture.getDb, settingId),
		).resolves.toMatchObject({
			settings: DEFAULT_SALES_REQUEST_PILOT_SETTINGS,
			source: "invalid",
		});
	});

	it("locks and deep-merges an enabled cohort without dropping metadata", async () => {
		const fixture = fakeDatabase({
			unrelated: { preserve: true },
			requestGeneration: { defaultsVersion: 3 },
		});

		const result = await updateSalesRequestPilotSettings(fixture.db, {
			settingId,
			enabled: true,
			cohortUserIds: [19, 7, 19],
			reviewerUserIds: [3],
			changedAt: new Date("2026-09-13T12:00:00.000Z"),
		});

		expect(result).toEqual({
			changed: true,
			settingId,
			settings: {
				enabled: true,
				cohortUserIds: [7, 19],
				reviewerUserIds: [3],
				revision: 1,
				changedAt: "2026-09-13T12:00:00.000Z",
			},
			source: "persisted",
		});
		expect(fixture.getEvents()).toEqual([
			"transaction",
			"lock",
			"read",
			"update",
		]);
		expect(fixture.getMeta()).toEqual({
			unrelated: { preserve: true },
			requestGeneration: {
				defaultsVersion: 3,
				pilot: {
					enabled: true,
					cohortUserIds: [7, 19],
					reviewerUserIds: [3],
					revision: 1,
					changedAt: "2026-09-13T12:00:00.000Z",
				},
			},
		});
	});

	it("does not rewrite an identical persisted cohort", async () => {
		const fixture = fakeDatabase({
			requestGeneration: {
				pilot: {
					enabled: true,
					cohortUserIds: [7, 19],
					reviewerUserIds: [3],
					revision: 4,
					changedAt: "2026-09-12T12:00:00.000Z",
				},
			},
		});

		const result = await updateSalesRequestPilotSettings(fixture.db, {
			settingId,
			enabled: true,
			cohortUserIds: [19, 7],
			reviewerUserIds: [3],
		});

		expect(result.changed).toBe(false);
		expect(fixture.getUpdateCount()).toBe(0);
	});

	it("allows a disabled pilot to be saved with empty lists", async () => {
		const fixture = fakeDatabase({
			requestGeneration: {
				pilot: {
					enabled: true,
					cohortUserIds: [7],
					reviewerUserIds: [3],
					revision: 4,
					changedAt: "2026-09-12T12:00:00.000Z",
				},
			},
		});

		const result = await updateSalesRequestPilotSettings(fixture.db, {
			settingId,
			enabled: false,
			cohortUserIds: [],
			reviewerUserIds: [],
		});

		expect(result.settings).toMatchObject({
			enabled: false,
			cohortUserIds: [],
			reviewerUserIds: [],
			revision: 5,
		});
		expect(fixture.getTransactionCount()).toBe(1);
	});
});
