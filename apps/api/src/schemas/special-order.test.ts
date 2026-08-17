import { describe, expect, it } from "bun:test";

import {
	specialOrderApprovalResponseSchema,
	specialOrderEnrollmentSchema,
	specialOrderReapprovalSchema,
	specialOrderRemovalSchema,
	specialOrderRequestSchema,
} from "./special-order";
import { saveDraftNewSalesFormSchema } from "./new-sales-form";

const png = `data:image/png;base64,${Buffer.from(
	Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10]),
).toString("base64")}`;

describe("Special Order public command validation", () => {
	it("requires acknowledgment, printed name, and PNG signature to approve", () => {
		const invalid = specialOrderApprovalResponseSchema.safeParse({
			token: "x".repeat(40),
			decision: "APPROVE",
			acknowledged: false,
			printedName: "",
			signatureDataUrl: "data:image/jpeg;base64,abc",
		});
		expect(invalid.success).toBe(false);
		if (!invalid.success) {
			expect(invalid.error.issues.map((issue) => issue.path[0])).toEqual([
				"acknowledged",
				"printedName",
				"signatureDataUrl",
			]);
		}
		expect(
			specialOrderApprovalResponseSchema.safeParse({
				token: "x".repeat(40),
				decision: "APPROVE",
				acknowledged: true,
				printedName: "Customer Signer",
				signatureDataUrl: png,
			}).success,
		).toBe(true);
	});

	it("keeps decline and reapproval reasons required while removal is optional", () => {
		expect(
			specialOrderApprovalResponseSchema.safeParse({
				token: "x".repeat(40),
				decision: "DECLINE",
				declineReason: "",
			}).success,
		).toBe(false);
		expect(
			specialOrderApprovalResponseSchema.safeParse({
				token: "x".repeat(40),
				decision: "DECLINE",
				declineReason: "Specifications need correction",
			}).success,
		).toBe(true);
		expect(
			specialOrderRemovalSchema.safeParse({ salesId: 1, reason: "no" }).success,
		).toBe(false);
		expect(
			specialOrderRemovalSchema.safeParse({
				salesId: 1,
				reason: "x".repeat(501),
			}).success,
		).toBe(false);
		expect(specialOrderRemovalSchema.parse({ salesId: 1 })).toEqual({
			salesId: 1,
		});
		expect(
			specialOrderRemovalSchema.parse({ salesId: 1, reason: "   " }),
		).toEqual({ salesId: 1, reason: null });
		expect(
			specialOrderReapprovalSchema.safeParse({
				salesId: 1,
				reason: "Pricing changed",
			}).success,
		).toBe(true);
	});

	it("normalizes an omitted or blank Sales Overview enrollment reason", () => {
		expect(specialOrderEnrollmentSchema.parse({ salesId: 1 })).toEqual({
			salesId: 1,
		});
		expect(
			specialOrderEnrollmentSchema.parse({ salesId: 1, reason: "   " }),
		).toEqual({ salesId: 1, reason: null });
		expect(
			specialOrderEnrollmentSchema.safeParse({ salesId: 1, reason: "no" })
				.success,
		).toBe(false);
	});

	it("does not accept an approval recipient override", () => {
		expect(
			specialOrderRequestSchema.parse({
				salesId: 1,
				email: "attacker@example.com",
			}),
		).toEqual({ salesId: 1 });
	});

	it("normalizes an omitted or blank Sales Form classification reason", () => {
		const reasonSchema =
			saveDraftNewSalesFormSchema.shape.specialOrderChangeReason;
		expect(reasonSchema.parse(undefined)).toBeUndefined();
		expect(reasonSchema.parse("   ")).toBeNull();
		expect(() => reasonSchema.parse("no")).toThrow();
		expect(() => reasonSchema.parse("x".repeat(501))).toThrow();
	});
});
