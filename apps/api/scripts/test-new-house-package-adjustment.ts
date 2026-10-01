/** Local integration check. All database writes roll back; external jobs are captured. */
import { expect, mock } from "bun:test";
import type { Database, TransactionClient } from "@gnd/db";
import * as trigger from "@trigger.dev/sdk/v3";

const databaseUrl = new URL(process.env.DATABASE_URL || "mysql://missing");
if (!["localhost", "127.0.0.1"].includes(databaseUrl.hostname)) {
	throw new Error("This regression check requires a local database.");
}
const databaseFlag = Bun.argv.indexOf("--database");
if (databaseFlag >= 0) {
	const name = Bun.argv[databaseFlag + 1];
	if (name !== "gnd_save_9894_repro")
		throw new Error("Only the isolated 9894 fixture is accepted.");
	databaseUrl.pathname = `/${name}`;
	process.env.DATABASE_URL = databaseUrl.toString();
}
process.env.NODE_ENV = "test";
const database = await import("../../../packages/db/src/index");
const realDb = database.db;
let transaction: TransactionClient | undefined;
const scopedDb = new Proxy(realDb, {
	get(target, key) {
		if (key === "$transaction")
			return (fn: (client: Database) => Promise<unknown>) => fn(scopedDb);
		const value = Reflect.get(transaction || target, key);
		return typeof value === "function"
			? value.bind(transaction || target)
			: value;
	},
});
const queued: string[] = [];
mock.module("@gnd/db", () => ({ ...database, db: scopedDb }));
mock.module("@trigger.dev/sdk/v3", () => ({
	...trigger,
	tasks: {
		...trigger.tasks,
		trigger: async (name: string) => {
			queued.push(name);
			return { id: "local-test" };
		},
	},
}));
const { getNewSalesForm, saveDraftNewSalesForm, recalculateNewSalesForm } =
	await import("../src/db/queries/new-sales-form");
const {
	previewNewSalesFormAdjustment,
	createNewSalesFormAdjustment,
	getNewSalesFormCommitmentSnapshot,
} = await import("../src/db/queries/new-sales-form-adjustments");
const {
	previewNewSalesFormAdjustmentSchema,
	createNewSalesFormAdjustmentSchema,
} = await import("../src/schemas/new-sales-form");
const { toSaveDraftInput } = await import(
	"../../dashboard/src/components/forms/new-sales-form/mappers"
);
const { preserveReviewedFormFields } = await import(
	"../../dashboard/src/components/forms/new-sales-form/save-intent-continuation"
);
const { getPrintData } = await import(
	"../../../packages/sales/src/print/get-print-data"
);
const inventoryProjection = await import(
	"../../../packages/sales/src/run-sales-inventory-projection-sync"
);
const realInventoryProjection =
	inventoryProjection.runSalesInventoryProjectionSync;
