import { describe, expect, it } from "bun:test";
import {
	calculateLegacyPaymentDueDate,
	projectSalesFormMetaToLegacyMeta,
	readLegacySalesFormMeta,
} from "./legacy-metadata";

describe("legacy sales form metadata", () => {
	it("hydrates new form metadata from legacy root metadata and order columns", () => {
		const meta = readLegacySalesFormMeta({
			meta: {
				po: "PO-123",
				payment_option: "Credit Card",
			},
			persistedForm: {
				notes: "Keep me",
			},
			order: {
				createdAt: new Date("2026-02-01T00:00:00.000Z"),
				paymentDueDate: new Date("2026-02-05T00:00:00.000Z"),
				goodUntil: null,
				prodDueDate: new Date("2026-02-10T00:00:00.000Z"),
				paymentTerm: "None",
				deliveryOption: "pickup",
			},
		});

		expect(meta).toMatchObject({
			po: "PO-123",
			paymentMethod: "Credit Card",
			paymentTerm: "None",
			createdAt: "2026-02-01T00:00:00.000Z",
			paymentDueDate: "2026-02-05T00:00:00.000Z",
			prodDueDate: "2026-02-10T00:00:00.000Z",
			deliveryOption: "pickup",
			notes: "Keep me",
		});
	});

	it("treats legacy columns and root metadata as canonical when nested form data is stale", () => {
		const meta = readLegacySalesFormMeta({
			meta: {
				po: "PO-ROOT",
				payment_option: "Cash",
			},
			persistedForm: {
				po: "PO-NESTED",
				paymentMethod: "Credit Card",
				createdAt: "2026-01-01T00:00:00.000Z",
				paymentDueDate: "2026-01-02T00:00:00.000Z",
				prodDueDate: "2026-01-03T00:00:00.000Z",
			},
			order: {
				createdAt: new Date("2026-02-01T00:00:00.000Z"),
				paymentDueDate: new Date("2026-02-05T00:00:00.000Z"),
				prodDueDate: new Date("2026-02-10T00:00:00.000Z"),
				paymentTerm: "None",
			},
		});

		expect(meta).toMatchObject({
			po: "PO-ROOT",
			paymentMethod: "Cash",
			createdAt: "2026-02-01T00:00:00.000Z",
			paymentDueDate: "2026-02-05T00:00:00.000Z",
			prodDueDate: "2026-02-10T00:00:00.000Z",
		});
	});

	it("projects new form summary and meta to legacy root metadata", () => {
		const meta = projectSalesFormMetaToLegacyMeta({
			existingMeta: {
				qb: "QB-1",
				paymentMethodReviewDismissed: true,
			},
			form: {
				po: "PO-456",
				paymentMethod: "Check",
			},
			summary: {
				ccc: 3.5,
				discount: 10,
				delivery: 25,
				labor: 40,
			},
			cccPercentage: 3.5,
		});

		expect(meta).toMatchObject({
			po: "PO-456",
			qb: "QB-1",
			payment_option: "Check",
			paymentMethodReviewDismissed: true,
			ccc_percentage: 3.5,
			discount: 10,
			deliveryCost: 25,
			labor_cost: 40,
		});
		expect(meta).not.toHaveProperty("ccc");
	});

	it("migrates legacy sales_percentage to salesCoefficient without re-saving the old key", () => {
		const meta = projectSalesFormMetaToLegacyMeta({
			existingMeta: {
				sales_percentage: 0.72,
			},
			form: {
				po: "PO-789",
			},
		});

		expect(meta).toMatchObject({
			salesCoefficient: 0.72,
			po: "PO-789",
		});
		expect(meta).not.toHaveProperty("sales_percentage");
	});

	it("matches the legacy net-term payment due date calculation", () => {
		expect(
			calculateLegacyPaymentDueDate("Net 30", "2026-02-01T00:00:00.000Z"),
		).toBe("2026-03-03T00:00:00.000Z");
		expect(calculateLegacyPaymentDueDate("None", "2026-02-01")).toBeNull();
	});
});
