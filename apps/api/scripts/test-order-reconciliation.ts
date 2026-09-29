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
const { getNewSalesForm, saveDraftNewSalesForm } = await import(
	"../src/db/queries/new-sales-form"
);
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
const { getPrintData } = await import("../../../packages/sales/src/print/get-print-data");
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
			const form = await getNewSalesForm(ctx, {
				slug: "09224PC",
				type: "order",
			});
			const proposal = previewNewSalesFormAdjustmentSchema.parse({
				...toSaveDraftInput(form as any, false),
				autosave: false,
			});
			const preview = await previewNewSalesFormAdjustment(ctx, proposal);
			const confirmation = createNewSalesFormAdjustmentSchema.parse({
				...proposal,
				reviewToken: preview.reviewToken,
				reason: "Local stale-source regression",
				acknowledgeOperationalImpact: true,
			});
			const adjustment = await createNewSalesFormAdjustment(ctx, confirmation);
			// A child-only update deliberately leaves the parent order version unchanged.
			await tx.dykeSalesDoors.update({
				where: { id: 63029 },
				data: { lineTotal: { increment: 1 } },
			});
			await expect(
				createNewSalesFormAdjustment(ctx, confirmation),
			).rejects.toMatchObject({ code: "CONFLICT" });
			const result = await runApplySalesOrderAdjustment({
				adjustmentId: adjustment.id,
			});
			expect(result.status).toBe("STALE");
			expect(
				(
					await tx.salesOrders.findUniqueOrThrow({
						where: { id: form.salesId! },
					})
				).grandTotal,
			).toBe(3507.06);
			const freshForm = await getNewSalesForm(ctx, {
				slug: "09224PC",
				type: "order",
			});
			const freshProposal = previewNewSalesFormAdjustmentSchema.parse({
				...toSaveDraftInput(freshForm as any, false),
				autosave: false,
			});
			const freshReview = await previewNewSalesFormAdjustment(
				ctx,
				freshProposal,
			);
			const retried = await createNewSalesFormAdjustment(ctx, {
				...confirmation,
				...freshProposal,
				reviewToken: freshReview.reviewToken,
			});
			expect(retried.id).not.toBe(adjustment.id);

			console.log(
				"PASS: child-only concurrent changes invalidate review and application without updating totals.",
			);
			throw rollback;
		},
		{ timeout: 120000, maxWait: 10000 },
	);
} catch (error) {
	if (error !== rollback) throw error;
}
try {
	await realDb.$transaction(
		async (tx) => {
			transaction = tx;
			const original = await getNewSalesForm(ctx, {
				slug: "09224PC",
				type: "order",
			});
			const order = await tx.salesOrders.findUniqueOrThrow({
				where: { id: original.salesId! },
			});
			const meta = order.meta as any;
			const snapshot = structuredClone(original.lineItems);
			const door = snapshot[0]!.housePackageTool!.doors[0]!;
			door.lhQty = Number(door.lhQty) + 1;
			door.rhQty = Number(door.rhQty) - 1;
			await tx.salesOrders.update({
				where: { id: original.salesId! },
				data: {
					grandTotal: original.summary.grandTotal,
					subTotal: original.summary.subTotal,
					tax: original.summary.taxTotal,
					meta: {
						...meta,
						newSalesForm: { ...meta.newSalesForm, lineItems: snapshot },
					},
				},
			});
			const form = await getNewSalesForm(ctx, {
				slug: "09224PC",
				type: "order",
			});
			expect(form.commercialReconciliation).not.toBeNull();
			const proposal = previewNewSalesFormAdjustmentSchema.parse({
				...toSaveDraftInput(form as any, false),
				autosave: false,
			});
			const preview = await previewNewSalesFormAdjustment(ctx, proposal);
			expect(preview.analysis.direction).toBe("NONE");
			expect(preview.analysis.totalDelta).toBe(0);
			const adjustment = await createNewSalesFormAdjustment(
				ctx,
				createNewSalesFormAdjustmentSchema.parse({
					...proposal,
					reviewToken: preview.reviewToken,
					reason: "Local structural regression",
					acknowledgeOperationalImpact: true,
				}),
			);
			expect(
				(await runApplySalesOrderAdjustment({ adjustmentId: adjustment.id }))
					.status,
			).toBe("APPLIED_WITH_REVIEW");
			const reloaded = await getNewSalesForm(ctx, {
				slug: "09224PC",
				type: "order",
			});
			expect(reloaded.commercialReconciliation).toBeNull();
			await saveDraftNewSalesForm(
				ctx,
				toSaveDraftInput(reloaded as any, false),
			);
			console.log(
				"PASS: structural discrepancy with no quantity or money delta can reconcile and save.",
			);
			throw rollback;
		},
		{ timeout: 120000, maxWait: 10000 },
	);
} catch (error) {
	if (error !== rollback) throw error;
}

