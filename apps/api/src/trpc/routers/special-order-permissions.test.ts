import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

const approvalRouter = readFileSync(
	new URL("./special-order.route.ts", import.meta.url),
	"utf8",
);
const salesRouter = readFileSync(
	new URL("./sales.route.ts", import.meta.url),
	"utf8",
);
const salesFormQuery = readFileSync(
	new URL("../../db/queries/new-sales-form.ts", import.meta.url),
	"utf8",
);

describe("Special Order authorization boundaries", () => {
	test("exposes authenticated enrollment access without changing lifecycle permissions", () => {
		expect(approvalRouter).toContain("enrollmentAccess: protectedProcedure");
		expect(approvalRouter).toContain("enrollFromOverview: protectedProcedure");
		expect(approvalRouter).toContain("getSpecialOrderEnrollmentAccess");
		expect(approvalRouter).toContain("enrollSpecialOrderFromOverview");
	});

	test("enforces the pilot at the authoritative Sales Form save boundary", () => {
		const recalculateSection = salesFormQuery.slice(
			salesFormQuery.indexOf("export async function recalculateNewSalesForm"),
			salesFormQuery.indexOf("async function saveNewSalesFormInternal"),
		);
		const saveSection = salesFormQuery.slice(
			salesFormQuery.indexOf("async function saveNewSalesFormInternal"),
		);
		expect(recalculateSection).not.toContain("getSpecialOrderEnrollmentAccess");
		expect(saveSection).toContain("await getSpecialOrderEnrollmentAccess");
		expect(saveSection).not.toContain("enrollmentActor");
		for (const marker of [
			"validateSpecialOrderEnrollment",
			"actorCanEnrollSpecialOrder",
			"SPECIAL_ORDER_ENROLLMENT_RESTRICTED",
			"canEnroll: actorCanEnrollSpecialOrder",
		]) {
			expect(saveSection).toContain(marker);
		}
	});

	test("approval lifecycle mutations require existing Sales operational permissions", () => {
		for (const marker of [
			"requestApproval: protectedProcedure",
			"requestReapproval: protectedProcedure",
			"prepareApprovalLink: protectedProcedure",
			"remove: protectedProcedure",
			"history: protectedProcedure",
			"retryNotifications: protectedProcedure",
			"requireSpecialOrderEditor(ctx)",
			"requireSpecialOrderViewer(ctx)",
			'["editOrders"]',
			'["viewOrders", "editOrders"]',
		]) {
			expect(approvalRouter).toContain(marker);
		}
	});

	test("policy, enforcement, and rollout metrics remain Super Admin only", () => {
		for (const procedure of [
			"getSpecialOrderSettings",
			"getSpecialOrderRolloutMetrics",
			"updateSpecialOrderSettings",
			"saveSpecialOrderPolicyDraft",
			"publishSpecialOrderPolicy",
		]) {
			const start = salesRouter.indexOf(`${procedure}: protectedProcedure`);
			expect(start).toBeGreaterThan(-1);
			const body = salesRouter.slice(start, start + 650);
			expect(body).toContain("requireSuperAdmin");
		}
	});
});
