import { describe, expect, test } from "bun:test";
import {
	getSalesOverviewViewSettings,
	updateSalesOverviewViewSettings,
} from "./sales-overview-view-settings";

function createDb(meta?: unknown) {
	const writes: unknown[] = [];
	const row = meta === undefined ? null : { id: 17, meta };
	return {
		writes,
		db: {
			settings: {
				findFirst: async () => row,
				update: async (input: unknown) => {
					writes.push({ kind: "update", input });
				},
				create: async (input: unknown) => {
					writes.push({ kind: "create", input });
				},
			},
		},
	};
}

describe("sales overview view settings persistence", () => {
	test("reads the rollout policy without creating settings on a read", async () => {
		const { db, writes } = createDb({
			print: { templateId: "template-2" },
			salesOverviewView: {
				officeDefault: "v2",
				superAdminPreview: "inherit",
			},
		});
		expect(await getSalesOverviewViewSettings(db as never)).toEqual({
			officeDefault: "v2",
			superAdminPreview: "inherit",
		});
		expect(writes).toHaveLength(0);
	});

	test("preserves unrelated sales settings when updating", async () => {
		const { db, writes } = createDb({
			print: { templateId: "template-2" },
		});
		await updateSalesOverviewViewSettings(db as never, {
			officeDefault: "v1",
			superAdminPreview: "v2",
		});
		expect(writes).toEqual([
			{
				kind: "update",
				input: {
					where: { id: 17 },
					data: {
						meta: {
							print: { templateId: "template-2" },
							salesOverviewView: {
								officeDefault: "v1",
								superAdminPreview: "v2",
							},
						},
					},
				},
			},
		]);
	});

	test("creates the sales settings record only from the write path", async () => {
		const { db, writes } = createDb();
		await updateSalesOverviewViewSettings(db as never, {
			officeDefault: "v2",
			superAdminPreview: "inherit",
		});
		expect(writes[0]).toEqual({
			kind: "create",
			input: {
				data: {
					type: "sales-settings",
					meta: {
						salesOverviewView: {
							officeDefault: "v2",
							superAdminPreview: "inherit",
						},
					},
				},
			},
		});
	});
});