let failAfterCommercial = Bun.argv.includes("--fail-after-commercial");
mock.module("@gnd/sales/run-sales-inventory-projection-sync", () => ({
	...inventoryProjection,
	runSalesInventoryProjectionSync: async (
		...args: Parameters<
			typeof inventoryProjection.runSalesInventoryProjectionSync
		>
	) => {
		if (failAfterCommercial) {
			failAfterCommercial = false;
			throw new Error("INJECTED_LOCAL_INVENTORY_FAILURE");
		}
		return realInventoryProjection(...args);
	},
}));
const { runApplySalesOrderAdjustment } = await import(
	"../../../packages/jobs/src/tasks/sales/apply-sales-order-adjustment"
);
const ctx = {
	db: scopedDb,
	userId: 1,
	requestId: "local-reconciliation-regression",
};
const rollback = new Error("RECONCILIATION_TEST_ROLLBACK");
try {
	await realDb.$transaction(
		async (tx) => {
			transaction = tx;
			const original = await getNewSalesForm(ctx, {
				slug: "09894PC",
				type: "order",
			});
			const saleId = original.salesId;
			if (!saleId) throw new Error("Local 09894PC identity missing");
			const before = await getNewSalesFormCommitmentSnapshot(scopedDb, saleId);
			const reviewed = structuredClone(original);
			const existing = reviewed.lineItems.find(
				(line) => line.housePackageTool?.doors?.length,
			);
			if (!existing) throw new Error("Local 09894PC door fixture missing");
			const added = structuredClone(existing);
			added.id = null;
			added.uid = "local-new-house-package-regression";
			added.title = "New configured door";
			added.unitPrice = 217.5;
			added.lineTotal = 217.5;
			if (added.housePackageTool) {
				added.housePackageTool.id = null;
				added.housePackageTool.totalPrice = 217.5;
				for (const door of added.housePackageTool.doors || []) {
					door.id = null;
					door.unitPrice = 217.5;
					door.customPrice = 217.5;
					door.lineTotal = 217.5;
					door.meta = {
						...door.meta,
						customPrice: 217.5,
						overridePrice: 217.5,
						finalUnitPrice: 217.5,
					};
				}
			}
			for (const step of added.formSteps || []) step.id = null;
			existing.qty *= 2;
			existing.lineTotal *= 2;
			if (existing.housePackageTool) {
				existing.housePackageTool.totalDoors = existing.qty;
				existing.housePackageTool.totalPrice = existing.lineTotal;
				for (const door of existing.housePackageTool.doors || []) {
					for (const key of [
						"lhQty",
						"rhQty",
						"totalQty",
						"lineTotal",
					] as const)
						door[key] = Number(door[key] || 0) * 2;
				}
			}
			reviewed.lineItems.push(added);
			reviewed.summary = await recalculateNewSalesForm(ctx, {
				lineItems: reviewed.lineItems,
				extraCosts: reviewed.extraCosts,
				taxRate: reviewed.summary.taxRate,
				paymentMethod: reviewed.form.paymentMethod,
			});
			const proposal = previewNewSalesFormAdjustmentSchema.parse({
				...toSaveDraftInput(
					reviewed as Parameters<typeof toSaveDraftInput>[0],
					false,
				),
				autosave: false,
			});
			const preview = await previewNewSalesFormAdjustment(ctx, proposal);
			console.log(
				"Review",
				JSON.stringify({
					direction: preview.analysis.direction,
					changes: preview.analysis.lines.map((l) => ({
						uid: l.uid,
						id: l.id,
						before: l.beforeQty,
						after: l.afterQty,
					})),
					allocated: preview.commitments.allocatedQty,
				}),
			);
			let adjustment: Awaited<ReturnType<typeof createNewSalesFormAdjustment>>;
			try {
				adjustment = await createNewSalesFormAdjustment(
					ctx,
					createNewSalesFormAdjustmentSchema.parse({
						...proposal,
						reviewToken: preview.reviewToken,
						reason: "Local new-house-package regression",
						acknowledgeOperationalImpact: true,
					}),
				);
			} catch (error) {
				const { normalizeTrpcError } = await import(
					"../src/trpc/error-contract"
				);
				console.log(
					"Public failure:",
					normalizeTrpcError(error, "newSalesForm.createAdjustment").message,
				);
				throw error;
			}
			expect(adjustment.status).toBe("APPROVED");
			expect(before.paymentTotal).toBe(145.82);
			expect(before.allocatedQty).toBe(1);
			expect(preview.analysis.requiresSalesRepApproval).toBe(true);
			expect(reviewed.summary.grandTotal).toBe(524.36);
			if (Bun.argv.includes("--fail-after-commercial")) {
				await expect(
					runApplySalesOrderAdjustment({ adjustmentId: adjustment.id }),
				).rejects.toThrow("INJECTED_LOCAL_INVENTORY_FAILURE");
				const pending = await tx.salesOrderAdjustment.findUniqueOrThrow({
					where: { id: adjustment.id },
				});
				expect(pending.status).toBe("APPROVED");
				expect(
					(pending.commitmentSnapshot as { applyCheckpoint: { stage: string } })
						.applyCheckpoint.stage,
				).toBe("COMMERCIAL_COMMITTED");
				expect(
					await tx.salesOrderItems.count({
						where: {
							salesOrderId: saleId,
							meta: { path: "$.uid", equals: added.uid },
							deletedAt: null,
						},
					}),
				).toBe(1);
			}
			const applied = await runApplySalesOrderAdjustment({
				adjustmentId: adjustment.id,
			});
			expect(["APPLIED", "APPLIED_WITH_REVIEW"]).toContain(applied.status);
			const reloaded = await getNewSalesForm(ctx, {
				slug: "09894PC",
				type: "order",
			});
			const created = reloaded.lineItems.find((line) => line.uid === added.uid);
			expect(created?.id).toBeGreaterThan(0);
			expect(created?.housePackageTool?.id).toBeGreaterThan(0);
			expect(
				created?.housePackageTool?.doors?.every((door) => Number(door.id) > 0),
			).toBe(true);
			expect(created?.formSteps?.every((step) => Number(step.id) > 0)).toBe(
				true,
			);
			expect(created?.housePackageTool?.doors?.length).toBe(
				added.housePackageTool?.doors?.length,
			);
			expect(reloaded.commercialReconciliation).toBeNull();
			expect(reloaded.summary.grandTotal).toBe(reviewed.summary.grandTotal);
			const appliedCommitments = await getNewSalesFormCommitmentSnapshot(
				scopedDb,
				saleId,
			);
			const count = await tx.salesOrderItems.count({
				where: { salesOrderId: saleId, deletedAt: null },
			});
			expect(
				(await runApplySalesOrderAdjustment({ adjustmentId: adjustment.id }))
					.idempotent,
			).toBe(true);
			await saveDraftNewSalesForm(
				ctx,
				toSaveDraftInput(
					preserveReviewedFormFields(reloaded, reviewed) as Parameters<
						typeof toSaveDraftInput
					>[0],
					false,
				),
			);
			const saved = await getNewSalesForm(ctx, {
				slug: "09894PC",
				type: "order",
			});
			expect(saved.commercialReconciliation).toBeNull();
			await saveDraftNewSalesForm(
				ctx,
				toSaveDraftInput(
					saved as Parameters<typeof toSaveDraftInput>[0],
					false,
				),
			);
			const final = await getNewSalesForm(ctx, {
				slug: "09894PC",
				type: "order",
			});
			expect(final.commercialReconciliation).toBeNull();
			expect(final.summary.grandTotal).toBe(reviewed.summary.grandTotal);
			expect(
				await tx.salesOrderItems.count({
					where: { salesOrderId: saleId, deletedAt: null },
				}),
			).toBe(count);
			const after = await getNewSalesFormCommitmentSnapshot(scopedDb, saleId);
			for (const key of [
				"paymentTotal",
				"paymentCount",
				"productionQty",
				"fulfilledQty",
			] as const)
				expect(after[key]).toBe(before[key]);
			expect(after.allocatedQty).toBe(appliedCommitments.allocatedQty);
			const printed = await getPrintData(scopedDb, {
				ids: [saleId],
				mode: "invoice",
				pricingMode: "internal",
			});
			expect(printed.pages).toHaveLength(1);
			console.log(
				"PASS: new configured line approval, real worker, reload, two saves, replay, invoice and preserved operational history.",
			);
			throw rollback;
		},
		{ timeout: 120000, maxWait: 10000 },
	);
} catch (error) {
	if (error !== rollback) throw error;
} finally {
	transaction = undefined;
	await realDb.$disconnect();
}
console.log("PASS: writes rolled back; external jobs captured", queued.length);