try {
	await realDb.$transaction(
		async (tx) => {
			transaction = tx;
			const form = await getNewSalesForm(ctx, {
				slug: "09224PC",
				type: "order",
			});
			expect(form.commercialReconciliation).not.toBeNull();
			const commitmentsBefore = await getNewSalesFormCommitmentSnapshot(
				scopedDb,
				form.salesId!,
			);
			const reviewed = {
				...form,
				form: { ...form.form, po: "local-reconciliation-test" },
			};
			const proposal = previewNewSalesFormAdjustmentSchema.parse({
				...toSaveDraftInput(reviewed as any, false),
				autosave: false,
			});
			await expect(saveDraftNewSalesForm(ctx, proposal)).rejects.toMatchObject({
				code: "SALES_RELATIONAL_REVIEW_REQUIRED",
			});
			const preview = await previewNewSalesFormAdjustment(ctx, proposal);
			expect(preview.analysis.beforeGrandTotal).toBe(3507.06);
			expect(preview.analysis.afterGrandTotal).toBe(4212.81);
			expect(preview.analysis.totalDelta).toBe(705.75);
			expect(preview.reconciliationDetails.length).toBeGreaterThan(0);
			console.log("Review detail count:", preview.reconciliationDetails.length);
			expect(preview.requiresInboundDisposition).toBe(false);
			const confirmation = createNewSalesFormAdjustmentSchema.parse({
				...proposal,
				reviewToken: preview.reviewToken,
				reason: "Local reconciliation regression",
				acknowledgeOperationalImpact: true,
			});
			await expect(
				createNewSalesFormAdjustment(ctx, {
					...confirmation,
					reviewToken: "stale",
				}),
			).rejects.toMatchObject({ code: "CONFLICT" });
			await expect(
				createNewSalesFormAdjustment(ctx, {
					...confirmation,
					acknowledgeOperationalImpact: false,
				}),
			).rejects.toMatchObject({ code: "PRECONDITION_FAILED" });
			await expect(
				createNewSalesFormAdjustment(ctx, {
					...confirmation,
					summary: { ...confirmation.summary, grandTotal: 1 },
				}),
			).rejects.toMatchObject({ code: "CONFLICT" });
			const adjustment = await createNewSalesFormAdjustment(ctx, confirmation);
			const replay = await createNewSalesFormAdjustment(ctx, confirmation);
			expect(replay.id).toBe(adjustment.id);
			const applied = await runApplySalesOrderAdjustment({
				adjustmentId: adjustment.id,
			});
			expect(applied.status).toBe("APPLIED_WITH_REVIEW");
			expect(
				(await runApplySalesOrderAdjustment({ adjustmentId: adjustment.id }))
					.idempotent,
			).toBe(true);
			const reloaded = await getNewSalesForm(ctx, {
				slug: "09224PC",
				type: "order",
			});
			expect(reloaded.commercialReconciliation).toBeNull();
			expect(reloaded.summary.grandTotal).toBe(4212.81);
			const commitmentsAfter = await getNewSalesFormCommitmentSnapshot(
				scopedDb,
				form.salesId!,
			);
			for (const key of [
				"paymentTotal",
				"paymentCount",
				"productionQty",
				"fulfilledQty",
			] as const) {
				expect(commitmentsAfter[key]).toBe(commitmentsBefore[key]);
			}
			const liveDemands = commitmentsAfter.lines.flatMap(
				(line) => line.inboundDemands,
			);
			for (const demand of commitmentsBefore.lines
				.flatMap((line) => line.inboundDemands)
				.filter((row) => row.inboundShipmentItemId != null)) {
				expect(liveDemands.find((row) => row.id === demand.id)).toEqual(demand);
			}
			await saveDraftNewSalesForm(
				ctx,
				toSaveDraftInput(
					preserveReviewedFormFields(reloaded, reviewed) as any,
					false,
				),
			);
			const saved = await getNewSalesForm(ctx, {
				slug: "09224PC",
				type: "order",
			});
			expect(saved.commercialReconciliation).toBeNull();
			expect(saved.form.po).toBe("local-reconciliation-test");
			await saveDraftNewSalesForm(ctx, toSaveDraftInput(saved as any, false));
			const final = await getNewSalesForm(ctx, {
				slug: "09224PC",
				type: "order",
			});
			expect(final.summary.grandTotal).toBe(4212.81);
			expect(final.commercialReconciliation).toBeNull();
			const printed = await getPrintData(scopedDb, { ids: [form.salesId!], mode: "invoice", pricingMode: "internal" });
			expect(printed.pages[0]?.footer?.lines).toContainEqual(expect.objectContaining({ label: "Order Due Amount", value: "$4,212.81" }));
			expect(printed.pages[0]?.footer?.lines).toContainEqual(expect.objectContaining({ label: "Total if Paying by Card", value: "$4,339.19" }));

			console.log(
				"PASS: historical review, stale token, idempotent approval/application, preserved operational history, reload, and two saves.",
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
	"PASS: all local writes rolled back; external job calls captured:",
	queued.length,
);
