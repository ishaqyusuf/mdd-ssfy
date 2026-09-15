import { expect, test } from "bun:test";
import type { Db } from "@gnd/db";
import {
	getSalesRequestAIRules,
	salesRequestAIRulesInputSchema,
	updateSalesRequestAIRules,
} from "./sales-request-ai-rules";

test("rules preserve sibling settings, lock updates, and reject stale revisions", async () => {
	let meta: unknown = {
		currency: "USD",
		requestGeneration: { pilot: { enabled: true } },
	};
	const events: string[] = [];
	const settings = {
		findFirst: async () => ({ id: 1, meta }),
		update: async ({ data }: { data: { meta: unknown } }) => {
			events.push("write");
			meta = data.meta;
		},
	};
	const tx = {
		settings,
		$queryRaw: async () => {
			events.push("lock");
			return [{ id: 1 }];
		},
	};
	const db = {
		settings,
		$transaction: async (callback: (value: typeof tx) => unknown) =>
			callback(tx),
	} as unknown as Db;
	expect((await getSalesRequestAIRules(db, 1)).rules).toEqual([]);
	const rules = [
		{
			id: "rule-1",
			title: "Keep rooms",
			instruction: "Keep the room name on each door line.",
			enabled: true,
		},
	];
	const saved = await updateSalesRequestAIRules(db, {
		settingId: 1,
		changedBy: 2,
		expectedRevision: 0,
		rules,
	});
	expect(saved.revision).toBe(1);
	expect(events).toEqual(["lock", "write"]);
	expect(meta).toMatchObject({
		currency: "USD",
		requestGeneration: {
			pilot: { enabled: true },
			aiRules: { rules, changedBy: 2 },
		},
	});
	expect((await getSalesRequestAIRules(db, 1)).rules).toEqual(rules);
	await expect(
		updateSalesRequestAIRules(db, {
			settingId: 1,
			changedBy: 2,
			expectedRevision: 0,
			rules: [],
		}),
	).rejects.toThrow("Reload settings");
	const disabled = await updateSalesRequestAIRules(db, {
		settingId: 1,
		changedBy: 2,
		expectedRevision: 1,
		rules: rules.map((rule) => ({ ...rule, enabled: false })),
	});
	expect(disabled.rules[0]?.enabled).toBe(false);
	expect(
		(
			await updateSalesRequestAIRules(db, {
				settingId: 1,
				changedBy: 2,
				expectedRevision: 2,
				rules: [],
			})
		).rules,
	).toEqual([]);
});

test("rules reject duplicate identities and excessive prompt budgets", () => {
	const rule = {
		id: "same",
		title: "Title",
		instruction: "Keep rooms",
		enabled: true,
	};
	expect(
		salesRequestAIRulesInputSchema.safeParse({
			expectedRevision: 0,
			rules: [rule, rule],
		}).success,
	).toBe(false);
	expect(
		salesRequestAIRulesInputSchema.safeParse({
			expectedRevision: 0,
			rules: Array.from({ length: 13 }, (_, i) => ({
				...rule,
				id: `${i}`,
				instruction: "a".repeat(1000),
			})),
		}).success,
	).toBe(false);
});
