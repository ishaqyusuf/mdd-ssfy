import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

const approvalRouter = readFileSync(
	new URL("./special-order.route.ts", import.meta.url),
	"utf8",
);
const salesRouter = readFileSync(new URL("./sales.route.ts", import.meta.url), "utf8");

describe("Special Order authorization boundaries", () => {
	test("approval lifecycle mutations require existing Sales operational permissions", () => {
		for (const marker of [
			"requestApproval: protectedProcedure",
			"requestReapproval: protectedProcedure",
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
