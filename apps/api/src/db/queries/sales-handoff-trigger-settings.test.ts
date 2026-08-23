import { describe, expect, test } from "bun:test";
import {
	getSalesHandoffTriggerSettings,
	updateSalesHandoffTriggerSettings,
} from "./sales-handoff-trigger-settings";

type MetadataUpdate = { data: { meta: Record<string, unknown> } };
type TestSettingsTransaction = {
	settings: {
		findFirst: () => Promise<unknown>;
		update: (input: MetadataUpdate) => Promise<void>;
		create: (input: unknown) => Promise<unknown>;
	};
};

function createDb(meta?: unknown) {
	const writes: unknown[] = [];
	const row = meta === undefined ? null : { id: 19, meta };
	const transactionOptions: unknown[] = [];
	const settings = {
		findFirst: async () => row,
		update: async (input: unknown) => {
			writes.push({ kind: "update", input });
		},
		create: async (input: unknown) => {
			writes.push({ kind: "create", input });
		},
	};
	const db = {
		settings,
		$transaction: async (
			callback: (tx: { settings: typeof settings }) => Promise<unknown>,
			options: unknown,
		) => {
			transactionOptions.push(options);
			return callback({ settings });
		},
	};
	return { writes, transactionOptions, db };
}

describe("sales handoff trigger settings persistence", () => {
	test("reads the fully-paid default without creating settings", async () => {
		const { db, writes } = createDb();
		expect(await getSalesHandoffTriggerSettings(db as never)).toEqual({
			mode: "FULLY_PAID",
			percentage: null,
			revision: 0,
			changedAt: null,
		});
		expect(writes).toHaveLength(0);
	});

	test("preserves unrelated metadata and records revision time", async () => {
		const { db, writes, transactionOptions } = createDb({
			print: { templateId: "template-2" },
			salesOverviewView: { officeDefault: "v2" },
		});
		const result = await updateSalesHandoffTriggerSettings(
			db as never,
			{ mode: "PAYMENT_PERCENTAGE", percentage: 40 },
			{ now: new Date("2026-08-23T14:00:00.000Z") },
		);

		expect(result).toEqual({
			changed: true,
			policy: {
				mode: "PAYMENT_PERCENTAGE",
				percentage: 40,
				revision: 1,
				changedAt: "2026-08-23T14:00:00.000Z",
			},
		});
		expect(writes).toEqual([
			{
				kind: "update",
				input: {
					where: { id: 19 },
					data: {
						meta: {
							print: { templateId: "template-2" },
							salesOverviewView: { officeDefault: "v2" },
							salesHandoffTrigger: result.policy,
						},
					},
				},
			},
		]);
		expect(transactionOptions).toEqual([{ isolationLevel: "Serializable" }]);
	});

	test("does not write or revise an effective no-op", async () => {
		const current = {
			mode: "ANY_PAYMENT",
			percentage: null,
			revision: 4,
			changedAt: "2026-08-20T08:00:00.000Z",
		};
		const { db, writes } = createDb({ salesHandoffTrigger: current });
		const result = await updateSalesHandoffTriggerSettings(
			db as never,
			{ mode: "ANY_PAYMENT", percentage: 75 },
			{ now: new Date("2026-08-23T14:00:00.000Z") },
		);
		expect(result).toEqual({ changed: false, policy: current });
		expect(writes).toHaveLength(0);
	});

	test("creates the shared Sales Settings record only for a real change", async () => {
		const { db, writes } = createDb();
		await updateSalesHandoffTriggerSettings(
			db as never,
			{ mode: "ANY_PAYMENT", percentage: null },
			{ now: new Date("2026-08-23T14:00:00.000Z") },
		);
		expect(writes[0]).toMatchObject({
			kind: "create",
			input: {
				data: {
					type: "sales-settings",
					meta: {
						salesHandoffTrigger: {
							mode: "ANY_PAYMENT",
							revision: 1,
						},
					},
				},
			},
		});
	});

	test("retries a serializable conflict and merges metadata from the winning writer", async () => {
		let attempts = 0;
		let row = {
			id: 19,
			meta: { print: { templateId: "template-2" } } as Record<string, unknown>,
		};
		const db = {
			settings: {
				findFirst: async () => row,
			},
			$transaction: async (
				callback: (tx: TestSettingsTransaction) => Promise<unknown>,
				options: unknown,
			) => {
				expect(options).toEqual({ isolationLevel: "Serializable" });
				attempts += 1;
				let stagedMeta: Record<string, unknown> | null = null;
				const result = await callback({
					settings: {
						findFirst: async () => structuredClone(row),
						update: async (input: MetadataUpdate) => {
							stagedMeta = input.data.meta;
						},
						create: async () => {
							throw new Error("unexpected create");
						},
					},
				});
				if (attempts === 1) {
					row = {
						...row,
						meta: {
							...row.meta,
							paymentReview: { autoReviewActions: true },
						},
					};
					throw Object.assign(new Error("write conflict"), { code: "P2034" });
				}
				if (stagedMeta) row = { ...row, meta: stagedMeta };
				return result;
			},
		};

		const result = await updateSalesHandoffTriggerSettings(
			db as never,
			{ mode: "ANY_PAYMENT", percentage: null },
			{ now: new Date("2026-08-23T14:00:00.000Z") },
		);

		expect(attempts).toBe(2);
		expect(row.meta).toMatchObject({
			print: { templateId: "template-2" },
			paymentReview: { autoReviewActions: true },
			salesHandoffTrigger: {
				mode: "ANY_PAYMENT",
				revision: 1,
			},
		});
		expect(result.policy.revision).toBe(1);
	});

	test("serializes repeated concurrent policy writes into one revision", async () => {
		let row = {
			id: 19,
			meta: { salesOverviewView: { officeDefault: "v2" } } as Record<
				string,
				unknown
			>,
		};
		let updateCount = 0;
		let queue = Promise.resolve();
		const db = {
			settings: { findFirst: async () => row },
			$transaction: <T>(
				callback: (tx: TestSettingsTransaction) => Promise<T>,
			) => {
				const run = queue.then(() =>
					callback({
						settings: {
							findFirst: async () => structuredClone(row),
							update: async (input: MetadataUpdate) => {
								updateCount += 1;
								row = { ...row, meta: input.data.meta };
							},
							create: async () => {
								throw new Error("unexpected create");
							},
						},
					}),
				);
				queue = run.then(
					() => undefined,
					() => undefined,
				);
				return run;
			},
		};

		const results = await Promise.all([
			updateSalesHandoffTriggerSettings(
				db as never,
				{ mode: "PAYMENT_PERCENTAGE", percentage: 40 },
				{ now: new Date("2026-08-23T14:00:00.000Z") },
			),
			updateSalesHandoffTriggerSettings(
				db as never,
				{ mode: "PAYMENT_PERCENTAGE", percentage: 40 },
				{ now: new Date("2026-08-23T14:00:01.000Z") },
			),
		]);

		expect(updateCount).toBe(1);
		expect(results.map((result) => result.changed).sort()).toEqual([
			false,
			true,
		]);
		expect(row.meta).toMatchObject({
			salesOverviewView: { officeDefault: "v2" },
			salesHandoffTrigger: {
				mode: "PAYMENT_PERCENTAGE",
				percentage: 40,
				revision: 1,
			},
		});
	});
});
