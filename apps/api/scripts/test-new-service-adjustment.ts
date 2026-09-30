/** Local integration check. All database writes roll back; external jobs are captured. */
import { expect, mock } from "bun:test";
import * as database from "../../../packages/db/src/index";
import * as trigger from "@trigger.dev/sdk/v3";

const databaseUrl = new URL(process.env.DATABASE_URL || "mysql://missing");
if (!["localhost", "127.0.0.1"].includes(databaseUrl.hostname)) {
	throw new Error("This regression check requires a local database.");
}
process.env.NODE_ENV = "test";
const realDb = database.db;
let transaction: any;
const scopedDb = new Proxy(realDb, {
	get(target, key) {
		if (key === "$transaction") return (fn: any) => fn(scopedDb);
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
const { runApplySalesOrderAdjustment } = await import(
	"../../../packages/jobs/src/tasks/sales/apply-sales-order-adjustment"
);
const ctx = {
	db: scopedDb,
	userId: 1,
	requestId: "local-reconciliation-regression",
} as any;
const rollback = new Error("RECONCILIATION_TEST_ROLLBACK");
try {
	await realDb.$transaction(
		async (tx) => {
			transaction = tx;
			const original = await getNewSalesForm(ctx, {
				slug: "09216PC",
				type: "order",
			});
			const before = await getNewSalesFormCommitmentSnapshot(
				scopedDb,
				original.salesId!,
			);
			const reviewed = structuredClone(original);
			const service = reviewed.lineItems.find(
				(line: any) => line.meta?.serviceRows?.length,
			) as any;
			if (!service) throw new Error("Local 09216PC service fixture is missing");
			service.meta.serviceRows.push({
				uid: "local-new-service-regression",
				service: "BI-PASS TRACK & HARDWARE 5-0",
				qty: 2,
				unitPrice: 79.85,
				lineTotal: 159.7,
				taxxable: true,
				produceable: false,
			});
			service.qty = service.meta.serviceRows.reduce(
				(sum: number, row: any) => sum + Number(row.qty),
				0,
			);
			service.lineTotal = service.meta.serviceRows.reduce(
				(sum: number, row: any) => sum + Number(row.lineTotal),
				0,
			);
			service.unitPrice =
				Math.round((service.lineTotal / service.qty) * 100) / 100;
			service.meta.totalAuthoritative = true;
			service.meta.rateRoundingAdjustment =
				Math.round(
					(service.lineTotal - service.unitPrice * service.qty) * 100,
				) / 100;
			reviewed.summary = await recalculateNewSalesForm(ctx, {
				lineItems: reviewed.lineItems as any,
				extraCosts: reviewed.extraCosts as any,
				taxRate: reviewed.summary.taxRate,
				paymentMethod: reviewed.form.paymentMethod,
			});
			const proposal = previewNewSalesFormAdjustmentSchema.parse({
				...toSaveDraftInput(reviewed as any, false),
				autosave: false,
			});
			const preview = await previewNewSalesFormAdjustment(ctx, proposal);
			const adjustment = await createNewSalesFormAdjustment(
				ctx,
				createNewSalesFormAdjustmentSchema.parse({
					...proposal,
					reviewToken: preview.reviewToken,
					reason: "Local new-service regression",
					acknowledgeOperationalImpact: true,
				}),
			);
			const applied = await runApplySalesOrderAdjustment({
				adjustmentId: adjustment.id,
			});
			expect(["APPLIED", "APPLIED_WITH_REVIEW"]).toContain(applied.status);
			const reloaded = await getNewSalesForm(ctx, {
				slug: "09216PC",
				type: "order",
			});
			const rows = (
				reloaded.lineItems.find((line: any) =>
					line.meta?.serviceRows?.some(
						(row: any) => row.uid === "local-new-service-regression",
					),
				) as any
			)?.meta.serviceRows;
			const created = rows?.find(
				(row: any) => row.uid === "local-new-service-regression",
			);
			expect(created?.salesItemId).toBeGreaterThan(0);
			expect(created).toMatchObject({
				qty: 2,
				unitPrice: 79.85,
				lineTotal: 159.7,
			});
			expect(reloaded.commercialReconciliation).toBeNull();
			const count = await tx.salesOrderItems.count({
				where: { salesOrderId: original.salesId!, deletedAt: null },
			});
			expect(
				(await runApplySalesOrderAdjustment({ adjustmentId: adjustment.id }))
					.idempotent,
			).toBe(true);
			expect(
				await tx.salesOrderItems.count({
					where: { salesOrderId: original.salesId!, deletedAt: null },
				}),
			).toBe(count);
			await saveDraftNewSalesForm(
				ctx,
				toSaveDraftInput(
					preserveReviewedFormFields(reloaded, reviewed) as any,
					false,
				),
			);
			const saved = await getNewSalesForm(ctx, {
				slug: "09216PC",
				type: "order",
			});
			expect(saved.commercialReconciliation).toBeNull();
			expect(saved.summary.grandTotal).toBe(reviewed.summary.grandTotal);
			await saveDraftNewSalesForm(ctx, toSaveDraftInput(saved as any, false));
			const final = await getNewSalesForm(ctx, {
				slug: "09216PC",
				type: "order",
			});
			expect(final.commercialReconciliation).toBeNull();
			expect(
				await tx.salesOrderItems.count({
					where: { salesOrderId: original.salesId!, deletedAt: null },
				}),
			).toBe(count);
			const after = await getNewSalesFormCommitmentSnapshot(
				scopedDb,
				original.salesId!,
			);
			for (const key of [
				"paymentTotal",
				"paymentCount",
				"productionQty",
				"fulfilledQty",
			] as const)
				expect(after[key]).toBe(before[key]);
			const printed = await getPrintData(scopedDb, {
				ids: [original.salesId!],
				mode: "invoice",
				pricingMode: "internal",
			});
			expect(printed.pages).toHaveLength(1);
			console.log(
				"PASS: new service applied, identity retained, application replay, reload, two saves, invoice generation and operational history preservation.",
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
console.log(
	"PASS: local writes rolled back; external jobs captured:",
	queued.length,
);
