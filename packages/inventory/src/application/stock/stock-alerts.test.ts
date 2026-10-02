import { describe, expect, test } from "bun:test";
import type { Db } from "@gnd/db";
import {
	setVariantStockAlerts,
	variantStockAlertsSchema,
} from "./stock-policy";

describe("variant alert preference", () => {
	test("changes only alert preference and checks the active owning catalog", async () => {
		let write: unknown;
		const db = {
			inventoryVariant: {
				updateMany: async (input: unknown) => {
					write = input;
					return { count: 1 };
				},
			},
		} as unknown as Db;
		await setVariantStockAlerts(db, { inventoryVariantId: 17, enabled: false });
		expect(write).toEqual({
			where: {
				id: 17,
				deletedAt: null,
				inventory: { deletedAt: null, inventoryCategory: { deletedAt: null } },
			},
			data: { stockAlertsEnabled: false },
		});
	});
	test("does not accept archived or missing variants", async () => {
		const db = {
			inventoryVariant: { updateMany: async () => ({ count: 0 }) },
		} as unknown as Db;
		await expect(
			setVariantStockAlerts(db, { inventoryVariantId: 17, enabled: true }),
		).rejects.toMatchObject({ code: "BAD_REQUEST" });
	});
	test("validates the explicit switch value instead of using threshold zero", () => {
		expect(
			variantStockAlertsSchema.safeParse({
				inventoryVariantId: 1,
				enabled: "false",
			}).success,
		).toBe(false);
		expect(
			variantStockAlertsSchema.safeParse({
				inventoryVariantId: 1,
				enabled: false,
			}).success,
		).toBe(true);
	});
});
