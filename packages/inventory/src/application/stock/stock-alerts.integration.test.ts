import { expect, test } from "bun:test";
import { type Db, db } from "@gnd/db";
import { setVariantStockAlerts } from "./stock-policy";
import { getWorkflowStock } from "./workflow-stock";

(process.env.GND_STOCK_ALERTS_INTEGRATION === "1" ? test : test.skip)(
	"local alert preferences preserve exact stock and allocations through rollback",
	async () => {
		const target = new URL(process.env.DATABASE_URL ?? "");
		if (
			!["localhost", "127.0.0.1"].includes(target.hostname) ||
			target.pathname !== "/gnd-prisma2"
		)
			throw new Error("Requires the verified primary local database.");
		const select = {
			id: true,
			stockAlertsEnabled: true,
			lowStockAlert: true,
			stocks: {
				orderBy: { id: "asc" as const },
				select: { id: true, qty: true },
			},
			stockAllocations: {
				orderBy: { id: "asc" as const },
				select: { id: true, qty: true, status: true },
			},
		};
		const original = await db.inventoryVariant.findFirstOrThrow({
			where: { id: 1973, deletedAt: null },
			select,
		});
		const rollback = new Error("intentional stock alert verification rollback");
		try {
			await db.$transaction(
				async (tx) => {
					const connection = tx as unknown as Db;
					await setVariantStockAlerts(connection, {
						inventoryVariantId: 1973,
						enabled: false,
					});
					const changed = await tx.inventoryVariant.findUniqueOrThrow({
						where: { id: 1973 },
						select,
					});
					expect(changed.stockAlertsEnabled).toBe(false);
					expect(changed.stocks).toEqual(original.stocks);
					expect(changed.stockAllocations).toEqual(original.stockAllocations);
					expect(changed.lowStockAlert).toBe(original.lowStockAlert);
					const detail = await getWorkflowStock(connection, {
						stepId: 115,
						componentUids: ["fR2xZ"],
						includeVariants: true,
					});
					expect(
						detail.components[0]?.variants.find(
							(variant) => variant.id === 1973,
						)?.alertsEnabled,
					).toBe(false);
					const summary = await getWorkflowStock(connection, {
						stepId: 115,
						componentUids: ["fR2xZ"],
						includeVariants: false,
					});
					expect(summary.components[0]?.variants).toEqual([]);
					expect(summary.components[0]?.variantCount).toBe(20);
					await setVariantStockAlerts(connection, {
						inventoryVariantId: 1973,
						enabled: original.stockAlertsEnabled,
					});
					throw rollback;
				},
				{ timeout: 20_000 },
			);
		} catch (error) {
			if (error !== rollback) throw error;
		}
		expect(
			await db.inventoryVariant.findUniqueOrThrow({
				where: { id: 1973 },
				select,
			}),
		).toEqual(original);
	},
);
